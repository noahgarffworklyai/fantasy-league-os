import type {
  CanonicalLeague,
  CanonicalMatchup,
  LeagueSummary,
  Provider,
} from '@flos/shared';

export type SleeperCredentials = { username?: string; userId?: string };
export type YahooCredentials = { accessToken: string };
export type EspnCredentials = { espnS2: string; swid: string; leagueId?: string };

export type ProviderCredentials =
  | { provider: 'sleeper'; credentials: SleeperCredentials }
  | { provider: 'yahoo'; credentials: YahooCredentials }
  | { provider: 'espn'; credentials: EspnCredentials };

export interface LeagueAdapter<C = unknown> {
  provider: Provider;
  discoverLeagues(credentials: C, season?: number): Promise<LeagueSummary[]>;
  fetchLeague(externalLeagueId: string, credentials: C): Promise<CanonicalLeague>;
  fetchMatchups(
    externalLeagueId: string,
    week: number,
    credentials: C,
  ): Promise<CanonicalMatchup[]>;
}

export interface AdapterRegistry {
  sleeper: LeagueAdapter<SleeperCredentials>;
  yahoo: LeagueAdapter<YahooCredentials>;
  espn: LeagueAdapter<EspnCredentials>;
}

export * from './sleeper.js';
export * from './yahoo.js';
export * from './espn.js';
export * from './registry.js';
