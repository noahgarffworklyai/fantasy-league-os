import type { SleeperPlayerProfile } from './sleeper-player-profile';

const BASE = 'https://api.sleeper.app/v1';

export type SleeperPlayerRecord = {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  team?: string | null;
  status?: string;
  injury_status?: string | null;
  injury_body_part?: string | null;
  injury_start_date?: string | null;
  injury_notes?: string | null;
  practice_participation?: string | null;
  practice_description?: string | null;
  search_full_name?: string;
  search_last_name?: string;
  fantasy_positions?: string[];
  active?: boolean;
};

let playersCache: Map<string, SleeperPlayerRecord> | null = null;
let playersCacheAt = 0;
const CACHE_TTL_MS = 12 * 60 * 60_000;

function playerName(player: SleeperPlayerRecord): string {
  return (
    player.full_name?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(' ').trim() ||
    `Player ${player.player_id}`
  );
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lastToken(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return parts[parts.length - 1]?.toLowerCase() ?? '';
}

function firstInitial(name: string): string {
  const first = name.split(' ').filter(Boolean)[0] ?? '';
  return first[0]?.toLowerCase() ?? '';
}

function namesMatch(candidate: string, query: string): boolean {
  const c = normalizeName(candidate);
  const q = normalizeName(query);
  if (c === q) return true;

  const cLast = lastToken(c);
  const qLast = lastToken(q);
  if (!cLast || cLast !== qLast) return false;

  const cFirst = c.split(' ')[0] ?? '';
  const qFirst = q.split(' ')[0] ?? '';
  if (cFirst.length === 1 || qFirst.length === 1) {
    return cFirst[0] === qFirst[0];
  }

  return cFirst.startsWith(qFirst) || qFirst.startsWith(cFirst);
}

function normalizePos(pos?: string): string | undefined {
  if (!pos) return undefined;
  const value = pos.toUpperCase();
  if (value === 'DST') return 'DEF';
  return value;
}

function isSearchable(player: SleeperPlayerRecord): boolean {
  if (!player.active) return false;
  const pos = player.position ?? player.fantasy_positions?.[0];
  if (!pos) return false;
  return ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'].includes(pos);
}

export function isSleeperPlayerId(id?: string | null): boolean {
  return !!id && /^\d+$/.test(id);
}

export async function loadSleeperPlayersCache(): Promise<Map<string, SleeperPlayerRecord>> {
  const now = Date.now();
  if (playersCache && now - playersCacheAt < CACHE_TTL_MS) {
    return playersCache;
  }

  const res = await fetch(`${BASE}/players/nfl`);
  if (!res.ok) throw new Error(`Sleeper players cache error: ${res.status}`);
  const raw = (await res.json()) as Record<string, SleeperPlayerRecord>;
  playersCache = new Map(Object.entries(raw));
  playersCacheAt = now;
  return playersCache;
}

export function mapRecordToProfile(player: SleeperPlayerRecord): SleeperPlayerProfile {
  return {
    player_id: player.player_id,
    first_name: player.first_name,
    last_name: player.last_name,
    full_name: player.full_name,
    position: player.position,
    team: player.team,
    status: player.status,
    injury_status: player.injury_status,
    injury_body_part: player.injury_body_part,
    injury_start_date: player.injury_start_date,
    injury_notes: player.injury_notes,
    practice_participation: player.practice_participation,
    practice_description: player.practice_description,
    active: player.active,
  };
}

export async function fetchSleeperPlayerFromCache(playerId: string): Promise<SleeperPlayerProfile | null> {
  const cache = await loadSleeperPlayersCache();
  const player = cache.get(playerId);
  return player ? mapRecordToProfile(player) : null;
}

export async function resolveSleeperPlayerIdFromCache(
  name: string,
  pos?: string,
  team?: string,
): Promise<string | null> {
  const cache = await loadSleeperPlayersCache();
  const normalizedPos = normalizePos(pos);
  const normalizedTeam = team?.toUpperCase();
  const defenseQuery = normalizedPos === 'DEF';

  const candidates: SleeperPlayerRecord[] = [];
  for (const player of cache.values()) {
    if (!isSearchable(player) && !defenseQuery) continue;

    const display = playerName(player);
    if (!namesMatch(display, name)) {
      if (defenseQuery) {
        const defenseName = `${player.team ?? ''}`.toUpperCase();
        const query = name.toUpperCase().replace(/\s+DEF$/, '').trim();
        if (!query || !defenseName.includes(query)) continue;
      } else {
        continue;
      }
    }

    if (normalizedPos) {
      const playerPos = normalizePos(player.position ?? player.fantasy_positions?.[0]);
      if (playerPos !== normalizedPos) continue;
    }

    if (normalizedTeam && (player.team ?? 'FA').toUpperCase() !== normalizedTeam) continue;
    candidates.push(player);
  }

  if (candidates.length === 1) return candidates[0].player_id;
  if (candidates.length > 1) {
    const exact = candidates.find((player) => normalizeName(playerName(player)) === normalizeName(name));
    return (exact ?? candidates[0]).player_id;
  }

  const lastNameMatches = [...cache.values()].filter((player) => {
    if (!isSearchable(player)) return false;
    if (lastToken(playerName(player)) !== lastToken(name)) return false;
    if (normalizedPos && normalizePos(player.position) !== normalizedPos) return false;
    if (normalizedTeam && (player.team ?? 'FA').toUpperCase() !== normalizedTeam) return false;
    return firstInitial(playerName(player)) === firstInitial(name);
  });

  return lastNameMatches[0]?.player_id ?? null;
}
