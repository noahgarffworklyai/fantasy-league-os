import { sleeperPlayerImageUrl } from '@flos/shared';
import {
  formatPosRankLabel,
  loadCurrentSeasonPlayerStats,
  rankTradeValue,
  type PlayerDirectoryEntry,
  type PlayerRankInfo,
} from './sleeper-player-ranks';
import { fetchLeagueDetail } from './league-snapshot-api';
import { fetchMyTeamRoster } from './team-roster-api';
import type { TradeAsset } from './trade-players-api';
import { fetchLeagueMates } from './league-mates-api';
import { fetchWithTimeout } from './fetch-timeout';

const SLEEPER_BASE = 'https://api.sleeper.app/v1';

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players?: string[];
};

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${SLEEPER_BASE}${path}`);
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

function toTradeAsset(
  playerId: string,
  directory: Map<string, PlayerDirectoryEntry>,
  ranks: Map<string, PlayerRankInfo>,
): TradeAsset | null {
  const info = directory.get(playerId);
  if (!info) return null;
  const posRank = ranks.get(playerId)?.posRank ?? 0;
  const pos = info.pos || ranks.get(playerId)?.position || '—';
  return {
    id: playerId,
    name: info.name,
    pos,
    team: info.team,
    imageUrl: sleeperPlayerImageUrl(playerId),
    posRank,
    posRankLabel: formatPosRankLabel(pos, posRank),
    tradeValue: rankTradeValue(posRank),
  };
}

const DEMO_POOLS: Record<string, Array<{ id: string; name: string; pos: string; team: string }>> = {
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

function demoPools(
  ranks: Map<string, PlayerRankInfo>,
  mates: Array<{ id: string }>,
): Record<string, TradeAsset[]> {
  const fallbackKeys = Object.keys(DEMO_POOLS);
  const targets = mates.length > 0 ? mates : fallbackKeys.map((id) => ({ id }));
  const pools: Record<string, TradeAsset[]> = {};

  targets.forEach((mate, i) => {
    const demoKey = mates.length > 0 ? fallbackKeys[i % fallbackKeys.length] : mate.id;
    const players = DEMO_POOLS[demoKey] ?? [];
    pools[mate.id] = players.map((p) => {
      const posRank = ranks.get(p.id)?.posRank ?? 0;
      return {
        ...p,
        imageUrl: sleeperPlayerImageUrl(p.id),
        posRank,
        posRankLabel: formatPosRankLabel(p.pos, posRank),
        tradeValue: rankTradeValue(posRank),
      };
    });
  });

  return pools;
}

export async function fetchLeagueRosterPools(
  leagueId: string,
  isSynced: boolean,
  preloaded?: {
    ranks: Map<string, PlayerRankInfo>;
    directory: Map<string, PlayerDirectoryEntry>;
  },
): Promise<Record<string, TradeAsset[]>> {
  const mates = await fetchLeagueMates(leagueId, isSynced).catch(() => [] as Awaited<ReturnType<typeof fetchLeagueMates>>);

  let ranks = preloaded?.ranks ?? new Map<string, PlayerRankInfo>();
  let directory = preloaded?.directory ?? new Map<string, PlayerDirectoryEntry>();
  if (!preloaded) {
    try {
      const stats = await loadCurrentSeasonPlayerStats();
      ranks = stats.ranks;
      directory = stats.directory;
    } catch {
      return demoPools(ranks, mates);
    }
  }

  const detail = await fetchLeagueDetail(leagueId);
  const externalId = detail.providerLink?.externalLeagueId;
  const provider = detail.providerLink?.provider?.toLowerCase();

  if (!externalId || provider !== 'sleeper') {
    return demoPools(ranks, mates);
  }

  let excludeRosterId: string | undefined;
  try {
    const mine = await fetchMyTeamRoster(leagueId);
    excludeRosterId = mine.roster.rosterId;
  } catch {
    // Hosted leagues may not have a roster id.
  }

  try {
    const rosters = await sleeperFetch<SleeperRoster[]>(`/league/${externalId}/rosters`);
    const pools: Record<string, TradeAsset[]> = {};

    for (const roster of rosters ?? []) {
      const rosterId = String(roster.roster_id);
      if (rosterId === excludeRosterId) continue;
      const players = (roster.players ?? [])
        .map((id) => toTradeAsset(String(id), directory, ranks))
        .filter((p): p is TradeAsset => p != null)
        .sort((a, b) => {
          if (a.posRank <= 0 && b.posRank <= 0) return a.name.localeCompare(b.name);
          if (a.posRank <= 0) return 1;
          if (b.posRank <= 0) return -1;
          return a.posRank - b.posRank;
        });
      if (players.length > 0) pools[rosterId] = players;
    }

    if (Object.keys(pools).length > 0) return pools;
  } catch {
    // Fall through to demo pools keyed by mate roster ids.
  }

  return demoPools(ranks, mates);
}
