import { useQuery } from '@tanstack/react-query';
import { sleeperPlayerImageUrl } from '@flos/shared';
import {
  formatPosRankLabel,
  loadCurrentSeasonPlayerRanksShared,
  rankTradeValue,
} from './sleeper-player-ranks';
import { fetchMyTeamRoster } from './team-roster-api';
import { fetchLeagueRosterPools } from './league-rosters-api';

export type TradeAsset = {
  id: string;
  name: string;
  pos: string;
  team: string;
  imageUrl?: string;
  posRank: number;
  posRankLabel: string;
  tradeValue: number;
};

const DEMO_BOARD: Array<{ id: string; name: string; pos: string; team: string }> = [
  { id: '6794', name: 'Justin Jefferson', pos: 'WR', team: 'MIN' },
  { id: '9509', name: 'Bijan Robinson', pos: 'RB', team: 'ATL' },
  { id: '1466', name: 'Travis Kelce', pos: 'TE', team: 'KC' },
  { id: '5846', name: 'DK Metcalf', pos: 'WR', team: 'PIT' },
  { id: '8144', name: 'Chris Olave', pos: 'WR', team: 'NO' },
  { id: '9225', name: 'Tank Bigsby', pos: 'RB', team: 'PHI' },
];

const DEMO_MY_PLAYERS: Array<{ id: string; name: string; pos: string; team: string }> = [
  { id: '1466', name: 'Travis Kelce', pos: 'TE', team: 'KC' },
  { id: '8144', name: 'Chris Olave', pos: 'WR', team: 'NO' },
  { id: '11620', name: 'Rome Odunze', pos: 'WR', team: 'CHI' },
  { id: '8183', name: 'Brock Purdy', pos: 'QB', team: 'SF' },
];

function enrichTradeAsset(
  player: { id: string; name: string; pos: string; team: string; imageUrl?: string },
  ranks: Map<string, { posRank: number }>,
): TradeAsset {
  const posRank = ranks.get(player.id)?.posRank ?? 0;
  return {
    ...player,
    imageUrl: player.imageUrl ?? sleeperPlayerImageUrl(player.id),
    posRank,
    posRankLabel: formatPosRankLabel(player.pos, posRank),
    tradeValue: rankTradeValue(posRank),
  };
}

const DEMO_MANAGER_POOLS: Record<
  string,
  Array<{ id: string; name: string; pos: string; team: string }>
> = {
  m1: [
    { id: '9225', name: 'Tank Bigsby', pos: 'RB', team: 'PHI' },
    { id: '8228', name: 'Jaylen Warren', pos: 'RB', team: 'PIT' },
    { id: '5947', name: 'Jakobi Meyers', pos: 'WR', team: 'JAX' },
  ],
  m2: [
    { id: '5846', name: 'DK Metcalf', pos: 'WR', team: 'PIT' },
    { id: '6804', name: 'Jordan Love', pos: 'QB', team: 'GB' },
    { id: '8134', name: 'Khalil Shakir', pos: 'WR', team: 'BUF' },
  ],
  m3: [
    { id: '1373', name: 'Geno Smith', pos: 'QB', team: 'NYJ' },
    { id: '9508', name: 'Tyjae Spears', pos: 'RB', team: 'TEN' },
    { id: '5947', name: 'Jakobi Meyers', pos: 'WR', team: 'JAX' },
  ],
  m4: [
    { id: '5022', name: 'Dallas Goedert', pos: 'TE', team: 'PHI' },
    { id: '5133', name: 'Tyler Conklin', pos: 'TE', team: 'DET' },
    { id: '8154', name: 'Brian Robinson', pos: 'RB', team: 'ATL' },
  ],
};

function enrichManagerPools(
  ranks: Map<string, { posRank: number }>,
): Record<string, TradeAsset[]> {
  return Object.fromEntries(
    Object.entries(DEMO_MANAGER_POOLS).map(([key, players]) => [
      key,
      players.map((p) => enrichTradeAsset(p, ranks)),
    ]),
  );
}

function buildDemoTradeData() {
  const ranks = new Map<string, { posRank: number }>();
  const board = DEMO_BOARD.map((p) => enrichTradeAsset(p, ranks)).sort(
    (a, b) => a.posRank - b.posRank,
  );
  const myPlayers = DEMO_MY_PLAYERS.map((p) => enrichTradeAsset(p, ranks));
  return { board, myPlayers, managerPools: enrichManagerPools(ranks) };
}

const INITIAL_TRADE_DATA = buildDemoTradeData();

export function useTradePlayers(
  leagueId: string | undefined,
  isSynced: boolean,
  options?: { loadManagerPools?: boolean },
) {
  const loadManagerPools = options?.loadManagerPools ?? false;

  return useQuery({
    queryKey: ['trade-players', leagueId, isSynced, loadManagerPools],
    initialData: INITIAL_TRADE_DATA,
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      let ranks = new Map<string, { posRank: number }>();
      try {
        ranks = await loadCurrentSeasonPlayerRanksShared();
      } catch {
        // Fall back to demo data without live ranks.
      }

      if (loadManagerPools && leagueId) {
        const managerPools = await fetchLeagueRosterPools(leagueId, isSynced, undefined).catch(() =>
          enrichManagerPools(ranks),
        );

        if (isSynced && leagueId) {
          try {
            const res = await fetchMyTeamRoster(leagueId);
            const rosterPlayers = [...res.roster.starters, ...res.roster.bench].map((p) => ({
              id: p.id,
              name: p.name,
              pos: p.position,
              team: p.team,
              imageUrl: p.imageUrl,
            }));

            const myPlayers = rosterPlayers.map((p) => enrichTradeAsset(p, ranks));
            const board = [...myPlayers].sort((a, b) => {
              if (a.posRank <= 0 && b.posRank <= 0) return a.name.localeCompare(b.name);
              if (a.posRank <= 0) return 1;
              if (b.posRank <= 0) return -1;
              return a.posRank - b.posRank;
            });

            return { board, myPlayers, managerPools };
          } catch {
            // Fall through to demo data with live ranks.
          }
        }

        const board = DEMO_BOARD.map((p) => enrichTradeAsset(p, ranks)).sort(
          (a, b) => a.posRank - b.posRank,
        );
        const myPlayers = DEMO_MY_PLAYERS.map((p) => enrichTradeAsset(p, ranks));
        return { board, myPlayers, managerPools };
      }

      if (isSynced && leagueId) {
        try {
          const res = await fetchMyTeamRoster(leagueId);
          const rosterPlayers = [...res.roster.starters, ...res.roster.bench].map((p) => ({
            id: p.id,
            name: p.name,
            pos: p.position,
            team: p.team,
            imageUrl: p.imageUrl,
          }));

          const myPlayers = rosterPlayers.map((p) => enrichTradeAsset(p, ranks));
          const board = [...myPlayers].sort((a, b) => {
            if (a.posRank <= 0 && b.posRank <= 0) return a.name.localeCompare(b.name);
            if (a.posRank <= 0) return 1;
            if (b.posRank <= 0) return -1;
            return a.posRank - b.posRank;
          });

          return { board, myPlayers, managerPools: enrichManagerPools(ranks) };
        } catch {
          // Fall through to demo data with live ranks.
        }
      }

      const board = DEMO_BOARD.map((p) => enrichTradeAsset(p, ranks)).sort(
        (a, b) => a.posRank - b.posRank,
      );
      const myPlayers = DEMO_MY_PLAYERS.map((p) => enrichTradeAsset(p, ranks));

      return { board, myPlayers, managerPools: enrichManagerPools(ranks) };
    },
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: isSynced,
  });
}

export async function enrichTradeAssetsWithRanks(
  players: Array<{ id: string; name: string; pos: string; team: string; imageUrl?: string }>,
): Promise<TradeAsset[]> {
  let ranks = new Map<string, { posRank: number }>();
  try {
    ranks = await loadCurrentSeasonPlayerRanksShared();
  } catch {
    // Return assets without live ranks.
  }
  return players.map((p) => enrichTradeAsset(p, ranks));
}
