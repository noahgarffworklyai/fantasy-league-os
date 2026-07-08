import { sleeperPlayerImageUrl } from '@flos/shared';

const BASE = 'https://api.sleeper.app/v1';

export type SleeperPlayerRecord = {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  team?: string | null;
  status?: string;
  injury_status?: string;
  fantasy_positions?: string[];
  search_full_name?: string;
  search_last_name?: string;
  number?: number;
  age?: number;
  years_exp?: number;
  active?: boolean;
};

export type PlayerSearchRow = {
  id: string;
  name: string;
  position: string;
  team: string;
  status?: string;
  injuryStatus?: string | null;
  ownership: number;
  available: number;
  added?: number;
  dropped?: number;
  trend: number;
  owned: boolean;
  imageUrl: string;
};

type TrendingRow = { player_id: string; count: number };

let playersCache: Map<string, SleeperPlayerRecord> | null = null;
let playersCacheAt = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

function playerName(p: SleeperPlayerRecord) {
  return p.full_name?.trim() || [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || `Player ${p.player_id}`;
}

function isSearchable(p: SleeperPlayerRecord) {
  if (p.active === false) return false;
  if (!p.position) return false;
  if (p.position === 'OL' || p.position === 'LS') return false;
  const status = p.status?.toLowerCase();
  if (status === 'inactive' || status === 'retired') return false;
  return true;
}

function isPoolPlayer(p: SleeperPlayerRecord) {
  const name = playerName(p);
  if (!name || name.startsWith('Player ')) return false;
  if (p.status?.toLowerCase() === 'retired') return false;
  return true;
}

function matchesPoolPosition(player: SleeperPlayerRecord, position?: string) {
  if (!position || position === 'All') return true;
  if (position === 'DEF') {
    return (
      player.position === 'DEF' ||
      player.position === 'DST' ||
      player.fantasy_positions?.some((pos) => pos === 'DEF' || pos === 'DST') === true
    );
  }
  return player.position === position || player.fantasy_positions?.includes(position) === true;
}

export async function loadSleeperPlayersCache(): Promise<Map<string, SleeperPlayerRecord>> {
  const now = Date.now();
  if (playersCache && now - playersCacheAt < CACHE_TTL_MS) {
    return playersCache;
  }

  const raw = await sleeperFetch<Record<string, SleeperPlayerRecord>>('/players/nfl');
  playersCache = new Map(Object.entries(raw));
  playersCacheAt = now;
  return playersCache;
}

export async function getSleeperPlayer(playerId: string): Promise<SleeperPlayerRecord | null> {
  const cache = await loadSleeperPlayersCache();
  const cached = cache.get(playerId);
  if (cached) return cached;

  try {
    const player = await sleeperFetch<SleeperPlayerRecord>(`/player/${playerId}`);
    cache.set(playerId, player);
    return player;
  } catch {
    return null;
  }
}

export async function searchSleeperPlayers(input: {
  query?: string;
  position?: string;
  limit?: number;
  mode?: 'searchable' | 'pool';
}): Promise<SleeperPlayerRecord[]> {
  const cache = await loadSleeperPlayersCache();
  const q = input.query?.trim().toLowerCase() ?? '';
  const mode = input.mode ?? 'searchable';
  const include = mode === 'pool' ? isPoolPlayer : isSearchable;
  const limit = input.limit ?? (mode === 'pool' ? Number.POSITIVE_INFINITY : 50);

  const results: SleeperPlayerRecord[] = [];
  for (const player of cache.values()) {
    if (!include(player)) continue;
    if (!matchesPoolPosition(player, input.position)) continue;
    if (q) {
      const haystack = [
        player.search_full_name,
        player.search_last_name,
        player.full_name,
        player.first_name,
        player.last_name,
        player.team,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) continue;
    }
    results.push(player);
    if (results.length >= limit) break;
  }

  return results.sort((a, b) => playerName(a).localeCompare(playerName(b)));
}

export async function fetchSleeperTrending(type: 'add' | 'drop', limit = 25): Promise<TrendingRow[]> {
  const rows = await sleeperFetch<Array<{ player_id: string | number; count: number }>>(
    `/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`,
  );
  return rows.map((row) => ({
    player_id: String(row.player_id),
    count: row.count ?? 0,
  }));
}

export async function fetchLeagueOwnedPlayerIds(externalLeagueId: string): Promise<{
  ownedIds: Set<string>;
  teamCount: number;
}> {
  const rosters = await sleeperFetch<Array<{ players?: string[] }>>(`/league/${externalLeagueId}/rosters`);
  const ownedIds = new Set<string>();
  for (const roster of rosters ?? []) {
    for (const playerId of roster.players ?? []) {
      ownedIds.add(String(playerId));
    }
  }
  return { ownedIds, teamCount: rosters?.length ?? 0 };
}

function mapHealth(injuryStatus?: string | null, status?: string): PlayerSearchRow['injuryStatus'] {
  const injury = injuryStatus?.toLowerCase() ?? '';
  if (injury.includes('out') || injury === 'o') return 'out';
  if (injury.includes('doubt')) return 'doubtful';
  if (injury.includes('question') || injury === 'q') return 'questionable';
  if (injury.includes('ir')) return 'ir';
  if (status?.toLowerCase() === 'inactive') return 'out';
  return injuryStatus ?? null;
}

export function toPlayerSearchRow(
  player: SleeperPlayerRecord,
  context: {
    ownedIds: Set<string>;
    teamCount: number;
    addedById: Map<string, number>;
    droppedById: Map<string, number>;
  },
): PlayerSearchRow {
  const owned = context.ownedIds.has(player.player_id);
  const ownership = owned ? 100 : 0;
  const available = owned ? 0 : 100;
  const added = context.addedById.get(player.player_id);
  const dropped = context.droppedById.get(player.player_id);

  return {
    id: player.player_id,
    name: playerName(player),
    position: player.position ?? 'FLEX',
    team: player.team ?? 'FA',
    status: player.status,
    injuryStatus: mapHealth(player.injury_status, player.status),
    ownership,
    available,
    added,
    dropped,
    trend: added ? Math.min(10, added / 1000) : dropped ? -Math.min(10, dropped / 1000) : 0,
    owned,
    imageUrl: sleeperPlayerImageUrl(player.player_id),
  };
}

export async function buildLeaguePlayerSearch(input: {
  externalLeagueId?: string;
  query?: string;
  position?: string;
  tab?: 'all' | 'available' | 'injured' | 'trending' | 'pool';
  limit?: number;
}): Promise<PlayerSearchRow[]> {
  const [added, dropped, ownedContext] = await Promise.all([
    fetchSleeperTrending('add', 50),
    fetchSleeperTrending('drop', 50),
    input.externalLeagueId
      ? fetchLeagueOwnedPlayerIds(input.externalLeagueId)
      : Promise.resolve({ ownedIds: new Set<string>(), teamCount: 12 }),
  ]);

  const addedById = new Map(added.map((row) => [row.player_id, row.count]));
  const droppedById = new Map(dropped.map((row) => [row.player_id, row.count]));
  const context = { ownedIds: ownedContext.ownedIds, teamCount: ownedContext.teamCount, addedById, droppedById };
  const cache = await loadSleeperPlayersCache();

  const enrichIds = (ids: string[]) =>
    ids
      .map((id) => cache.get(id))
      .filter((p): p is SleeperPlayerRecord => !!p && isSearchable(p))
      .map((p) => toPlayerSearchRow(p, context));

  if (input.query?.trim()) {
    const found = await searchSleeperPlayers({
      query: input.query,
      position: input.position,
      limit: input.limit,
      mode: input.tab === 'pool' ? 'pool' : 'searchable',
    });
    return found.map((p) => toPlayerSearchRow(p, context));
  }

  const tab = input.tab ?? 'all';

  if (tab === 'pool') {
    const results: SleeperPlayerRecord[] = [];
    for (const player of cache.values()) {
      if (!isPoolPlayer(player)) continue;
      if (!matchesPoolPosition(player, input.position)) continue;
      results.push(player);
    }
    return results
      .sort((a, b) => playerName(a).localeCompare(playerName(b)))
      .map((p) => toPlayerSearchRow(p, context));
  }

  if (tab === 'trending' || tab === 'all') {
    return enrichIds(added.slice(0, input.limit ?? 25).map((r) => r.player_id));
  }

  if (tab === 'available') {
    return enrichIds(added.map((r) => r.player_id))
      .filter((p) => !p.owned)
      .slice(0, input.limit ?? 25);
  }

  if (tab === 'injured') {
    const injured: SleeperPlayerRecord[] = [];
    for (const player of cache.values()) {
      if (!isSearchable(player)) continue;
      if (!player.injury_status && player.status?.toLowerCase() !== 'inactive') continue;
      if (input.position && input.position !== 'All' && player.position !== input.position) continue;
      injured.push(player);
      if (injured.length >= (input.limit ?? 40)) break;
    }
    return injured.map((p) => toPlayerSearchRow(p, context));
  }

  return enrichIds(added.slice(0, input.limit ?? 25).map((r) => r.player_id));
}
