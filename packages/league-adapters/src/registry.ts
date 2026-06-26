import { espnAdapter } from './espn.js';
import { sleeperAdapter } from './sleeper.js';
import type { AdapterRegistry } from './types.js';
import { yahooAdapter } from './yahoo.js';

export const adapterRegistry: AdapterRegistry = {
  sleeper: sleeperAdapter,
  yahoo: yahooAdapter,
  espn: espnAdapter,
};

export function getAdapter<P extends keyof AdapterRegistry>(
  provider: P,
): AdapterRegistry[P] {
  return adapterRegistry[provider];
}
