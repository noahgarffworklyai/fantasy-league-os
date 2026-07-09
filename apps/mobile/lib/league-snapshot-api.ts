import type { CanonicalLeague, CanonicalTeam } from '@flos/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export type LeagueDetail = {
  league: {
    id: string;
    name: string;
    buyInCents: number;
    customRules?: string | null;
  };
  membership: { role: string; paid: boolean; teamName?: string | null } | null;
  providerLink: {
    provider: string;
    externalLeagueId?: string;
    syncStatus: string;
    syncError?: string | null;
    lastSyncedAt?: string;
    snapshot: CanonicalLeague | null;
  } | null;
};

export type HomeLeagueStats = {
  week: number;
  teamCount: number;
  rank: number;
  record: string;
  pointsFor: number;
  teamName: string | null;
  matchup: {
    label: string;
    awayName: string;
    homeName: string;
    awayScore: number | null;
    homeScore: number | null;
    status: string;
    isMine: boolean;
  } | null;
  topStandings: Array<{
    rank: number;
    name: string;
    record: string;
    pointsFor: number;
  }>;
  synced: boolean;
  syncStatus: string | null;
  hasSnapshot: boolean;
};

export async function fetchLeagueDetail(leagueId: string): Promise<LeagueDetail> {
  return api.get<LeagueDetail>(`/leagues/${leagueId}`);
}

type ApiStanding = {
  rank: number;
  teamExternalId: string;
  teamName?: string;
  ownerName?: string | null;
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
};

type ApiMatchup = {
  matchupId: string;
  week: number;
  status: string;
  home: { rosterId: string; teamName: string; points: number };
  away: { rosterId: string; teamName: string; points: number };
};

async function buildHostedHomeLeagueStats(
  leagueId: string,
  userDisplayName: string,
  memberTeamName: string | null | undefined,
  currentUserId: string | undefined,
): Promise<HomeLeagueStats> {
  const empty: HomeLeagueStats = {
    week: 1,
    teamCount: 0,
    rank: 0,
    record: '—',
    pointsFor: 0,
    teamName: memberTeamName ?? null,
    matchup: null,
    topStandings: [],
    synced: false,
    syncStatus: null,
    hasSnapshot: false,
  };

  const standingsRes = await api.get<{ standings: ApiStanding[]; currentWeek?: number }>(
    `/leagues/${leagueId}/standings`,
  );
  if (!standingsRes.standings?.length) return empty;

  const week = standingsRes.currentWeek ?? 1;
  const normalizedUser = userDisplayName.trim().toLowerCase();
  const myStanding = standingsRes.standings.find(
    (s) =>
      (currentUserId && s.teamExternalId === currentUserId) ||
      (memberTeamName && s.teamName === memberTeamName) ||
      (normalizedUser && s.ownerName?.trim().toLowerCase() === normalizedUser),
  );

  let matchup: HomeLeagueStats['matchup'] = null;
  try {
    const matchupsRes = await api.get<{ week: number; matchups: ApiMatchup[] }>(
      `/leagues/${leagueId}/matchups?week=${week}`,
    );
    const mine = currentUserId
      ? matchupsRes.matchups?.find(
          (m) => m.home.rosterId === currentUserId || m.away.rosterId === currentUserId,
        )
      : undefined;
    const m = mine ?? matchupsRes.matchups?.[0];
    if (m) {
      matchup = {
        label: mine ? `Week ${week} · Your matchup` : `Week ${week} · League matchup`,
        awayName: m.away.teamName,
        homeName: m.home.teamName,
        awayScore: m.away.points ?? null,
        homeScore: m.home.points ?? null,
        status: m.status,
        isMine: !!mine,
      };
    }
  } catch {
    matchup = null;
  }

  const topStandings = standingsRes.standings.slice(0, 5).map((s) => ({
    rank: s.rank,
    name: s.teamName ?? s.ownerName ?? `Team ${s.teamExternalId}`,
    record: formatRecord(s.wins, s.losses, s.ties ?? 0),
    pointsFor: s.pointsFor,
  }));

  return {
    week,
    teamCount: standingsRes.standings.length,
    rank: myStanding?.rank ?? 0,
    record: myStanding
      ? formatRecord(myStanding.wins, myStanding.losses, myStanding.ties ?? 0)
      : '—',
    pointsFor: myStanding?.pointsFor ?? 0,
    teamName: myStanding?.teamName ?? memberTeamName ?? null,
    matchup,
    topStandings,
    synced: false,
    syncStatus: null,
    hasSnapshot: true,
  };
}

function findMyTeam(
  teams: CanonicalTeam[],
  userDisplayName: string,
  memberTeamName?: string | null,
): CanonicalTeam | null {
  if (memberTeamName) {
    const exact = teams.find((t) => t.name === memberTeamName);
    if (exact) return exact;
    const partial = teams.find(
      (t) =>
        t.name.toLowerCase().includes(memberTeamName.toLowerCase()) ||
        memberTeamName.toLowerCase().includes(t.name.toLowerCase()),
    );
    if (partial) return partial;
  }

  const normalizedUser = userDisplayName.trim().toLowerCase();
  if (normalizedUser) {
    const byOwner = teams.find((t) => t.ownerName?.trim().toLowerCase() === normalizedUser);
    if (byOwner) return byOwner;
    const byFirst = teams.find((t) =>
      t.ownerName?.trim().toLowerCase().startsWith(normalizedUser.split(/\s+/)[0] ?? ''),
    );
    if (byFirst) return byFirst;
  }

  return null;
}

export function buildHomeLeagueStats(
  detail: LeagueDetail,
  userDisplayName: string,
  memberTeamName?: string | null,
): HomeLeagueStats {
  const snapshot = detail.providerLink?.snapshot;
  const synced = !!detail.providerLink;
  const empty: HomeLeagueStats = {
    week: 0,
    teamCount: 0,
    rank: 0,
    record: '—',
    pointsFor: 0,
    teamName: memberTeamName ?? null,
    matchup: null,
    topStandings: [],
    synced,
    syncStatus: detail.providerLink?.syncStatus ?? null,
    hasSnapshot: false,
  };

  if (!snapshot?.teams?.length) {
    return empty;
  }

  const teams = snapshot.teams;
  const teamMap = new Map(teams.map((t) => [t.externalTeamId, t]));
  const week = snapshot.currentWeek ?? 1;
  const myTeam = findMyTeam(teams, userDisplayName, memberTeamName ?? detail.membership?.teamName);

  let rank = 0;
  let record = '—';
  let pointsFor = 0;
  const teamName = myTeam?.name ?? memberTeamName ?? null;

  if (myTeam) {
    const standing = snapshot.standings?.find((s) => s.teamExternalId === myTeam.externalTeamId);
    if (standing) {
      rank = standing.rank;
      record = formatRecord(standing.wins, standing.losses, standing.ties);
      pointsFor = standing.pointsFor;
    } else {
      rank = 0;
      record = formatRecord(myTeam.wins, myTeam.losses, myTeam.ties);
      pointsFor = myTeam.pointsFor;
    }
  }

  const weekMatchups = (snapshot.schedule ?? []).filter((m) => m.week === week);
  let matchup: HomeLeagueStats['matchup'] = null;

  if (myTeam) {
    const mine = weekMatchups.find(
      (m) =>
        m.homeTeamExternalId === myTeam.externalTeamId ||
        m.awayTeamExternalId === myTeam.externalTeamId,
    );
    if (mine) {
      const isHome = mine.homeTeamExternalId === myTeam.externalTeamId;
      const oppId = isHome ? mine.awayTeamExternalId : mine.homeTeamExternalId;
      const opp = teamMap.get(oppId);
      matchup = {
        label: `Week ${week} · Your matchup`,
        awayName: isHome ? (myTeam.name ?? 'You') : (opp?.name ?? 'Opponent'),
        homeName: isHome ? (opp?.name ?? 'Opponent') : (myTeam.name ?? 'You'),
        awayScore: isHome ? (mine.homeScore ?? null) : (mine.awayScore ?? null),
        homeScore: isHome ? (mine.awayScore ?? null) : (mine.homeScore ?? null),
        status: mine.status,
        isMine: true,
      };
    }
  }

  if (!matchup && weekMatchups.length > 0) {
    const m = weekMatchups[0];
    const home = teamMap.get(m.homeTeamExternalId);
    const away = teamMap.get(m.awayTeamExternalId);
    matchup = {
      label: `Week ${week} · League matchup`,
      awayName: away?.name ?? 'Away',
      homeName: home?.name ?? 'Home',
      awayScore: m.awayScore ?? null,
      homeScore: m.homeScore ?? null,
      status: m.status,
      isMine: false,
    };
  }

  const topStandings = (snapshot.standings ?? []).slice(0, 5).map((s) => {
    const t = teamMap.get(s.teamExternalId);
    return {
      rank: s.rank,
      name: t?.name ?? `Team ${s.teamExternalId}`,
      record: formatRecord(s.wins, s.losses, s.ties),
      pointsFor: s.pointsFor,
    };
  });

  return {
    week,
    teamCount: teams.length,
    rank,
    record,
    pointsFor,
    teamName,
    matchup,
    topStandings,
    synced,
    syncStatus: detail.providerLink?.syncStatus ?? null,
    hasSnapshot: true,
  };
}

function formatRecord(wins: number, losses: number, ties = 0) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatScore(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return '—';
  return score.toFixed(1);
}

const SYNCED_REFETCH_MS = 90_000;

export function useHomeLeagueStats(
  leagueId: string | undefined,
  userDisplayName: string,
  memberTeamName?: string | null,
  synced = false,
  currentUserId?: string,
) {
  return useQuery({
    queryKey: ['league-detail', leagueId, 'home', memberTeamName ?? '', currentUserId ?? ''],
    queryFn: async () => {
      const detail = await fetchLeagueDetail(leagueId!);
      if (detail.providerLink?.snapshot?.teams?.length) {
        return buildHomeLeagueStats(detail, userDisplayName, memberTeamName);
      }
      return buildHostedHomeLeagueStats(
        leagueId!,
        userDisplayName,
        memberTeamName,
        currentUserId,
      );
    },
    enabled: !!leagueId,
    staleTime: 60_000,
    refetchInterval: synced ? SYNCED_REFETCH_MS : 90_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export { formatScore };
