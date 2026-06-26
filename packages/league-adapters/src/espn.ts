import type {
  CanonicalLeague,
  CanonicalMatchup,
  CanonicalStanding,
  CanonicalTeam,
  LeagueSummary,
} from '@flos/shared';
import type { EspnCredentials, LeagueAdapter } from './types.js';

const ESPN_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl';

type EspnSettings = {
  name?: string;
  seasonId?: number;
  scoringPeriodId?: number;
  status?: { currentMatchupPeriod?: number };
};

type EspnTeam = {
  id: number;
  abbrev?: string;
  location?: string;
  nickname?: string;
  record?: {
    overall?: { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number };
  };
  owners?: string[];
};

type EspnMatchup = {
  id: number;
  home?: { teamId: number; totalPoints: number };
  away?: { teamId: number; totalPoints: number };
};

function buildHeaders(credentials: EspnCredentials): HeadersInit {
  return {
    Cookie: `espn_s2=${credentials.espnS2}; SWID=${credentials.swid}`,
    Accept: 'application/json',
  };
}

async function espnFetch<T>(
  leagueId: string,
  season: number,
  credentials: EspnCredentials,
  views: string[] = [],
): Promise<T> {
  const viewParam = views.length ? `&view=${views.join('&view=')}` : '';
  const url = `${ESPN_BASE}/seasons/${season}/segments/0/leagues/${leagueId}?${viewParam.replace(/^&/, '')}`;
  const res = await fetch(url, { headers: buildHeaders(credentials) });
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function mapTeams(teams: EspnTeam[]): CanonicalTeam[] {
  return teams.map((t) => ({
    externalTeamId: String(t.id),
    name: [t.location, t.nickname].filter(Boolean).join(' ') || t.abbrev || `Team ${t.id}`,
    ownerExternalId: t.owners?.[0],
    wins: t.record?.overall?.wins ?? 0,
    losses: t.record?.overall?.losses ?? 0,
    ties: t.record?.overall?.ties ?? 0,
    pointsFor: t.record?.overall?.pointsFor ?? 0,
    pointsAgainst: t.record?.overall?.pointsAgainst ?? 0,
  }));
}

function mapStandings(teams: CanonicalTeam[]): CanonicalStanding[] {
  return [...teams]
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
}

export const espnAdapter: LeagueAdapter<EspnCredentials> = {
  provider: 'espn',

  async discoverLeagues(credentials, season = new Date().getFullYear()) {
    if (!credentials.leagueId) {
      throw new Error('ESPN league ID required for discovery');
    }

    const data = await espnFetch<{ settings?: EspnSettings }>(
      credentials.leagueId,
      season,
      credentials,
      ['mSettings'],
    );

    return [
      {
        externalId: credentials.leagueId,
        provider: 'espn',
        name: data.settings?.name ?? `ESPN League ${credentials.leagueId}`,
        season,
      },
    ];
  },

  async fetchLeague(externalLeagueId, credentials) {
    const season = new Date().getFullYear();
    const data = await espnFetch<{
      settings?: EspnSettings;
      teams?: EspnTeam[];
      schedule?: EspnMatchup[];
    }>(externalLeagueId, season, credentials, [
      'mSettings',
      'mTeam',
      'mStandings',
      'mMatchupScore',
    ]);

    const teams = mapTeams(data.teams ?? []);
    const standings = mapStandings(teams);
    const currentWeek =
      data.settings?.status?.currentMatchupPeriod ??
      data.settings?.scoringPeriodId ??
      1;

    const schedule: CanonicalMatchup[] = (data.schedule ?? [])
      .filter((m) => m.home && m.away)
      .map((m) => ({
        week: currentWeek,
        matchupId: String(m.id),
        homeTeamExternalId: String(m.home!.teamId),
        awayTeamExternalId: String(m.away!.teamId),
        homeScore: m.home!.totalPoints,
        awayScore: m.away!.totalPoints,
        status: 'final' as const,
      }));

    return {
      externalId: externalLeagueId,
      provider: 'espn',
      name: data.settings?.name ?? `ESPN League ${externalLeagueId}`,
      season: data.settings?.seasonId ?? season,
      currentWeek,
      teams,
      standings,
      schedule,
    };
  },

  async fetchMatchups(externalLeagueId, week, credentials) {
    const season = new Date().getFullYear();
    const data = await espnFetch<{ schedule?: EspnMatchup[] }>(
      externalLeagueId,
      season,
      credentials,
      ['mMatchupScore'],
    );

    return (data.schedule ?? [])
      .filter((m) => m.home && m.away)
      .map((m) => ({
        week,
        matchupId: String(m.id),
        homeTeamExternalId: String(m.home!.teamId),
        awayTeamExternalId: String(m.away!.teamId),
        homeScore: m.home!.totalPoints,
        awayScore: m.away!.totalPoints,
        status: 'final' as const,
      }));
  },
};

export type { EspnCredentials };
