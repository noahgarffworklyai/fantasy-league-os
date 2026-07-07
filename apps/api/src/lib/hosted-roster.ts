import {
  loadSleeperPlayersCache,
  type SleeperPlayerRecord,
} from '@flos/league-adapters';
import type { MyRosterResult, RosterPlayerRow } from '@flos/league-adapters';
import { sleeperPlayerImageUrl } from '@flos/shared';

export const DEFAULT_HOSTED_ROSTER_POSITIONS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLX', 'K', 'DEF'];

export const MAX_HOSTED_BENCH = 8;

export type HostedRosterData = {
  rosterPositions: string[];
  starters: string[];
  bench: string[];
  reserve: string[];
};

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function demoWeekPoints(userId: string, playerId: string, week = 1) {
  const seed = hashSeed(`${userId}:${playerId}:${week}`);
  return Math.round((4 + (seed % 28)) * 10) / 10;
}

function isAssignable(p: SleeperPlayerRecord) {
  if (p.active === false) return false;
  if (!p.position) return false;
  const status = p.status?.toLowerCase();
  if (status === 'inactive' || status === 'retired') return false;
  return true;
}

function matchesSlot(slot: string, position?: string) {
  if (!position) return false;
  if (slot === 'DEF') return position === 'DEF';
  if (slot === 'FLX') return ['RB', 'WR', 'TE'].includes(position);
  return position === slot;
}

function shortName(player: SleeperPlayerRecord | undefined, id: string) {
  if (!player) return `Player ${id.slice(-4)}`;
  if (player.first_name && player.last_name) {
    return `${player.first_name[0]}. ${player.last_name}`;
  }
  return player.full_name?.trim() || `Player ${id.slice(-4)}`;
}

function mapPosition(position?: string) {
  if (position === 'DST') return 'DEF';
  return position ?? 'FLEX';
}

function toRow(
  playerId: string,
  player: SleeperPlayerRecord | undefined,
  extras: { slot?: string; points?: number },
): RosterPlayerRow {
  return {
    id: playerId,
    name: shortName(player, playerId),
    position: mapPosition(player?.position),
    team: player?.team ?? 'FA',
    slot: extras.slot,
    injuryStatus: player?.injury_status ?? null,
    status: player?.status,
    imageUrl: sleeperPlayerImageUrl(playerId),
    points: extras.points,
  };
}

function pickPlayerId(
  cache: Map<string, SleeperPlayerRecord>,
  userId: string,
  slot: string,
  used: Set<string>,
  salt: number,
): string | null {
  const candidates = [...cache.values()]
    .filter((p) => isAssignable(p) && matchesSlot(slot, p.position) && !used.has(p.player_id))
    .sort((a, b) => a.player_id.localeCompare(b.player_id));

  if (candidates.length === 0) return null;
  const idx = hashSeed(`${userId}:${slot}:${salt}`) % candidates.length;
  return candidates[idx]!.player_id;
}

export async function seedHostedRoster(userId: string): Promise<HostedRosterData> {
  const cache = await loadSleeperPlayersCache();
  const used = new Set<string>();
  const starters: string[] = [];

  for (let i = 0; i < DEFAULT_HOSTED_ROSTER_POSITIONS.length; i++) {
    const slot = DEFAULT_HOSTED_ROSTER_POSITIONS[i]!;
    const id = pickPlayerId(cache, userId, slot, used, i);
    if (id) {
      used.add(id);
      starters.push(id);
    } else {
      starters.push('');
    }
  }

  const bench: string[] = [];
  for (let i = 0; i < 4; i++) {
    const id = pickPlayerId(cache, userId, 'FLX', used, 100 + i);
    if (id) {
      used.add(id);
      bench.push(id);
    }
  }

  const reserve: string[] = [];
  const irId = pickPlayerId(cache, userId, 'RB', used, 200);
  if (irId) reserve.push(irId);

  return {
    rosterPositions: [...DEFAULT_HOSTED_ROSTER_POSITIONS],
    starters,
    bench,
    reserve,
  };
}

export async function buildHostedMyRoster(
  userId: string,
  displayName: string,
  teamName: string | null,
  data: HostedRosterData,
  week = 1,
): Promise<MyRosterResult> {
  const cache = await loadSleeperPlayersCache();
  const starterRows: RosterPlayerRow[] = [];
  const positions = data.rosterPositions.length
    ? data.rosterPositions
    : DEFAULT_HOSTED_ROSTER_POSITIONS;

  for (let i = 0; i < positions.length; i++) {
    const playerId = data.starters[i];
    if (!playerId) continue;
    const player = cache.get(playerId);
    starterRows.push(
      toRow(playerId, player, {
        slot: positions[i],
        points: demoWeekPoints(userId, playerId, week),
      }),
    );
  }

  const benchRows = data.bench
    .filter(Boolean)
    .map((playerId) =>
      toRow(playerId, cache.get(playerId), { points: demoWeekPoints(userId, playerId, week) }),
    );

  const reserveRows = data.reserve
    .filter(Boolean)
    .map((playerId) => toRow(playerId, cache.get(playerId), {}));

  return {
    rosterId: userId,
    teamName: teamName?.trim() || `${displayName}'s Team`,
    ownerName: displayName,
    rosterPositions: positions,
    week,
    starters: starterRows,
    bench: benchRows,
    reserve: reserveRows,
  };
}

export function rosterPlayerIds(data: HostedRosterData): string[] {
  return [...data.starters, ...data.bench, ...data.reserve].filter(Boolean);
}

export function collectHostedOwnership(
  members: Array<{ userId: string; hostedRoster: HostedRosterData | null }>,
  currentUserId: string,
) {
  const ownedIds = new Set<string>();
  const myIds = new Set<string>();

  for (const member of members) {
    const data = member.hostedRoster;
    if (!data) continue;
    for (const playerId of rosterPlayerIds(data)) {
      ownedIds.add(playerId);
      if (member.userId === currentUserId) {
        myIds.add(playerId);
      }
    }
  }

  return { ownedIds, myIds, memberCount: Math.max(1, members.length) };
}

export function addHostedPlayer(
  data: HostedRosterData,
  playerId: string,
  leagueOwned: Set<string>,
): HostedRosterData {
  if (leagueOwned.has(playerId)) {
    throw new Error('Player is already on a roster in this league');
  }
  if (data.bench.includes(playerId) || data.starters.includes(playerId) || data.reserve.includes(playerId)) {
    throw new Error('Player is already on your roster');
  }
  if (data.bench.length >= MAX_HOSTED_BENCH) {
    throw new Error('Bench is full — drop a player first');
  }

  return {
    ...data,
    bench: [...data.bench, playerId],
  };
}

export function swapHostedRoster(data: HostedRosterData, starterIndex: number, benchIndex: number) {
  const next: HostedRosterData = {
    rosterPositions: [...data.rosterPositions],
    starters: [...data.starters],
    bench: [...data.bench],
    reserve: [...data.reserve],
  };

  const starterId = next.starters[starterIndex];
  const benchId = next.bench[benchIndex];
  if (starterId == null || benchId == null) {
    throw new Error('Invalid swap indices');
  }

  next.starters[starterIndex] = benchId;
  next.bench[benchIndex] = starterId;
  return next;
}

export function dropHostedPlayer(data: HostedRosterData, playerId: string) {
  const next: HostedRosterData = {
    rosterPositions: [...data.rosterPositions],
    starters: data.starters.map((id) => (id === playerId ? '' : id)),
    bench: data.bench.filter((id) => id !== playerId),
    reserve: data.reserve.filter((id) => id !== playerId),
  };
  return next;
}
