import type { CanonicalTeam } from '@flos/shared';
import { sleeperPlayerImageUrl } from '@flos/shared';
import { loadSleeperPlayersCache, type SleeperPlayerRecord } from './sleeper-players.js';

const BASE = 'https://api.sleeper.app/v1';

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players?: string[];
  starters?: string[];
  reserve?: string[];
  taxi?: string[];
};

type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string };
};

type SleeperMatchupRow = {
  roster_id: number;
  starters?: string[];
  players_points?: Record<string, number>;
};

export type RosterPlayerRow = {
  id: string;
  name: string;
  position: string;
  team: string;
  slot?: string;
  injuryStatus?: string | null;
  status?: string;
  imageUrl: string;
  points?: number;
};

export type MyRosterResult = {
  rosterId: string;
  teamName: string;
  ownerName: string;
  rosterPositions: string[];
  week: number;
  starters: RosterPlayerRow[];
  bench: RosterPlayerRow[];
  reserve: RosterPlayerRow[];
};

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

export function resolveSleeperOwnerId(
  teams: CanonicalTeam[],
  input: { displayName?: string; teamName?: string | null; providerTeamId?: string | null },
): string | null {
  if (input.providerTeamId) {
    const byRoster = teams.find((t) => t.externalTeamId === input.providerTeamId);
    if (byRoster?.ownerExternalId) return byRoster.ownerExternalId;
  }

  if (input.teamName) {
    const exact = teams.find((t) => t.name === input.teamName);
    if (exact?.ownerExternalId) return exact.ownerExternalId;
    const partial = teams.find(
      (t) =>
        t.name.toLowerCase().includes(input.teamName!.toLowerCase()) ||
        input.teamName!.toLowerCase().includes(t.name.toLowerCase()),
    );
    if (partial?.ownerExternalId) return partial.ownerExternalId;
  }

  const normalizedUser = input.displayName?.trim().toLowerCase();
  if (normalizedUser) {
    const byOwner = teams.find((t) => t.ownerName?.trim().toLowerCase() === normalizedUser);
    if (byOwner?.ownerExternalId) return byOwner.ownerExternalId;
    const first = normalizedUser.split(/\s+/)[0];
    const byFirst = teams.find((t) => t.ownerName?.trim().toLowerCase().startsWith(first));
    if (byFirst?.ownerExternalId) return byFirst.ownerExternalId;
  }

  return null;
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

/** Fetch the authenticated user's Sleeper roster with starters, bench, and IR. */
export async function fetchSleeperMyRoster(
  externalLeagueId: string,
  ownerId: string,
): Promise<MyRosterResult> {
  const [league, rosters, users, state] = await Promise.all([
    sleeperFetch<{ roster_positions?: string[]; name?: string }>(`/league/${externalLeagueId}`),
    sleeperFetch<SleeperRoster[]>(`/league/${externalLeagueId}/rosters`),
    sleeperFetch<SleeperLeagueUser[]>(`/league/${externalLeagueId}/users`),
    sleeperFetch<{ week: number }>(`/state/nfl`),
  ]);

  const roster = rosters.find((r) => r.owner_id === ownerId);
  if (!roster) {
    throw new Error('Could not find your roster in this league');
  }

  const week = state.week ?? 1;
  const rosterPositions = league.roster_positions ?? ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
  const user = users.find((u) => u.user_id === ownerId);
  const teamName =
    user?.metadata?.team_name ?? user?.display_name ?? `Team ${roster.roster_id}`;

  let matchupRow: SleeperMatchupRow | undefined;
  try {
    const rows = await sleeperFetch<SleeperMatchupRow[]>(
      `/league/${externalLeagueId}/matchups/${week}`,
    );
    matchupRow = rows.find((row) => row.roster_id === roster.roster_id);
  } catch {
    matchupRow = undefined;
  }

  const starterIds = matchupRow?.starters ?? roster.starters ?? [];
  const reserveIds = new Set(roster.reserve ?? []);
  const allPlayerIds = roster.players ?? [];
  const starterSet = new Set(starterIds);

  const cache = await loadSleeperPlayersCache();
  const playerMap = new Map<string, SleeperPlayerRecord>();
  for (const id of allPlayerIds) {
    const cached = cache.get(id);
    if (cached) playerMap.set(id, cached);
  }

  const starters: RosterPlayerRow[] = starterIds.map((playerId, index) =>
    toRow(playerId, playerMap.get(playerId), {
      slot: rosterPositions[index] ?? playerMap.get(playerId)?.position ?? 'FLEX',
      points: matchupRow?.players_points?.[playerId],
    }),
  );

  const bench: RosterPlayerRow[] = allPlayerIds
    .filter((id) => !starterSet.has(id) && !reserveIds.has(id))
    .map((id) => toRow(id, playerMap.get(id), { points: matchupRow?.players_points?.[id] }));

  const reserve: RosterPlayerRow[] = [...reserveIds].map((id) =>
    toRow(id, playerMap.get(id), { slot: 'IR', points: matchupRow?.players_points?.[id] }),
  );

  return {
    rosterId: String(roster.roster_id),
    teamName,
    ownerName: user?.display_name ?? 'Owner',
    rosterPositions,
    week,
    starters,
    bench,
    reserve,
  };
}
