import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { fetchLeagueDetail } from './league-snapshot-api';

export interface TeamRow {
  id: string;
  rank: number;
  prev: number;
  name: string;
  owner: string;
  ownerAvatarUrl?: string | null;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  streak: string;
  seed?: number;
  tag?: 'division' | 'playoff' | 'bubble' | 'last';
}

export interface LineupRow {
  slot: string;
  name: string;
  pts: number;
  rem: string;
  playerId?: string;
  imageUrl?: string;
}

export interface Matchup {
  id: string;
  home: TeamRow;
  hp: number;
  hproj: number;
  away: TeamRow;
  ap: number;
  aproj: number;
  state: 'pre' | 'live' | 'final';
  kickoff?: string;
  winProb: number;
  homeLineup: LineupRow[];
  awayLineup: LineupRow[];
}

type ApiStanding = {
  rank: number;
  teamExternalId: string;
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
  pointsAgainst?: number;
  teamName?: string;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
};

type ApiLineupEntry = {
  slot: string;
  name: string;
  position?: string;
  points: number;
  status?: string;
  playerId?: string;
  imageUrl?: string;
};

type ApiMatchupSide = {
  rosterId: string;
  teamName: string;
  ownerName: string | null;
  ownerAvatarUrl?: string | null;
  points: number;
  lineup: ApiLineupEntry[];
};

type ApiMatchup = {
  matchupId: string;
  week: number;
  status: string;
  home: ApiMatchupSide;
  away: ApiMatchupSide;
};

export type LeagueTabData = {
  week: number;
  teams: TeamRow[];
  matchups: Matchup[];
  playoffTeams: number;
  hasSnapshot: boolean;
  synced: boolean;
};

function playoffTeamsFor(size: number) {
  if (size <= 8) return 4;
  if (size <= 10) return 4;
  if (size <= 12) return 6;
  return 6;
}

function teamTag(rank: number, size: number, playoffTeams: number): TeamRow['tag'] {
  if (rank === size) return 'last';
  if (rank <= Math.min(2, playoffTeams)) return 'division';
  if (rank <= playoffTeams) return 'playoff';
  if (rank <= playoffTeams + 2) return 'bubble';
  return undefined;
}

function toLineupRows(lineup: ApiLineupEntry[]): LineupRow[] {
  return lineup.map((p) => ({
    slot: p.slot,
    name: p.name,
    pts: p.points ?? 0,
    rem: p.status && p.status !== 'Active' ? p.status : p.position ?? '—',
    playerId: p.playerId,
    imageUrl: p.imageUrl,
  }));
}

function mapStatus(status: string, points: number): Matchup['state'] {
  if (status === 'final') return 'final';
  if (status === 'in_progress' || points > 0) return 'live';
  return 'pre';
}

function winProb(home: number, away: number): number {
  const total = home + away;
  if (total <= 0) return 0.5;
  return home / total;
}

function buildTeamsFromStandings(standings: ApiStanding[], teamCount: number): TeamRow[] {
  const playoffTeams = playoffTeamsFor(teamCount);
  return standings.map((s) => ({
    id: s.teamExternalId,
    rank: s.rank,
    prev: s.rank,
    name: s.teamName ?? `Team ${s.teamExternalId}`,
    owner: s.ownerName ?? 'Owner',
    ownerAvatarUrl: s.ownerAvatarUrl,
    wins: s.wins,
    losses: s.losses,
    ties: s.ties ?? 0,
    pf: s.pointsFor,
    pa: s.pointsAgainst ?? 0,
    streak: '—',
    seed: s.rank <= playoffTeams ? s.rank : undefined,
    tag: teamTag(s.rank, teamCount, playoffTeams),
  }));
}

function findTeam(teams: TeamRow[], rosterId: string): TeamRow {
  return (
    teams.find((t) => t.id === rosterId) ?? {
      id: rosterId,
      rank: 0,
      prev: 0,
      name: `Team ${rosterId}`,
      owner: 'Owner',
      wins: 0,
      losses: 0,
      ties: 0,
      pf: 0,
      pa: 0,
      streak: '—',
    }
  );
}

function buildMatchups(apiMatchups: ApiMatchup[], teams: TeamRow[]): Matchup[] {
  return apiMatchups.map((m) => {
    const homeBase = findTeam(teams, m.home.rosterId);
    const awayBase = findTeam(teams, m.away.rosterId);
    const home: TeamRow = {
      ...homeBase,
      ownerAvatarUrl: m.home.ownerAvatarUrl ?? homeBase.ownerAvatarUrl,
    };
    const away: TeamRow = {
      ...awayBase,
      ownerAvatarUrl: m.away.ownerAvatarUrl ?? awayBase.ownerAvatarUrl,
    };
    const hp = m.home.points ?? 0;
    const ap = m.away.points ?? 0;
    const state = mapStatus(m.status, hp + ap);
    return {
      id: m.matchupId,
      home,
      hp,
      hproj: hp,
      away,
      ap,
      aproj: ap,
      state,
      winProb: winProb(hp, ap),
      homeLineup: toLineupRows(m.home.lineup ?? []),
      awayLineup: toLineupRows(m.away.lineup ?? []),
    };
  });
}

async function fetchLeagueTabData(leagueId: string): Promise<LeagueTabData> {
  const detail = await fetchLeagueDetail(leagueId);
  const synced = !!detail.providerLink;

  const standingsRes = await api.get<{ standings: ApiStanding[]; currentWeek?: number }>(
    `/leagues/${leagueId}/standings`,
  );

  if (!standingsRes.standings?.length) {
    return {
      week: standingsRes.currentWeek ?? 1,
      teams: [],
      matchups: [],
      playoffTeams: 6,
      hasSnapshot: false,
      synced,
    };
  }

  const teams = buildTeamsFromStandings(
    standingsRes.standings,
    standingsRes.standings.length,
  );
  const playoffTeams = playoffTeamsFor(teams.length);
  const week = standingsRes.currentWeek ?? 1;

  let matchups: Matchup[] = [];
  try {
    const matchupsRes = await api.get<{ week: number; matchups: ApiMatchup[] }>(
      `/leagues/${leagueId}/matchups?week=${week}`,
    );
    matchups = buildMatchups(matchupsRes.matchups ?? [], teams);
  } catch {
    matchups = [];
  }

  return {
    week,
    teams,
    matchups,
    playoffTeams,
    hasSnapshot: true,
    synced,
  };
}

const SYNCED_REFETCH_MS = 90_000;

export function useLeagueTabData(leagueId: string | undefined, synced = false) {
  return useQuery({
    queryKey: ['league-tab', leagueId],
    queryFn: () => fetchLeagueTabData(leagueId!),
    enabled: !!leagueId,
    staleTime: 45_000,
    refetchInterval: synced ? SYNCED_REFETCH_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: synced,
  });
}

export function computeLeagueAwards(teams: TeamRow[]) {
  if (!teams.length) return [];
  const byPf = [...teams].sort((a, b) => b.pf - a.pf);
  const byPa = [...teams].sort((a, b) => a.pf - b.pf);
  return [
    { id: 'high', title: 'Points leader', value: byPf[0]?.name ?? '—', detail: `${byPf[0]?.pf.toFixed(1) ?? 0} PF` },
    { id: 'low', title: 'Lowest PF', value: byPa[0]?.name ?? '—', detail: `${byPa[0]?.pf.toFixed(1) ?? 0} PF` },
    { id: 'best', title: 'Best record', value: byPf.find((t) => t.rank === 1)?.name ?? byPf[0]?.name ?? '—', detail: `${teams[0]?.wins ?? 0}-${teams[0]?.losses ?? 0}` },
  ];
}
