#!/usr/bin/env node
/**
 * Install Stripe CLI into .tools/stripe/ (no Homebrew required).
 * Usage: node scripts/install-stripe-cli.mjs
 */
import { createWriteStream, chmodSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolsDir = path.join(root, '.tools', 'stripe');
const binaryPath = path.join(toolsDir, 'stripe');

function platformAsset() {
  const os = process.platform;
  const arch = process.arch;
  if (os === 'darwin') {
    return arch === 'arm64' ? 'mac-os_arm64' : 'mac-os_x86_64';
  }
  if (os === 'linux') {
    return arch === 'arm64' ? 'linux_arm64' : 'linux_x86_64';
  }
  throw new Error(`Unsupported platform: ${os} ${arch}`);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function main() {
  const assetSuffix = platformAsset();
  const release = await fetchJson('https://api.github.com/repos/stripe/stripe-cli/releases/latest');
  const version = String(release.tag_name).replace(/^v/, '');
  const assetName = `stripe_${version}_${assetSuffix}.tar.gz`;
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(`Release asset not found: ${assetName}`);
  }

  mkdirSync(toolsDir, { recursive: true });
  const archivePath = path.join(toolsDir, assetName);

  console.log(`Downloading Stripe CLI ${version} (${assetSuffix})…`);
  await download(asset.browser_download_url, archivePath);

  execFileSync('tar', ['-xzf', archivePath, '-C', toolsDir, 'stripe'], { stdio: 'inherit' });
  rmSync(archivePath, { force: true });
  chmodSync(binaryPath, 0o755);

  console.log('');
  console.log(`Installed: ${binaryPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. pnpm stripe:login');
  console.log('  2. pnpm stripe:listen');
  console.log('  3. Copy whsec_... into apps/api/.env as STRIPE_WEBHOOK_SECRET');
  console.log('  4. Restart the API');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
