import { useQuery } from '@tanstack/react-query';
import { buildPlayerFantasyOutlook } from './player-outlook';
import { fetchPlayerSleeperSnapshot } from './player-sleeper-stats';

export function usePlayerSleeperStats(
  playerId: string | undefined,
  context?: {
    name: string;
    pos: string;
    team: string;
    opp?: string;
    status?: 'ok' | 'q' | 'o';
    note?: string;
    fallbackProj?: number;
    fallbackAvg?: number;
  },
) {
  return useQuery({
    queryKey: ['player-sleeper-stats', playerId, context?.name],
    queryFn: async () => {
      if (!playerId) return null;
      const snapshot = await fetchPlayerSleeperSnapshot(playerId);
      const outlook = buildPlayerFantasyOutlook({
        name: context?.name ?? 'Player',
        pos: context?.pos ?? '—',
        team: context?.team ?? '—',
        avgPpg: snapshot.avgPpg,
        weekProj: snapshot.weekProj,
        week: snapshot.week,
        weekLogs: snapshot.weekLogs,
        opp: context?.opp,
        injuryStatus: context?.status,
        note: context?.note,
      });
      return { ...snapshot, outlook };
    },
    enabled: !!playerId,
    staleTime: 5 * 60_000,
    placeholderData: context
      ? {
          week: 0,
          statsSeason: '',
          projSeason: '',
          weekLogs: [],
          avgPpg: context.fallbackAvg ?? null,
          weekProj: context.fallbackProj ?? null,
          outlook: buildPlayerFantasyOutlook({
            name: context.name,
            pos: context.pos,
            team: context.team,
            avgPpg: context.fallbackAvg,
            weekProj: context.fallbackProj,
            opp: context.opp,
            injuryStatus: context.status,
            note: context.note,
          }),
        }
      : undefined,
  });
}
