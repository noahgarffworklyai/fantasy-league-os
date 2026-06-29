import type {
  CanonicalLeague,
  CanonicalMatchup,
  CanonicalStanding,
  CanonicalTeam,
  LeagueSummary,
} from '@flos/shared';
import { sleeperUserAvatarUrl } from '@flos/shared';
import type { LeagueAdapter, SleeperCredentials } from './types.js';

const BASE = 'https://api.sleeper.app/v1';

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, '');
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
  avatar?: string;
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
      ownerAvatarUrl: user?.avatar ? sleeperUserAvatarUrl(user.avatar) : undefined,
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
      const handle = normalizeUsername(credentials.username);
      const user = await sleeperFetch<SleeperUser | null>(`/user/${handle}`);
      if (!user?.user_id) {
        throw new Error(
          `Sleeper user "@${handle}" not found. Use your @username handle from your Sleeper profile, not your display name.`,
        );
      }
      userId = user.user_id;
    }
    if (!userId) throw new Error('Sleeper username or userId required');

    const seasons = [season, season - 1, season - 2].filter((y) => y > 2018);
    const byId = new Map<string, LeagueSummary>();

    for (const targetSeason of seasons) {
      const raw = await sleeperFetch<SleeperLeague[] | null>(
        `/user/${userId}/leagues/nfl/${targetSeason}`,
      );
      for (const league of raw ?? []) {
        byId.set(league.league_id, {
          externalId: league.league_id,
          provider: 'sleeper' as const,
          name: league.name,
          season: Number(league.season),
          teamCount: league.total_rosters,
        });
      }
    }

    return [...byId.values()].sort((a, b) => b.season - a.season);
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
  const handle = normalizeUsername(username);
  const user = await sleeperFetch<SleeperUser | null>(`/user/${handle}`);
  if (!user?.user_id) {
    throw new Error(`Sleeper user "@${handle}" not found`);
  }
  return user.user_id;
}

export async function previewSleeperLeague(leagueId: string): Promise<LeagueSummary> {
  const league = await sleeperAdapter.fetchLeague(leagueId.trim(), {});
  return {
    externalId: league.externalId,
    provider: 'sleeper',
    name: league.name,
    season: league.season,
    teamCount: league.teams.length,
  };
}

export type { SleeperCredentials };
