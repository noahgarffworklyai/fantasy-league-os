import { describe, expect, it } from 'vitest';
import { sleeperAdapter } from '../src/sleeper.js';

describe('sleeperAdapter', () => {
  it('discovers leagues for a known public user', async () => {
    const leagues = await sleeperAdapter.discoverLeagues({ username: 'sleeper' }, 2024);
    expect(Array.isArray(leagues)).toBe(true);
  }, 15000);
});
