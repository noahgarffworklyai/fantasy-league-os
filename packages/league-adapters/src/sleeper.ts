import type {
  CanonicalLeague,
  CanonicalMatchup,
  CanonicalStanding,
  CanonicalTeam,
  LeagueSummary,
} from '@flos/shared';
import type { LeagueAdapter, SleeperCredentials } from './types.js';

const BASE = 'https://api.sleeper.app/v1';

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

type SleeperUser = { user_id: string; username: string; display_name: string };
type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  settings?: { playoff_teams?: number };
};
type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  settings: { wins?: number; losses?: number; ties?: number; fpts?: number; fpts_against?: number };
  players?: string[];
};
type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string };
};
type SleeperMatchup = {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points?: Record<string, number>;
};

function buildStandings(
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
): CanonicalStanding[] {
  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const standings = rosters
    .map((r) => ({
      teamExternalId: String(r.roster_id),
      wins: r.settings.wins ?? 0,
      losses: r.settings.losses ?? 0,
      ties: r.settings.ties ?? 0,
      pointsFor: r.settings.fpts ?? 0,
      pointsAgainst: r.settings.fpts_against ?? 0,
      ownerName: userMap.get(r.owner_id)?.display_name,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return standings;
}

function buildTeams(
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
): CanonicalTeam[] {
  const userMap = new Map(users.map((u) => [u.user_id, u]));
  return rosters.map((r) => {
    const user = userMap.get(r.owner_id);
    return {
      externalTeamId: String(r.roster_id),
      name: user?.metadata?.team_name ?? user?.display_name ?? `Team ${r.roster_id}`,
      ownerName: user?.display_name,
      ownerExternalId: r.owner_id,
      wins: r.settings.wins ?? 0,
      losses: r.settings.losses ?? 0,
      ties: r.settings.ties ?? 0,
      pointsFor: r.settings.fpts ?? 0,
      pointsAgainst: r.settings.fpts_against ?? 0,
    };
  });
}

export const sleeperAdapter: LeagueAdapter<SleeperCredentials> = {
  provider: 'sleeper',

  async discoverLeagues(credentials, season = new Date().getFullYear()) {
    let userId = credentials.userId;
    if (!userId && credentials.username) {
      const user = await sleeperFetch<SleeperUser>(`/user/${credentials.username}`);
      userId = user.user_id;
    }
    if (!userId) throw new Error('Sleeper username or userId required');

    const fetchForSeason = (targetSeason: number) =>
      sleeperFetch<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${targetSeason}`);

    let leagues = await fetchForSeason(season);

    // Off-season: most users' leagues are still on the previous NFL season year
    if (leagues.length === 0 && season > 2020) {
      leagues = await fetchForSeason(season - 1);
    }

    return leagues.map((l) => ({
      externalId: l.league_id,
      provider: 'sleeper' as const,
      name: l.name,
      season: Number(l.season),
      teamCount: l.total_rosters,
    }));
  },

  async fetchLeague(externalLeagueId) {
    const [league, rosters, users, state] = await Promise.all([
      sleeperFetch<SleeperLeague & { status?: string }>(`/league/${externalLeagueId}`),
      sleeperFetch<SleeperRoster[]>(`/league/${externalLeagueId}/rosters`),
      sleeperFetch<SleeperLeagueUser[]>(`/league/${externalLeagueId}/users`),
      sleeperFetch<{ week: number; season: string }>(`/state/nfl`),
    ]);

    const currentWeek = state.week ?? 1;
    const teams = buildTeams(rosters, users);
    const standings = buildStandings(rosters, users);

    let schedule: CanonicalMatchup[] = [];
    try {
      schedule = await sleeperAdapter.fetchMatchups(externalLeagueId, currentWeek, {});
    } catch {
      schedule = [];
    }

    return {
      externalId: externalLeagueId,
      provider: 'sleeper',
      name: league.name,
      season: Number(league.season),
      currentWeek,
      teams,
      standings,
      schedule,
    };
  },

  async fetchMatchups(externalLeagueId, week) {
    const [matchups, rosters] = await Promise.all([
      sleeperFetch<SleeperMatchup[]>(`/league/${externalLeagueId}/matchups/${week}`),
      sleeperFetch<SleeperRoster[]>(`/league/${externalLeagueId}/rosters`),
    ]);

    const rosterIds = new Set(rosters.map((r) => r.roster_id));
    const byMatchup = new Map<number, SleeperMatchup[]>();

    for (const m of matchups) {
      if (!rosterIds.has(m.roster_id)) continue;
      const list = byMatchup.get(m.matchup_id) ?? [];
      list.push(m);
      byMatchup.set(m.matchup_id, list);
    }

    const result: CanonicalMatchup[] = [];
    for (const [matchupId, teams] of byMatchup) {
      if (teams.length < 2) continue;
      const [home, away] = teams.sort((a, b) => a.roster_id - b.roster_id);
      result.push({
        week,
        matchupId: String(matchupId),
        homeTeamExternalId: String(home.roster_id),
        awayTeamExternalId: String(away.roster_id),
        homeScore: home.points,
        awayScore: away.points,
        status: 'final',
      });
    }

    return result;
  },
};

export async function resolveSleeperUserId(username: string): Promise<string> {
  const user = await sleeperFetch<SleeperUser>(`/user/${username}`);
  return user.user_id;
}

export type { SleeperCredentials };
