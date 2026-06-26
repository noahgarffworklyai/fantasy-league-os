import type {
  CanonicalLeague,
  CanonicalMatchup,
  CanonicalStanding,
  CanonicalTeam,
  LeagueSummary,
} from '@flos/shared';
import type { LeagueAdapter, YahooCredentials } from './types.js';

const YAHOO_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';
const NFL_GAME_KEY = '461';

async function yahooGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${YAHOO_BASE}${path}?format=json`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Yahoo API error: ${res.status}`);
  }
  const json = (await res.json()) as { fantasy_content: T };
  return json.fantasy_content;
}

function extractLeagues(content: Record<string, unknown>): LeagueSummary[] {
  const leagues: LeagueSummary[] = [];
  const users = content.users as Record<string, unknown> | undefined;
  if (!users) return leagues;

  for (const key of Object.keys(users)) {
    if (key === 'count') continue;
    const user = users[key] as Record<string, unknown>;
    const games = user?.games as Record<string, unknown> | undefined;
    if (!games) continue;

    for (const gKey of Object.keys(games)) {
      if (gKey === 'count') continue;
      const game = games[gKey] as Record<string, unknown>;
      const gameData = (game.game as unknown[])?.[1] as Record<string, unknown> | undefined;
      const gameLeagues = gameData?.leagues as Record<string, unknown> | undefined;
      if (!gameLeagues) continue;

      for (const lKey of Object.keys(gameLeagues)) {
        if (lKey === 'count') continue;
        const leagueEntry = gameLeagues[lKey] as Record<string, unknown>;
        const leagueArr = leagueEntry.league as unknown[];
        const league = leagueArr?.[0] as Record<string, unknown> | undefined;
        if (!league) continue;

        leagues.push({
          externalId: String(league.league_key),
          provider: 'yahoo',
          name: String(league.name),
          season: Number(league.season),
          teamCount: Number(league.num_teams ?? 0),
        });
      }
    }
  }

  return leagues;
}

function parseTeams(content: Record<string, unknown>): CanonicalTeam[] {
  const teams: CanonicalTeam[] = [];
  const league = content.league as unknown[];
  const leagueData = league?.[0] as Record<string, unknown> | undefined;
  const teamsNode = league?.[1] as Record<string, unknown> | undefined;
  const standingsNode = teamsNode?.standings as unknown[] | undefined;
  const standingsData = standingsNode?.[0] as Record<string, unknown> | undefined;
  const teamsContainer = standingsData?.teams as Record<string, unknown> | undefined;

  if (!teamsContainer) return teams;

  for (const key of Object.keys(teamsContainer)) {
    if (key === 'count') continue;
    const teamEntry = teamsContainer[key] as Record<string, unknown>;
    const teamArr = teamEntry.team as unknown[];
    const teamMeta = teamArr?.[0] as unknown[];
    const teamStats = teamArr?.[1] as Record<string, unknown> | undefined;
    const standingsStats = teamStats?.team_standings as Record<string, unknown> | undefined;

    const teamKey = (teamMeta?.find((m) => typeof m === 'object' && m !== null && 'team_key' in m) as Record<string, unknown>)?.team_key;
    const name = (teamMeta?.find((m) => typeof m === 'object' && m !== null && 'name' in m) as Record<string, unknown>)?.name;

    const outcomeTotals = standingsStats?.outcome_totals as
      | { wins?: number; losses?: number; ties?: number }
      | undefined;

    teams.push({
      externalTeamId: String(teamKey ?? key),
      name: String(name ?? `Team ${key}`),
      wins: Number(outcomeTotals?.wins ?? 0),
      losses: Number(outcomeTotals?.losses ?? 0),
      ties: Number(outcomeTotals?.ties ?? 0),
      pointsFor: Number(standingsStats?.points_for ?? 0),
      pointsAgainst: Number(standingsStats?.points_against ?? 0),
    });
  }

  return teams;
}

export const yahooAdapter: LeagueAdapter<YahooCredentials> = {
  provider: 'yahoo',

  async discoverLeagues(credentials, season = new Date().getFullYear()) {
    const content = await yahooGet<Record<string, unknown>>(
      `/users;use_login=1/games;game_keys=nfl/leagues`,
      credentials.accessToken,
    );
    return extractLeagues(content).filter((l) => l.season === season);
  },

  async fetchLeague(externalLeagueId, credentials) {
    const content = await yahooGet<Record<string, unknown>>(
      `/league/${externalLeagueId}/standings`,
      credentials.accessToken,
    );

    const leagueArr = content.league as unknown[];
    const leagueMeta = leagueArr?.[0] as unknown[];
    const season = Number(
      (leagueMeta?.find((m) => typeof m === 'object' && m !== null && 'season' in m) as Record<string, unknown>)?.season ?? new Date().getFullYear(),
    );
    const name = String(
      (leagueMeta?.find((m) => typeof m === 'object' && m !== null && 'name' in m) as Record<string, unknown>)?.name ?? 'Yahoo League',
    );

    const teams = parseTeams(content);
    const standings: CanonicalStanding[] = [...teams]
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      })
      .map((t, i) => ({
        rank: i + 1,
        teamExternalId: t.externalTeamId,
        wins: t.wins,
        losses: t.losses,
        ties: t.ties,
        pointsFor: t.pointsFor,
        pointsAgainst: t.pointsAgainst,
      }));

    return {
      externalId: externalLeagueId,
      provider: 'yahoo',
      name,
      season,
      currentWeek: 1,
      teams,
      standings,
      schedule: [],
    };
  },

  async fetchMatchups(externalLeagueId, week, credentials) {
    const content = await yahooGet<Record<string, unknown>>(
      `/league/${externalLeagueId}/scoreboard;week=${week}`,
      credentials.accessToken,
    );

    const matchups: CanonicalMatchup[] = [];
    const league = content.league as unknown[];
    const scoreboard = league?.[1] as Record<string, unknown> | undefined;
    const scoreboardData = scoreboard?.scoreboard as unknown[];
    const matchupsNode = scoreboardData?.[0] as Record<string, unknown> | undefined;
    const matchupsContainer = matchupsNode?.matchups as Record<string, unknown> | undefined;

    if (!matchupsContainer) return matchups;

    for (const key of Object.keys(matchupsContainer)) {
      if (key === 'count') continue;
      const mEntry = matchupsContainer[key] as Record<string, unknown>;
      const mArr = mEntry.matchup as unknown[];
      const teamsNode = mArr?.[0] as Record<string, unknown> | undefined;
      const teamsContainer = teamsNode?.teams as Record<string, unknown> | undefined;
      if (!teamsContainer) continue;

      const teamKeys: string[] = [];
      const scores: number[] = [];
      for (const tKey of Object.keys(teamsContainer)) {
        if (tKey === 'count') continue;
        const tEntry = teamsContainer[tKey] as Record<string, unknown>;
        const tArr = tEntry.team as unknown[];
        const tMeta = tArr?.[0] as unknown[];
        const tStats = tArr?.[1] as Record<string, unknown> | undefined;
        const teamKey = (tMeta?.find((m) => typeof m === 'object' && m !== null && 'team_key' in m) as Record<string, unknown>)?.team_key;
        teamKeys.push(String(teamKey));
        const teamPoints = tStats?.team_points as { total?: number } | undefined;
        scores.push(Number(teamPoints?.total ?? 0));
      }

      if (teamKeys.length >= 2) {
        matchups.push({
          week,
          matchupId: `${externalLeagueId}-${week}-${key}`,
          homeTeamExternalId: teamKeys[0],
          awayTeamExternalId: teamKeys[1],
          homeScore: scores[0],
          awayScore: scores[1],
          status: 'final',
        });
      }
    }

    return matchups;
  },
};

export type { YahooCredentials };
