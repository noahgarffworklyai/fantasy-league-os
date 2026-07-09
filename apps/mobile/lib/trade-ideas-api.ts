import { useQuery } from '@tanstack/react-query';
import { sleeperPlayerImageUrl } from '@flos/shared';
import { tradeIdeas, type TradeIdea, type TradeIdeaPlayer } from './ai-intelligence';
import { fetchLeagueMates, type LeagueMate } from './league-mates-api';
import {
  fetchSeasonPlayerRanks,
  formatPosRankLabel,
  rankTradeValue,
} from './sleeper-player-ranks';
import { fetchNflState, resolveStatsSeason } from './sleeper-projections-api';

export type EnrichedTradeIdeaPlayer = TradeIdeaPlayer & {
  imageUrl: string;
};

export type EnrichedTradeIdeaManager = {
  id: string;
  userId: string;
  username: string;
  name: string;
  team: string;
  avatarUrl?: string;
};

export type EnrichedTradeIdea = Omit<TradeIdea, 'give' | 'receive' | 'mateIndex'> & {
  manager: EnrichedTradeIdeaManager;
  give: EnrichedTradeIdeaPlayer[];
  receive: EnrichedTradeIdeaPlayer[];
};

const FALLBACK_MANAGERS: EnrichedTradeIdeaManager[] = [
  { id: 'm1', userId: 'm1', username: 'marcushill', name: 'Marcus Hill', team: 'Steel Curtain' },
  { id: 'm2', userId: 'm2', username: 'jennapark', name: 'Jenna Park', team: 'Park Place' },
  { id: 'm3', userId: 'm3', username: 'devonreed', name: 'Devon Reed', team: 'Reed Between' },
  { id: 'm4', userId: 'm4', username: 'priyashah', name: 'Priya Shah', team: 'Shah Bros' },
];

function enrichPlayer(
  player: TradeIdeaPlayer,
  ranks: Map<string, { posRank: number; position?: string }>,
): EnrichedTradeIdeaPlayer {
  const rankInfo = ranks.get(player.id);
  const posRank = rankInfo?.posRank ?? 0;
  const pos = player.pos || rankInfo?.position || '—';
  return {
    ...player,
    pos,
    imageUrl: sleeperPlayerImageUrl(player.id),
    posRankLabel: formatPosRankLabel(pos, posRank),
    tradeValue: posRank > 0 ? rankTradeValue(posRank) : player.tradeValue,
  };
}

function resolveManager(mates: LeagueMate[], mateIndex: number): EnrichedTradeIdeaManager {
  if (mates.length > 0) {
    const mate = mates[mateIndex % mates.length];
    return {
      id: mate.id,
      userId: mate.userId,
      username: mate.username,
      name: mate.name,
      team: mate.team,
      avatarUrl: mate.avatarUrl,
    };
  }
  const fallback = FALLBACK_MANAGERS[mateIndex % FALLBACK_MANAGERS.length];
  return { ...fallback };
}

export function useEnrichedTradeIdeas(leagueId: string | undefined, isSynced: boolean) {
  return useQuery({
    queryKey: ['trade-ideas-enriched', leagueId, isSynced],
    queryFn: async (): Promise<EnrichedTradeIdea[]> => {
      const [state, mates] = await Promise.all([
        fetchNflState(),
        leagueId ? fetchLeagueMates(leagueId, isSynced) : Promise.resolve([] as LeagueMate[]),
      ]);
      const season = resolveStatsSeason(state);
      const ranks = await fetchSeasonPlayerRanks(season);

      return tradeIdeas.map((idea) => ({
        ...idea,
        manager: resolveManager(mates, idea.mateIndex),
        give: idea.give.map((p) => enrichPlayer(p, ranks)),
        receive: idea.receive.map((p) => enrichPlayer(p, ranks)),
      }));
    },
    enabled: !!leagueId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: isSynced,
  });
}
