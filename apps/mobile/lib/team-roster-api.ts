import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { PatchHostedRosterInput } from '@flos/shared';

type ApiRosterPlayer = {
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

export type TeamPlayer = {
  id: string;
  name: string;
  pos: string;
  team: string;
  opp?: string;
  proj?: number;
  status?: 'ok' | 'q' | 'o';
  value?: number;
  note?: string;
  seasonPts?: number;
  avg?: number;
  rank?: string;
  ownership?: string;
  imageUrl?: string;
  points?: number;
  slot?: string;
};

export type TeamBenchPlayer = TeamPlayer & { trend: string };

export type MyTeamRoster = {
  rosterId: string;
  teamName: string;
  ownerName: string;
  starterSlots: string[];
  week: number;
  starters: TeamPlayer[];
  bench: TeamBenchPlayer[];
  reserve: TeamPlayer[];
};

function mapInjuryStatus(injuryStatus?: string | null, status?: string): 'ok' | 'q' | 'o' | undefined {
  const injury = injuryStatus?.toLowerCase() ?? '';
  if (injury.includes('out') || injury === 'o' || injury.includes('ir')) return 'o';
  if (injury.includes('doubt') || injury.includes('question') || injury === 'q') return 'q';
  if (status?.toLowerCase() === 'inactive') return 'o';
  return 'ok';
}

function mapPlayer(row: ApiRosterPlayer): TeamPlayer {
  const injury = row.injuryStatus;
  return {
    id: row.id,
    name: row.name,
    pos: row.position,
    team: row.team,
    opp: row.points != null ? `${row.points.toFixed(1)} pts` : undefined,
    proj: undefined,
    status: mapInjuryStatus(injury, row.status),
    note: injury ? injury.replace(/_/g, ' ') : undefined,
    imageUrl: row.imageUrl,
    points: row.points,
    slot: row.slot,
  };
}

type ApiMyRoster = {
  rosterId: string;
  teamName: string;
  ownerName: string;
  rosterPositions: string[];
  week: number;
  starters: ApiRosterPlayer[];
  bench: ApiRosterPlayer[];
  reserve: ApiRosterPlayer[];
};

export async function fetchMyTeamRoster(leagueId: string) {
  return api.get<{ roster: ApiMyRoster; source?: string }>(`/leagues/${leagueId}/my-roster`);
}

export async function patchMyTeamRoster(leagueId: string, body: PatchHostedRosterInput) {
  return api.patch<{ roster: ApiMyRoster; source?: string }>(`/leagues/${leagueId}/my-roster`, body);
}

function mapRosterResponse(res: { roster: ApiMyRoster; source?: string }): MyTeamRoster {
  const { rosterPositions, ...rest } = res.roster;
  return {
    ...rest,
    starterSlots: rosterPositions,
    starters: rest.starters.map(mapPlayer),
    bench: rest.bench.map((p) => ({ ...mapPlayer(p), trend: 'flat' as const })),
    reserve: rest.reserve.map(mapPlayer),
  };
}

const SYNCED_REFETCH_MS = 90_000;

export function useMyTeamRoster(leagueId: string | undefined, isSynced = false) {
  return useQuery({
    queryKey: ['my-roster', leagueId],
    queryFn: async () => {
      const res = await fetchMyTeamRoster(leagueId!);
      return mapRosterResponse(res);
    },
    enabled: !!leagueId,
    staleTime: 60_000,
    refetchInterval: isSynced ? SYNCED_REFETCH_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: isSynced,
  });
}

export function usePatchMyTeamRoster(leagueId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchHostedRosterInput) => patchMyTeamRoster(leagueId!, body),
    onSuccess: (res) => {
      if (!leagueId) return;
      queryClient.setQueryData(['my-roster', leagueId], mapRosterResponse(res));
      queryClient.invalidateQueries({ queryKey: ['player-search', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['player-detail'] });
    },
  });
}

export function useAddPlayerToRoster(leagueId: string | undefined) {
  const mutation = usePatchMyTeamRoster(leagueId);
  return {
    ...mutation,
    addPlayer: (playerId: string) => mutation.mutateAsync({ action: 'add', playerId }),
  };
}
