import type {
  CanonicalLeague,
  CanonicalMatchup,
  CanonicalStanding,
  CanonicalTeam,
  LeagueSummary,
} from '@flos/shared';
import type { EspnCredentials, LeagueAdapter } from './types.js';
import {
  enrichEspnTeams,
  enrichTeamsWithDirectory,
  espnFetchLeague,
  espnFetchLeagueAcrossSeasons,
  espnFetchTeamDirectory,
  espnTeamName,
  resolveEspnCurrentWeek,
  resolveEspnSeason,
  type EspnMatchup,
} from './espn-api.js';

function inferMatchupStatus(
  week: number,
  currentWeek: number,
  homeScore?: number,
  awayScore?: number,
): CanonicalMatchup['status'] {
  if (week < currentWeek) return 'final';
  if (week > currentWeek) return 'scheduled';
  if ((homeScore ?? 0) > 0 || (awayScore ?? 0) > 0) return 'in_progress';
  return 'scheduled';
}

function mapTeams(
  teams: ReturnType<typeof enrichEspnTeams>,
): CanonicalTeam[] {
  return teams.map((team) => ({
    externalTeamId: String(team.id),
    name: espnTeamName(team),
    ownerName: team.ownerDisplayName,
    ownerExternalId: team.primaryOwner ?? team.owners?.[0],
    wins: team.record?.overall?.wins ?? 0,
    losses: team.record?.overall?.losses ?? 0,
    ties: team.record?.overall?.ties ?? 0,
    pointsFor: team.record?.overall?.pointsFor ?? 0,
    pointsAgainst: team.record?.overall?.pointsAgainst ?? 0,
  }));
}

function mapStandings(teams: CanonicalTeam[]): CanonicalStanding[] {
  return [...teams]
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    })
    .map((team, index) => ({
      rank: index + 1,
      teamExternalId: team.externalTeamId,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      pointsFor: team.pointsFor,
      pointsAgainst: team.pointsAgainst,
    }));
}

function mapSchedule(
  schedule: EspnMatchup[],
  currentWeek: number,
): CanonicalMatchup[] {
  return schedule
    .filter((matchup) => matchup.home && matchup.away && matchup.matchupPeriodId != null)
    .map((matchup) => ({
      week: matchup.matchupPeriodId!,
      matchupId: String(matchup.id),
      homeTeamExternalId: String(matchup.home!.teamId),
      awayTeamExternalId: String(matchup.away!.teamId),
      homeScore: matchup.home!.totalPoints,
      awayScore: matchup.away!.totalPoints,
      status: inferMatchupStatus(
        matchup.matchupPeriodId!,
        currentWeek,
        matchup.home!.totalPoints,
        matchup.away!.totalPoints,
      ),
    }));
}

export const espnAdapter: LeagueAdapter<EspnCredentials> = {
  provider: 'espn',

  async discoverLeagues(credentials, season = new Date().getFullYear()) {
    if (!credentials.leagueId) {
      throw new Error('ESPN league ID required for discovery');
    }

    const data = await espnFetchLeagueAcrossSeasons(credentials.leagueId, credentials, {
      views: ['mSettings'],
      seasons: season ? [season, season - 1, season - 2, season - 3] : undefined,
    });

    return [
      {
        externalId: credentials.leagueId,
        provider: 'espn',
        name: data.settings?.name ?? `ESPN League ${credentials.leagueId}`,
        season: resolveEspnSeason(data.settings, season),
      },
    ];
  },

  async fetchLeague(externalLeagueId, credentials) {
    const data = await espnFetchLeagueAcrossSeasons(externalLeagueId, credentials, {
      views: ['mSettings', 'mStandings', 'mMatchupScore', 'mTeam'],
    });

    const season = resolveEspnSeason(data.settings);
    const directory = await espnFetchTeamDirectory(externalLeagueId, credentials, season);
    const mergedTeams = enrichTeamsWithDirectory(data.teams ?? [], directory);
    const teams = mapTeams(enrichEspnTeams(mergedTeams, data.members ?? []));
    const standings = mapStandings(teams);
    const schedule = mapSchedule(data.schedule ?? [], resolveEspnCurrentWeek(data.settings));

    return {
      externalId: externalLeagueId,
      provider: 'espn',
      name: data.settings?.name ?? `ESPN League ${externalLeagueId}`,
      season,
      currentWeek: resolveEspnCurrentWeek(data.settings),
      teams,
      standings,
      schedule,
    };
  },

  async fetchMatchups(externalLeagueId, week, credentials) {
    const data = await espnFetchLeague(externalLeagueId, credentials, {
      scoringPeriodId: week,
      views: ['mMatchupScore', 'mSettings'],
    });

    const currentWeek = resolveEspnCurrentWeek(data.settings);
    return mapSchedule(
      (data.schedule ?? []).filter((matchup) => matchup.matchupPeriodId === week),
      currentWeek,
    );
  },
};

export async function previewEspnLeague(
  leagueId: string,
  credentials: EspnCredentials,
): Promise<LeagueSummary> {
  const league = await espnAdapter.fetchLeague(leagueId.trim(), credentials);
  return {
    externalId: league.externalId,
    provider: 'espn',
    name: league.name,
    season: league.season,
    teamCount: league.teams.length,
  };
}

export type { EspnCredentials };
