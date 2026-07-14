import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const stripeBinary = path.join(root, '.tools', 'stripe', 'stripe');

export function ensureStripeCli() {
  if (existsSync(stripeBinary)) return stripeBinary;

  console.log('Stripe CLI not found — downloading into .tools/stripe/ (no Homebrew)…\n');
  const install = spawnSync(process.execPath, [path.join(root, 'scripts', 'install-stripe-cli.mjs')], {
    stdio: 'inherit',
  });
  if (install.status !== 0) process.exit(install.status ?? 1);
  if (!existsSync(stripeBinary)) {
    console.error('Stripe CLI install failed.');
    process.exit(1);
  }
  return stripeBinary;
}
