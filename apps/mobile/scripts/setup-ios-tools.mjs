#!/usr/bin/env node
/**
 * Print iOS dev environment status and next steps.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const gemBin = path.join(os.homedir(), '.gem', 'ruby', '2.6.0', 'bin');
const env = { ...process.env, PATH: `${gemBin}:${process.env.PATH ?? ''}` };

function status(label, ok, detail) {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const podWhich = spawnSync('sh', ['-lc', 'command -v pod'], { env, encoding: 'utf8' });
const podPath = podWhich.stdout.trim();
let podVer = '';
if (podPath) {
  podVer = spawnSync(podPath, ['--version'], { env, encoding: 'utf8' }).stdout.trim();
}

const rubyVer = spawnSync('ruby', ['--version'], { encoding: 'utf8' }).stdout.trim();
const xcode = fs.existsSync('/Applications/Xcode.app/Contents/Developer');

console.log('\niOS development environment\n');
status('Ruby', true, rubyVer);
status('CocoaPods', Boolean(podPath), podPath ? `v${podVer}` : 'not found');
status('Xcode.app', xcode, xcode ? 'installed' : 'missing — App Store required for pnpm ios');

console.log('\nWhy pnpm ios failed');
console.log('  Expo tried to auto-install CocoaPods, but:');
console.log('  • gem install failed (system Ruby has no write permission)');
console.log('  • brew install failed (Homebrew is outdated on this macOS version)');

console.log('\nTo build locally');
console.log('  1. Install Xcode from the Mac App Store');
console.log('  2. Install Ruby 3 (system Ruby 2.6 is too old for modern CocoaPods)');
console.log('     - Option A: fix Homebrew, then: brew install ruby cocoapods');
console.log('     - Option B: https://www.ruby-lang.org/en/downloads/');
console.log('  3. sudo xcode-select -s /Applications/Xcode.app/Contents/Developer');
console.log('  4. cd apps/mobile && pnpm ios');

console.log('\nTo build without local Xcode (recommended for now)');
console.log('  cd apps/mobile');
console.log('  npx eas-cli build --profile development-simulator --platform ios');
console.log('  Drag the downloaded .app onto the iOS Simulator, then pnpm start\n');
