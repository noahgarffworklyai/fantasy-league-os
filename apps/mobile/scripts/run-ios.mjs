#!/usr/bin/env node
/**
 * Run `expo run:ios` when local iOS tooling is ready.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(mobileRoot, '../..');

function gemBin() {
  return path.join(os.homedir(), '.gem', 'ruby', '2.6.0', 'bin');
}

function withPath(extra) {
  const current = process.env.PATH ?? '';
  const parts = [...extra.filter(Boolean), ...current.split(path.delimiter)];
  return [...new Set(parts)].join(path.delimiter);
}

function findPod(env) {
  const which = spawnSync('sh', ['-lc', 'command -v pod'], { env, encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  return null;
}

function podVersion(env) {
  const pod = findPod(env);
  if (!pod) return null;
  const out = spawnSync(pod, ['--version'], { env, encoding: 'utf8' });
  if (out.status !== 0) return null;
  return out.stdout.trim();
}

function parseVersion(v) {
  return v.split('.').map((n) => Number.parseInt(n, 10));
}

function versionAtLeast(current, min) {
  const a = parseVersion(current);
  const b = parseVersion(min);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return true;
}

function hasFullXcode() {
  return fs.existsSync('/Applications/Xcode.app/Contents/Developer');
}

function printBlockers({ podVersion: version, xcode }) {
  console.error('\nCannot run a local iOS development build yet:\n');

  if (!version) {
    console.error('• CocoaPods is not installed or not on your PATH.');
    console.error('  You need CocoaPods 1.13+ (requires Ruby 3+).');
    console.error('  After installing Ruby 3: gem install cocoapods');
    console.error('  See: https://guides.cocoapods.org/using/getting-started.html');
  } else if (!versionAtLeast(version, '1.13.0')) {
    console.error(`• CocoaPods ${version} is too old for Expo SDK 54 (need 1.13+).`);
    console.error('  macOS ships Ruby 2.6, which cannot install modern CocoaPods.');
    console.error('  Install Ruby 3, then run: gem install cocoapods');
  }

  if (!xcode) {
    console.error('• Full Xcode is not installed (only Command Line Tools were found).');
    console.error('  Install Xcode from the Mac App Store, then run:');
    console.error('    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer');
    console.error('    sudo xcodebuild -license accept');
  }

  console.error('\nFastest path without fixing Ruby/Xcode locally:');
  console.error('  cd apps/mobile');
  console.error('  npx eas-cli build --profile development-simulator --platform ios');
  console.error('  (Install the .app on the iOS Simulator — includes ESPN WebView support.)\n');
}

const env = {
  ...process.env,
  PATH: withPath([gemBin()]),
};

const version = podVersion(env);
const xcode = hasFullXcode();

if (!version || !versionAtLeast(version, '1.13.0') || !xcode) {
  printBlockers({ podVersion: version, xcode });
  process.exit(1);
}

console.log(`Using CocoaPods ${version}`);

const expoBin = path.join(repoRoot, 'node_modules', '.bin', 'expo');
const args = ['run:ios', ...process.argv.slice(2)];
const result = spawnSync(expoBin, args, {
  env,
  cwd: mobileRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
