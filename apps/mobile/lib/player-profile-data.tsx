import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildPlayerHealthSnapshot } from './player-health';
import { buildPlayerCommissionerInsights } from './player-outlook';
import {
  defaultPlayerSeasonKey,
  getPlayerSeasonOptions,
  type PlayerSeasonKey,
  type PlayerSeasonOption,
} from './player-season';
import { fetchNflState } from './sleeper-projections-api';
import { fetchPlayerSleeperSnapshot, resolvePlayerId } from './player-sleeper-stats';

export type PlayerSleeperContextInput = {
  name: string;
  pos: string;
  team: string;
  opp?: string;
  status?: 'ok' | 'q' | 'o';
  note?: string;
};

type PlayerProfileDataValue = {
  playerId?: string;
  seasonKey: PlayerSeasonKey;
  setSeasonKey: (key: PlayerSeasonKey) => void;
  seasonOptions: PlayerSeasonOption[];
  data: Awaited<ReturnType<typeof fetchPlayerSleeperSnapshot>> & {
    resolvedId: string;
    insights: ReturnType<typeof buildPlayerCommissionerInsights>;
    health: ReturnType<typeof buildPlayerHealthSnapshot>;
    outlook: ReturnType<typeof buildPlayerCommissionerInsights>;
  } | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
};

const PlayerProfileDataContext = createContext<PlayerProfileDataValue | null>(null);

export function PlayerProfileDataProvider({
  playerId,
  context,
  children,
}: {
  playerId?: string;
  context?: PlayerSleeperContextInput;
  children: ReactNode;
}) {
  const [seasonKey, setSeasonKey] = useState<PlayerSeasonKey>('current');
  const [seasonOptions, setSeasonOptions] = useState<PlayerSeasonOption[]>([]);
  const [defaultedSeason, setDefaultedSeason] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNflState()
      .then((state) => {
        if (cancelled) return;
        const options = getPlayerSeasonOptions(state);
        setSeasonOptions(options);
        if (!defaultedSeason) {
          setSeasonKey(defaultPlayerSeasonKey(state));
          setDefaultedSeason(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const year = String(new Date().getFullYear());
        setSeasonOptions([
          { key: 'current', label: year, season: year },
          { key: 'previous', label: String(Number(year) - 1), season: String(Number(year) - 1) },
        ]);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultedSeason]);

  const query = useQuery({
    queryKey: [
      'player-sleeper-stats',
      playerId,
      context?.name,
      context?.pos,
      context?.team,
      seasonKey,
    ],
    queryFn: async () => {
      const resolvedId = await resolvePlayerId(playerId, context?.name, context?.pos, context?.team);
      if (!resolvedId) {
        throw new Error('Could not resolve Sleeper player id');
      }

      const snapshot = await fetchPlayerSleeperSnapshot(resolvedId, {
        name: context?.name,
        pos: context?.pos,
        team: context?.team,
        seasonKey,
      });

      const insights = buildPlayerCommissionerInsights({
        name: context?.name ?? 'Player',
        pos: context?.pos ?? '—',
        team: context?.team ?? '—',
        avgPpg: snapshot.avgPpg,
        weekProj: snapshot.weekProj,
        week: snapshot.week ?? undefined,
        weekLogs: snapshot.weekLogs,
        opp: context?.opp,
        profile: snapshot.profile,
        injuryStatus: context?.status,
        note: context?.note,
      });

      const health = buildPlayerHealthSnapshot(snapshot.profile, {
        name: context?.name,
        status: context?.status,
        note: context?.note,
      });

      return {
        ...snapshot,
        resolvedId,
        insights,
        health,
        outlook: insights,
      };
    },
    enabled: (!!playerId || !!(context?.name && context?.pos)) && seasonOptions.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const value = useMemo<PlayerProfileDataValue>(
    () => ({
      playerId,
      seasonKey,
      setSeasonKey,
      seasonOptions,
      data: query.data ?? null,
      isLoading: query.isLoading,
      isError: query.isError,
      error: (query.error as Error | null) ?? null,
      isFetching: query.isFetching,
    }),
    [playerId, seasonKey, seasonOptions, query.data, query.isLoading, query.isError, query.error, query.isFetching],
  );

  return (
    <PlayerProfileDataContext.Provider value={value}>{children}</PlayerProfileDataContext.Provider>
  );
}

export function usePlayerProfileData() {
  const value = useContext(PlayerProfileDataContext);
  if (!value) {
    throw new Error('usePlayerProfileData must be used within PlayerProfileDataProvider');
  }
  return value;
}
