#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { ensureStripeCli } from './stripe-utils.mjs';

const stripe = ensureStripeCli();
const result = spawnSync(stripe, ['login'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
