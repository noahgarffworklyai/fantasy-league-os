#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { ensureStripeCli } from './stripe-utils.mjs';

const stripe = ensureStripeCli();
const forwardTo = process.env.STRIPE_FORWARD_TO ?? 'http://localhost:3000/webhooks/stripe';

console.log(`Forwarding Stripe webhooks → ${forwardTo}`);
console.log('On first run: copy whsec_... into apps/api/.env (STRIPE_WEBHOOK_SECRET), then restart the API.');
console.log('Not logged in yet? Cancel (Ctrl+C), run pnpm stripe:login, then try again.\n');

const result = spawnSync(stripe, ['listen', '--forward-to', forwardTo], { stdio: 'inherit' });
process.exit(result.status ?? 1);
