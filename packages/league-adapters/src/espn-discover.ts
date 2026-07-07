import type { LeagueSummary } from '@flos/shared';
import type { EspnCredentials } from './types.js';
import { buildEspnHeaders, espnFetchLeagueAcrossSeasons, recentEspnSeasons, resolveEspnSeason } from './espn-api.js';

function extractLeagueIdsFromUnknown(value: unknown, ids = new Set<string>()) {
  if (value == null) return ids;
  if (typeof value === 'string') {
    for (const match of value.matchAll(/leagueId[=:"'](\d+)/g)) {
      ids.add(match[1]!);
    }
    return ids;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractLeagueIdsFromUnknown(item, ids);
    return ids;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'number' && typeof record.seasonId === 'number' && record.settings) {
      ids.add(String(record.id));
    }
    if (typeof record.leagueId === 'number' || typeof record.leagueId === 'string') {
      ids.add(String(record.leagueId));
    }
    for (const nested of Object.values(record)) {
      extractLeagueIdsFromUnknown(nested, ids);
    }
  }
  return ids;
}


async function scrapeLeagueIdsFromLobby(credentials: Pick<EspnCredentials, 'espnS2' | 'swid'>) {
  const ids = new Set<string>();
  const urls = [
    'https://fantasy.espn.com/football',
    'https://fantasy.espn.com/football/league',
    'https://fantasy.espn.com/football/history',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: buildEspnHeaders(credentials) });
      if (!res.ok) continue;
      const html = await res.text();
      for (const match of html.matchAll(/leagueId[=:"'](\d{4,})/g)) {
        ids.add(match[1]!);
      }
    } catch {
      // try next url
    }
  }

  return ids;
}

async function fetchModularLeagueIds(
  credentials: Pick<EspnCredentials, 'espnS2' | 'swid'>,
  season: number,
) {
  const ids = new Set<string>();
  const url = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}?view=modular&platformVersion=espn.ffl.web.production`;
  try {
    const res = await fetch(url, { headers: buildEspnHeaders(credentials) });
    if (!res.ok) return ids;
    const data = await res.json();
    extractLeagueIdsFromUnknown(data, ids);
  } catch {
    // modular view may not be available for all accounts
  }
  return ids;
}

async function previewLeagueForSeason(
  leagueId: string,
  creds: EspnCredentials,
  season: number,
): Promise<LeagueSummary | null> {
  try {
    const data = await espnFetchLeagueAcrossSeasons(leagueId, creds, {
      seasons: [season, season - 1, season - 2, season - 3],
      views: ['mSettings', 'mTeam'],
    });
    return {
      externalId: leagueId,
      provider: 'espn',
      name: data.settings?.name ?? `ESPN League ${leagueId}`,
      season: resolveEspnSeason(data.settings, season),
      teamCount: data.teams?.length,
    };
  } catch {
    return null;
  }
}

/** Discover NFL fantasy leagues for an authenticated ESPN session (includes recent past seasons). */
export async function discoverEspnLeagues(
  credentials: Pick<EspnCredentials, 'espnS2' | 'swid'>,
  season?: number,
): Promise<LeagueSummary[]> {
  const creds: EspnCredentials = { espnS2: credentials.espnS2, swid: credentials.swid };
  const seasons = season != null ? [season] : recentEspnSeasons(4);

  const leagueIds = new Set<string>();
  const scraped = await scrapeLeagueIdsFromLobby(creds);
  for (const id of scraped) leagueIds.add(id);

  for (const s of seasons) {
    const modular = await fetchModularLeagueIds(creds, s);
    for (const id of modular) leagueIds.add(id);
  }

  if (leagueIds.size === 0) {
    throw new Error(
      'No ESPN leagues found. Past-season leagues still work — open fantasy.espn.com/football and try again.',
    );
  }

  const byId = new Map<string, LeagueSummary>();
  for (const leagueId of leagueIds) {
    for (const s of seasons) {
      const league = await previewLeagueForSeason(leagueId, { ...creds, leagueId }, s);
      if (!league) continue;
      const existing = byId.get(leagueId);
      if (!existing || league.season > existing.season) {
        byId.set(leagueId, league);
      }
      break;
    }
  }

  const leagues = [...byId.values()];
  if (leagues.length === 0) {
    throw new Error('Could not access any ESPN leagues with this account. Try logging in again.');
  }

  return leagues.sort((a, b) => b.season - a.season || a.name.localeCompare(b.name));
}
