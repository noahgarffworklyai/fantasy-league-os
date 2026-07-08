import { fetchNflState, resolveStatsSeason } from './sleeper-projections-api';

const STATS_BASE = 'https://api.sleeper.com/stats/nfl';

type SleeperStatRow = {
  player_id: string;
  stats?: {
    pos_rank_ppr?: number;
    pos_rank_half_ppr?: number;
    pos_rank_std?: number;
  };
  player?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
  };
};

export type PlayerRankInfo = {
  posRank: number;
  position?: string;
};

export type PlayerDirectoryEntry = {
  name: string;
  pos: string;
  team: string;
};

async function fetchSeasonStatRows(season: number | string): Promise<SleeperStatRow[]> {
  const params = new URLSearchParams({ season_type: 'regular', order_by: 'pts_ppr' });
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) {
    params.append('position[]', pos);
  }

  const res = await fetch(`${STATS_BASE}/${season}?${params.toString()}`);
  if (!res.ok) throw new Error(`Sleeper stats error: ${res.status}`);
  return (await res.json()) as SleeperStatRow[];
}

export async function fetchSeasonPlayerRanks(
  season: number | string,
): Promise<Map<string, PlayerRankInfo>> {
  const rows = await fetchSeasonStatRows(season);
  const map = new Map<string, PlayerRankInfo>();

  for (const row of rows ?? []) {
    const posRank =
      row.stats?.pos_rank_ppr ?? row.stats?.pos_rank_half_ppr ?? row.stats?.pos_rank_std;
    if (row.player_id == null || posRank == null || posRank <= 0) continue;
    map.set(String(row.player_id), {
      posRank,
      position: row.player?.position,
    });
  }

  return map;
}

export async function fetchSeasonPlayerDirectory(
  season: number | string,
): Promise<Map<string, PlayerDirectoryEntry>> {
  const rows = await fetchSeasonStatRows(season);
  const map = new Map<string, PlayerDirectoryEntry>();

  for (const row of rows ?? []) {
    if (!row.player_id || !row.player) continue;
    const first = row.player.first_name ?? '';
    const last = row.player.last_name ?? '';
    const name = `${first} ${last}`.trim() || `Player ${row.player_id}`;
    const pos = normalizeTradePos(row.player.position ?? '—');
    map.set(String(row.player_id), {
      name,
      pos,
      team: row.player.team ?? 'FA',
    });
  }

  return map;
}

export async function loadCurrentSeasonPlayerRanks(): Promise<Map<string, PlayerRankInfo>> {
  const state = await fetchNflState();
  const season = resolveStatsSeason(state);
  return fetchSeasonPlayerRanks(season);
}

export function normalizeTradePos(position: string): string {
  if (position === 'DST') return 'DEF';
  return position;
}

export function formatPosRankLabel(pos: string, posRank?: number | null): string {
  const label = normalizeTradePos(pos);
  if (!posRank || posRank <= 0) return `${label} —`;
  return `${label} ${posRank}`;
}

export function rankTradeValue(posRank?: number | null): number {
  if (!posRank || posRank <= 0) return 0;
  return Math.max(0, Math.min(100, 101 - posRank));
}
