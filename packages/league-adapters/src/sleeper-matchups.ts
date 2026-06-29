import type { CanonicalTeam } from '@flos/shared';
import { sleeperPlayerImageUrl, sleeperUserAvatarUrl } from '@flos/shared';

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
};
type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  avatar?: string;
  metadata?: { team_name?: string };
};
type SleeperMatchupRow = {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters?: string[];
  players_points?: Record<string, number>;
};
type SleeperPlayer = {
  player_id: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  status?: string;
  injury_status?: string;
};

export type SleeperLineupEntry = {
  slot: string;
  playerId: string;
  name: string;
  position: string;
  points: number;
  status?: string;
  imageUrl: string;
};

export type SleeperMatchupSide = {
  rosterId: string;
  teamName: string;
  ownerName: string;
  ownerAvatarUrl?: string;
  points: number;
  lineup: SleeperLineupEntry[];
};

export type SleeperWeekMatchup = {
  matchupId: string;
  week: number;
  home: SleeperMatchupSide;
  away: SleeperMatchupSide;
  status: 'scheduled' | 'in_progress' | 'final';
};

function playerName(p: SleeperPlayer | undefined, id: string) {
  if (!p) return `Player ${id.slice(-4)}`;
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return name || `Player ${id.slice(-4)}`;
}

async function resolveSleeperPlayers(ids: string[]): Promise<Map<string, SleeperPlayer>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const pairs = await Promise.all(
    unique.map(async (id) => {
      try {
        const player = await sleeperFetch<SleeperPlayer>(`/player/${id}`);
        return [id, player] as const;
      } catch {
        return [id, { player_id: id }] as const;
      }
    }),
  );
  return new Map(pairs);
}

function teamLookup(rosters: SleeperRoster[], users: SleeperLeagueUser[]) {
  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const teams: CanonicalTeam[] = rosters.map((r) => {
    const user = userMap.get(r.owner_id);
    return {
      externalTeamId: String(r.roster_id),
      name: user?.metadata?.team_name ?? user?.display_name ?? `Team ${r.roster_id}`,
      ownerName: user?.display_name,
      ownerExternalId: r.owner_id,
      ownerAvatarUrl: user?.avatar ? sleeperUserAvatarUrl(user.avatar) : undefined,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  });
  return new Map(teams.map((t) => [t.externalTeamId, t]));
}

/** Live owner avatar URLs keyed by Sleeper user id. */
export async function fetchSleeperOwnerAvatars(
  externalLeagueId: string,
): Promise<Map<string, string>> {
  const users = await sleeperFetch<SleeperLeagueUser[]>(`/league/${externalLeagueId}/users`);
  const map = new Map<string, string>();
  for (const user of users ?? []) {
    if (user.avatar) map.set(user.user_id, sleeperUserAvatarUrl(user.avatar));
  }
  return map;
}

function lineupForSide(
  row: SleeperMatchupRow,
  rosterPositions: string[],
  players: Map<string, SleeperPlayer>,
): SleeperLineupEntry[] {
  const starters = row.starters ?? [];
  return starters.map((playerId, index) => {
    const player = players.get(playerId);
    const slot = rosterPositions[index] ?? player?.position ?? 'FLEX';
    return {
      slot,
      playerId,
      name: playerName(player, playerId),
      position: player?.position ?? slot,
      points: row.players_points?.[playerId] ?? 0,
      status: player?.injury_status ?? player?.status,
      imageUrl: sleeperPlayerImageUrl(playerId),
    };
  });
}

function inferStatus(
  week: number,
  currentWeek: number,
  homePoints: number,
  awayPoints: number,
): SleeperWeekMatchup['status'] {
  if (week < currentWeek) return 'final';
  if (week > currentWeek) return 'scheduled';
  if (homePoints > 0 || awayPoints > 0) return 'in_progress';
  return 'scheduled';
}

/** Live week matchups with starter lineups and player points from Sleeper. */
export async function fetchSleeperWeekMatchups(
  externalLeagueId: string,
  week: number,
): Promise<SleeperWeekMatchup[]> {
  const [league, rosters, users, rows, state] = await Promise.all([
    sleeperFetch<{ roster_positions?: string[] }>(`/league/${externalLeagueId}`),
    sleeperFetch<SleeperRoster[]>(`/league/${externalLeagueId}/rosters`),
    sleeperFetch<SleeperLeagueUser[]>(`/league/${externalLeagueId}/users`),
    sleeperFetch<SleeperMatchupRow[]>(`/league/${externalLeagueId}/matchups/${week}`),
    sleeperFetch<{ week: number }>(`/state/nfl`),
  ]);

  const rosterPositions = league.roster_positions ?? ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
  const teams = teamLookup(rosters, users);
  const playerIds = rows.flatMap((row) => row.starters ?? []);
  const players = await resolveSleeperPlayers(playerIds);
  const currentWeek = state.week ?? week;

  const byMatchup = new Map<number, SleeperMatchupRow[]>();
  for (const row of rows ?? []) {
    const list = byMatchup.get(row.matchup_id) ?? [];
    list.push(row);
    byMatchup.set(row.matchup_id, list);
  }

  const result: SleeperWeekMatchup[] = [];
  for (const [matchupId, sides] of byMatchup) {
    if (sides.length < 2) continue;
    const [homeRow, awayRow] = [...sides].sort((a, b) => a.roster_id - b.roster_id);
    const homeTeam = teams.get(String(homeRow.roster_id));
    const awayTeam = teams.get(String(awayRow.roster_id));

    result.push({
      matchupId: String(matchupId),
      week,
      home: {
        rosterId: String(homeRow.roster_id),
        teamName: homeTeam?.name ?? `Team ${homeRow.roster_id}`,
        ownerName: homeTeam?.ownerName ?? 'Owner',
        ownerAvatarUrl: homeTeam?.ownerAvatarUrl,
        points: homeRow.points ?? 0,
        lineup: lineupForSide(homeRow, rosterPositions, players),
      },
      away: {
        rosterId: String(awayRow.roster_id),
        teamName: awayTeam?.name ?? `Team ${awayRow.roster_id}`,
        ownerName: awayTeam?.ownerName ?? 'Owner',
        ownerAvatarUrl: awayTeam?.ownerAvatarUrl,
        points: awayRow.points ?? 0,
        lineup: lineupForSide(awayRow, rosterPositions, players),
      },
      status: inferStatus(week, currentWeek, homeRow.points ?? 0, awayRow.points ?? 0),
    });
  }

  return result;
}

export type { CanonicalTeam };
