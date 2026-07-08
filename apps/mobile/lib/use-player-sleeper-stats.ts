import { useQuery } from '@tanstack/react-query';
import { fetchPlayerSleeperSnapshot, resolvePlayerId } from './player-sleeper-stats';
import type { PlayerSeasonKey } from './player-season';

export type { PlayerSleeperContextInput } from './player-profile-data';
export { PlayerProfileDataProvider, usePlayerProfileData } from './player-profile-data';

export function usePlayerSleeperStats(
  playerId: string | undefined,
  context?: {
    name: string;
    pos: string;
    team: string;
    opp?: string;
    status?: 'ok' | 'q' | 'o';
    note?: string;
    seasonKey?: PlayerSeasonKey;
    fallbackProj?: number;
    fallbackAvg?: number;
  },
) {
  const seasonKey = context?.seasonKey ?? 'current';
  return useQuery({
    queryKey: [
      'player-sleeper-stats-lite',
      playerId,
      context?.name,
      context?.pos,
      context?.team,
      seasonKey,
    ],
    queryFn: async () => {
      const resolvedId = await resolvePlayerId(playerId, context?.name, context?.pos, context?.team);
      if (!resolvedId) throw new Error('Could not resolve Sleeper player id');
      return fetchPlayerSleeperSnapshot(resolvedId, {
        name: context?.name,
        pos: context?.pos,
        team: context?.team,
        seasonKey,
      });
    },
    enabled: !!playerId || !!(context?.name && context?.pos),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
