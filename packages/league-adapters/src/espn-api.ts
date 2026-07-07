import type { EspnCredentials } from './types.js';

export const ESPN_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl';
export const ESPN_WEB_BASE = 'https://fantasy.espn.com/apis/v3/games/ffl';

/** ESPN `defaultPositionId` → label */
export const ESPN_POSITION_MAP: Record<number, string> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'DEF',
};

/** ESPN `lineupSlotId` → roster slot label */
export const ESPN_LINEUP_SLOT_MAP: Record<number, string> = {
  0: 'QB',
  2: 'RB',
  4: 'WR',
  6: 'TE',
  16: 'DEF',
  17: 'FLEX',
  20: 'BN',
  21: 'IR',
  23: 'FLEX',
  24: 'K',
  25: 'DEF',
};

export const ESPN_STARTER_SLOT_IDS = new Set([0, 2, 4, 6, 16, 17, 23, 24, 25]);

/** ESPN `proTeamId` → NFL abbrev */
export const ESPN_PRO_TEAM_MAP: Record<number, string> = {
  0: 'FA',
  1: 'ATL',
  2: 'BUF',
  3: 'CHI',
  4: 'CIN',
  5: 'CLE',
  6: 'DAL',
  7: 'DEN',
  8: 'DET',
  9: 'GB',
  10: 'TEN',
  11: 'IND',
  12: 'KC',
  13: 'LV',
  14: 'LAR',
  15: 'MIA',
  16: 'MIN',
  17: 'NE',
  18: 'NO',
  19: 'NYG',
  20: 'NYJ',
  21: 'PHI',
  22: 'ARI',
  23: 'PIT',
  24: 'LAC',
  25: 'SF',
  26: 'SEA',
  27: 'TB',
  28: 'WSH',
  29: 'CAR',
  30: 'JAX',
  33: 'BAL',
  34: 'HOU',
};

export type EspnSettings = {
  name?: string;
  seasonId?: number;
  scoringPeriodId?: number;
  status?: { currentMatchupPeriod?: number; currentScoringPeriod?: number };
  rosterSettings?: { lineupSlotCounts?: Array<{ id: number; count: number }> };
};

export type EspnMember = {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
};

export type EspnPlayer = {
  id: number;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  injuryStatus?: string;
  active?: boolean;
};

export type EspnRosterEntry = {
  playerId: number;
  lineupSlotId: number;
  playerPoolEntry?: {
    appliedStatTotal?: number;
    player?: EspnPlayer;
  };
};

export type EspnTeam = {
  id: number;
  /** Full custom team name (ESPN's newer single-field format). */
  name?: string;
  abbrev?: string;
  location?: string;
  nickname?: string;
  primaryOwner?: string;
  owners?: string[];
  record?: {
    overall?: { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number };
  };
  roster?: { entries?: EspnRosterEntry[] };
};

export type EspnScheduleSide = {
  teamId: number;
  totalPoints?: number;
  rosterForCurrentScoringPeriod?: { entries?: EspnRosterEntry[]; appliedStatTotal?: number };
};

export type EspnMatchup = {
  id: number;
  matchupPeriodId?: number;
  home?: EspnScheduleSide;
  away?: EspnScheduleSide;
};

export type EspnLeaguePayload = {
  settings?: EspnSettings;
  teams?: EspnTeam[];
  schedule?: EspnMatchup[];
  members?: EspnMember[];
};

export function buildEspnHeaders(credentials?: Pick<EspnCredentials, 'espnS2' | 'swid'>): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const espnS2 = credentials?.espnS2?.trim();
  const swid = credentials?.swid?.trim();
  if (espnS2 && swid) {
    const normalized = swid.startsWith('{') ? swid : `{${swid}}`;
    headers.Cookie = `espn_s2=${espnS2}; SWID=${normalized}`;
  }
  return headers;
}

export function normalizeSwid(swid: string) {
  const trimmed = swid.trim();
  if (trimmed.startsWith('{')) return trimmed;
  return `{${trimmed}}`;
}

export function resolveEspnSeason(settings?: EspnSettings, fallback = new Date().getFullYear()) {
  return settings?.seasonId ?? fallback;
}

export function resolveEspnCurrentWeek(settings?: EspnSettings) {
  return (
    settings?.status?.currentMatchupPeriod ??
    settings?.status?.currentScoringPeriod ??
    settings?.scoringPeriodId ??
    1
  );
}

export function espnTeamName(team: EspnTeam) {
  const abbrev = team.abbrev?.trim() ?? '';
  const legacyName = [team.location, team.nickname]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  const singleName = team.name?.trim() ?? '';

  const isAbbrevOnly = (value: string) =>
    !value ||
    (abbrev && value.toLowerCase() === abbrev.toLowerCase()) ||
    (value.length <= 4 && value === value.toUpperCase());

  const candidates = [legacyName, singleName].filter((value) => value && !isAbbrevOnly(value));
  if (candidates.length > 0) {
    return candidates.sort((a, b) => b.length - a.length)[0]!;
  }

  if (legacyName) return legacyName;
  if (singleName) return singleName;
  return abbrev || `Team ${team.id}`;
}

function scoreTeamNameRichness(team: EspnTeam): number {
  const abbrev = team.abbrev?.trim() ?? '';
  const legacy = [team.location, team.nickname]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  const single = team.name?.trim() ?? '';
  const isAbbrev = (value: string) =>
    !!abbrev && value.toLowerCase() === abbrev.toLowerCase();

  let score = 0;
  if (legacy && !isAbbrev(legacy)) score = Math.max(score, legacy.length + 100);
  if (single && !isAbbrev(single)) score = Math.max(score, single.length + 50);
  return score;
}

/** Merge team rows from multiple ESPN endpoints, keeping the richest name fields. */
export function mergeEspnTeamRows(...rows: EspnTeam[]): EspnTeam {
  if (rows.length === 0) throw new Error('mergeEspnTeamRows requires at least one team');
  const id = rows[0]!.id;
  let best = rows[0]!;
  let bestScore = scoreTeamNameRichness(best);
  for (const row of rows.slice(1)) {
    const score = scoreTeamNameRichness(row);
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }

  const merged: EspnTeam = { ...best, id };
  for (const row of rows) {
    merged.abbrev = merged.abbrev ?? row.abbrev;
    merged.primaryOwner = merged.primaryOwner ?? row.primaryOwner;
    merged.owners = merged.owners ?? row.owners;
    merged.record = merged.record ?? row.record;
    merged.roster = merged.roster ?? row.roster;
  }
  return merged;
}

export function enrichTeamsWithDirectory(
  teams: EspnTeam[],
  directory: Map<number, EspnTeam>,
): EspnTeam[] {
  if (directory.size === 0) return teams;
  if (teams.length === 0) return [...directory.values()];
  return teams.map((team) => {
    const detail = directory.get(team.id);
    return detail ? mergeEspnTeamRows(team, detail) : team;
  });
}

function parseEspnJsonResponse(text: string): EspnLeaguePayload {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<')) {
    throw new Error('ESPN session expired. Sign in again and reconnect your league.');
  }
  try {
    return JSON.parse(text) as EspnLeaguePayload;
  } catch {
    throw new Error('ESPN returned invalid data. Try reconnecting your league.');
  }
}

async function espnFetchJson(url: string, credentials: EspnCredentials): Promise<EspnLeaguePayload | null> {
  try {
    const res = await fetch(url, { headers: buildEspnHeaders(credentials) });
    if (!res.ok) return null;
    return parseEspnJsonResponse(await res.text());
  } catch (err) {
    if (err instanceof Error && err.message.includes('ESPN session expired')) throw err;
    return null;
  }
}

/** Load full team names from ESPN endpoints that still expose location/nickname/name. */
export async function espnFetchTeamDirectory(
  leagueId: string,
  credentials: EspnCredentials,
  season: number,
): Promise<Map<number, EspnTeam>> {
  const urls = [
    `${ESPN_WEB_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam`,
    `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam`,
    `${ESPN_BASE}/leagueHistory/${leagueId}?seasonId=${season}&view=mTeam`,
  ];

  const rowsById = new Map<number, EspnTeam[]>();
  for (const url of urls) {
    const data = await espnFetchJson(url, credentials);
    for (const team of data?.teams ?? []) {
      const list = rowsById.get(team.id) ?? [];
      list.push(team);
      rowsById.set(team.id, list);
    }
  }

  const directory = new Map<number, EspnTeam>();
  for (const [id, rows] of rowsById) {
    directory.set(id, mergeEspnTeamRows(...rows));
  }
  return directory;
}

export function espnPlayerName(player?: EspnPlayer, playerId?: number) {
  if (player?.fullName) {
    const parts = player.fullName.split(/\s+/);
    if (parts.length >= 2) return `${parts[0]![0]}. ${parts.slice(1).join(' ')}`;
    return player.fullName;
  }
  return `Player ${playerId ?? '?'}`;
}

export function espnPlayerPosition(player?: EspnPlayer) {
  if (!player?.defaultPositionId) return 'FLEX';
  return ESPN_POSITION_MAP[player.defaultPositionId] ?? 'FLEX';
}

export function espnPlayerTeam(player?: EspnPlayer) {
  if (!player?.proTeamId) return 'FA';
  return ESPN_PRO_TEAM_MAP[player.proTeamId] ?? 'FA';
}

export function espnLineupSlotLabel(lineupSlotId: number, player?: EspnPlayer) {
  return ESPN_LINEUP_SLOT_MAP[lineupSlotId] ?? espnPlayerPosition(player);
}

export function espnRosterPositions(settings?: EspnSettings): string[] {
  const counts = settings?.rosterSettings?.lineupSlotCounts ?? [];
  const slots: string[] = [];
  for (const slot of counts) {
    const label = ESPN_LINEUP_SLOT_MAP[slot.id];
    if (!label || label === 'BN' || label === 'IR') continue;
    for (let i = 0; i < (slot.count ?? 0); i += 1) {
      slots.push(label === 'DEF' ? 'DEF' : label);
    }
  }
  return slots.length
    ? slots
    : ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
}

export function mapEspnInjury(injuryStatus?: string): string | null {
  if (!injuryStatus || injuryStatus === 'ACTIVE') return null;
  return injuryStatus.toLowerCase();
}

export function recentEspnSeasons(count = 4, anchor = new Date().getFullYear()) {
  return Array.from({ length: count }, (_, index) => anchor - index);
}

export async function espnFetchLeagueAcrossSeasons(
  leagueId: string,
  credentials: EspnCredentials,
  options: {
    views?: string[];
    scoringPeriodId?: number;
    forTeamId?: number;
    seasons?: number[];
  } = {},
): Promise<EspnLeaguePayload> {
  const seasons = options.seasons ?? recentEspnSeasons(4);
  let lastError: Error | undefined;
  for (const season of seasons) {
    try {
      return await espnFetchLeague(leagueId, credentials, {
        season,
        views: options.views,
        scoringPeriodId: options.scoringPeriodId,
        forTeamId: options.forTeamId,
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`ESPN league ${leagueId} not found for recent seasons`);
}

export async function espnFetchLeague(
  leagueId: string,
  credentials: EspnCredentials,
  options: {
    season?: number;
    scoringPeriodId?: number;
    views?: string[];
    forTeamId?: number;
  } = {},
): Promise<EspnLeaguePayload> {
  const season = options.season ?? new Date().getFullYear();
  const params = new URLSearchParams();
  if (options.scoringPeriodId != null) {
    params.set('scoringPeriodId', String(options.scoringPeriodId));
  }
  if (options.forTeamId != null) {
    params.set('forTeamId', String(options.forTeamId));
  }
  for (const view of options.views ?? []) {
    params.append('view', view);
  }

  const qs = params.toString();
  const url = `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: buildEspnHeaders(credentials) });
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status}`);
  }
  return parseEspnJsonResponse(await res.text());
}

export function buildEspnMemberMap(members: EspnMember[] = []) {
  return new Map(members.map((m) => [m.id, m]));
}

export function enrichEspnTeams(teams: EspnTeam[], members: EspnMember[] = []) {
  const memberMap = buildEspnMemberMap(members);
  return teams.map((team) => {
    const ownerId = team.primaryOwner ?? team.owners?.[0];
    const member = ownerId ? memberMap.get(ownerId) : undefined;
    return {
      ...team,
      ownerDisplayName: member?.displayName ?? undefined,
    };
  });
}

export type EspnTeamWithOwner = EspnTeam & { ownerDisplayName?: string };
