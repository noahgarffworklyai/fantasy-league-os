import type { LeagueSummary, Provider } from '@flos/shared';
import { api } from './api';

export async function fetchSleeperLeagues(username: string, season?: number): Promise<LeagueSummary[]> {
  const params = new URLSearchParams({ username: username.trim().replace(/^@/, '') });
  if (season) params.set('season', String(season));
  const res = await api.get<{ leagues: LeagueSummary[] }>(`/imports/sleeper/leagues?${params}`);
  return res.leagues;
}

export async function fetchSleeperLeagueById(leagueId: string): Promise<LeagueSummary> {
  const res = await api.get<{ league: LeagueSummary }>(
    `/imports/sleeper/league/${encodeURIComponent(leagueId.trim())}`,
  );
  return res.league;
}

export async function startEspnLinkSession(): Promise<{ code: string; connectUrl: string }> {
  return api.post('/imports/espn/link-session', {});
}

export async function fetchEspnLinkSession(code: string): Promise<{
  ready: boolean;
  error?: string;
  espnS2?: string;
  swid?: string;
  leagues: LeagueSummary[];
}> {
  return api.get(`/imports/espn/link-session/${encodeURIComponent(code)}`);
}

export async function fetchEspnLeagueById(
  leagueId: string,
  session?: { espnS2?: string; swid?: string },
): Promise<LeagueSummary> {
  const params = new URLSearchParams();
  if (session?.espnS2?.trim()) params.set('espnS2', session.espnS2.trim());
  if (session?.swid?.trim()) params.set('swid', session.swid.trim());
  const qs = params.toString();
  const res = await api.get<{ league: LeagueSummary }>(
    `/imports/espn/league/${encodeURIComponent(leagueId.trim())}${qs ? `?${qs}` : ''}`,
  );
  return res.league;
}

export async function fetchEspnLeagues(input: {
  espnS2: string;
  swid: string;
  season?: number;
}): Promise<LeagueSummary[]> {
  const res = await api.post<{ leagues: LeagueSummary[] }>('/imports/espn/leagues', {
    espnS2: input.espnS2.trim(),
    swid: input.swid.trim(),
    season: input.season ?? new Date().getFullYear(),
  });
  return res.leagues;
}

export async function validateEspnLeague(input: {
  leagueId: string;
  espnS2: string;
  swid: string;
  season?: number;
}): Promise<LeagueSummary[]> {
  const res = await api.post<{ valid: boolean; leagues: LeagueSummary[] }>('/imports/espn/validate', {
    leagueId: input.leagueId.trim(),
    espnS2: input.espnS2.trim(),
    swid: input.swid.trim(),
    season: input.season ?? new Date().getFullYear(),
  });
  return res.leagues;
}

export async function saveProviderCredentials(
  provider: Provider,
  payload: Record<string, unknown>,
): Promise<void> {
  await api.post('/imports/credentials', { provider, payload });
}
