import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from './api';

export type ApiPlayerSearchRow = {
  id: string;
  name: string;
  position: string;
  team: string;
  status?: string;
  injuryStatus?: string | null;
  ownership: number;
  available: number;
  added?: number;
  dropped?: number;
  trend: number;
  owned: boolean;
  onMyRoster?: boolean;
  imageUrl?: string;
};

export type ApiPlayerDetail = {
  id: string;
  name: string;
  position: string;
  team: string;
  status: string;
  injuryStatus: string | null;
  number: number | null;
  age: number | null;
  yearsExp: number | null;
  fantasyPositions: string[];
  owned?: boolean;
  onMyRoster?: boolean;
  ownership?: number;
  available?: number;
  imageUrl?: string;
};

export type PlayerTab = 'all' | 'available' | 'injured' | 'watchlist' | 'pool';

export async function fetchPlayerSearch(
  leagueId: string,
  input: { search?: string; position?: string; tab?: Exclude<PlayerTab, 'watchlist'>; limit?: number },
) {
  const params = new URLSearchParams();
  if (input.search) params.set('search', input.search);
  if (input.position && input.position !== 'All') params.set('position', input.position);
  if (input.tab) params.set('tab', input.tab);
  if (input.limit) params.set('limit', String(input.limit));
  const qs = params.toString();
  return api.get<{ players: ApiPlayerSearchRow[]; source?: string }>(
    `/leagues/${leagueId}/player-search${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchPlayerDetail(playerId: string, leagueId?: string) {
  const qs = leagueId ? `?leagueId=${encodeURIComponent(leagueId)}` : '';
  return api.get<{ player: ApiPlayerDetail }>(`/players/${playerId}${qs}`);
}

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function usePlayerSearch(
  leagueId: string | undefined,
  input: { search: string; position: string; tab: PlayerTab },
  options?: { enabled?: boolean },
) {
  const debouncedSearch = useDebouncedValue(input.search.trim(), 300);
  const apiTab = input.tab === 'watchlist' ? undefined : input.tab;

  return useQuery({
    queryKey: ['player-search', leagueId, debouncedSearch, input.position, apiTab],
    queryFn: () =>
      fetchPlayerSearch(leagueId!, {
        search: debouncedSearch || undefined,
        position: input.position,
        tab: apiTab === 'pool' ? 'pool' : debouncedSearch ? undefined : apiTab,
        limit: apiTab === 'pool' ? undefined : debouncedSearch ? 100 : 40,
      }),
    enabled: (options?.enabled ?? true) && !!leagueId && input.tab !== 'watchlist',
    staleTime: 60_000,
  });
}

export function useWatchlistPlayers(leagueId: string | undefined, playerIds: string[]) {
  const queries = useQueries({
    queries: playerIds.map((id) => ({
      queryKey: ['player', id, leagueId],
      queryFn: () => fetchPlayerDetail(id, leagueId),
      enabled: !!id,
      staleTime: 5 * 60_000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const players = queries
    .map((q) => q.data?.player)
    .filter((p): p is ApiPlayerDetail => !!p);

  return { players, isLoading };
}

export function usePlayerDetail(playerId: string | undefined, leagueId?: string) {
  return useQuery({
    queryKey: ['player', playerId, leagueId],
    queryFn: () => fetchPlayerDetail(playerId!, leagueId),
    enabled: !!playerId,
    staleTime: 5 * 60_000,
  });
}

export function mapSearchRowToPlayer(row: ApiPlayerSearchRow) {
  return {
    id: row.id,
    name: row.name,
    pos: normalizePos(row.position),
    team: row.team,
    opp: '—',
    bye: 0,
    rank: 0,
    proj: 0,
    trend: row.trend,
    ownership: row.ownership,
    health: mapHealth(row.injuryStatus),
    mine: row.onMyRoster ?? false,
    rostered: row.owned && !row.onMyRoster,
    avail: row.available,
    added: row.added,
    dropped: row.dropped,
    imageUrl: row.imageUrl,
  };
}

export function mapDetailToPlayer(detail: ApiPlayerDetail) {
  return {
    id: detail.id,
    name: detail.name,
    pos: normalizePos(detail.position),
    team: detail.team,
    opp: '—',
    bye: 0,
    rank: 0,
    proj: 0,
    trend: 0,
    ownership: detail.ownership ?? 0,
    health: mapHealth(detail.injuryStatus),
    mine: detail.onMyRoster ?? false,
    rostered: !!detail.owned && !detail.onMyRoster,
    avail: detail.available,
    added: undefined as number | undefined,
    dropped: undefined as number | undefined,
    imageUrl: detail.imageUrl,
  };
}

type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
type Health = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';

function normalizePos(position: string): Pos {
  if (position === 'DST') return 'DEF';
  if (position === 'FB') return 'RB';
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(position)) return position as Pos;
  return 'WR';
}

function mapHealth(injuryStatus?: string | null): Health | undefined {
  if (!injuryStatus) return 'healthy';
  const s = injuryStatus.toLowerCase();
  if (s.includes('out') || s === 'o') return 'out';
  if (s.includes('doubt')) return 'doubtful';
  if (s.includes('question') || s === 'q') return 'questionable';
  if (s.includes('ir')) return 'ir';
  return 'healthy';
}

export function formatAddedMetric(added?: number) {
  if (!added) return '+0';
  if (added >= 1000) return `+${(added / 1000).toFixed(1)}k`;
  return `+${added}`;
}

export function formatDroppedMetric(dropped?: number) {
  if (!dropped) return '-0';
  if (dropped >= 1000) return `-${(dropped / 1000).toFixed(1)}k`;
  return `-${dropped}`;
}

export function formatProj(proj: number) {
  return proj > 0 ? proj.toFixed(1) : '—';
}
