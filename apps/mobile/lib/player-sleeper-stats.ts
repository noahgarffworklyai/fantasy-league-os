import {
  fetchNflState,
  fetchWeekProjections,
  resolveProjectionSeason,
  resolveProjectionWeek,
  resolveStatsSeason,
} from './sleeper-projections-api';

const STATS_BASE = 'https://api.sleeper.com/stats/nfl';

export type PlayerWeekLog = {
  week: number;
  pts: number;
  opponent?: string;
};

type SleeperPlayerWeekRow = {
  week?: number;
  team?: string;
  opponent?: string;
  stats?: {
    pts_ppr?: number;
    pts_half_ppr?: number;
    pts_std?: number;
    gms_active?: number;
  };
};

export async function fetchPlayerWeeklyStats(
  playerId: string,
  season: number | string,
): Promise<PlayerWeekLog[]> {
  const params = new URLSearchParams({
    season_type: 'regular',
    season: String(season),
    grouping: 'week',
  });
  const res = await fetch(`${STATS_BASE}/player/${playerId}?${params.toString()}`);
  if (!res.ok) throw new Error(`Sleeper player stats error: ${res.status}`);

  const raw = (await res.json()) as Record<string, SleeperPlayerWeekRow>;
  const logs: PlayerWeekLog[] = [];

  for (const row of Object.values(raw ?? {})) {
    const pts = row.stats?.pts_ppr ?? row.stats?.pts_half_ppr ?? row.stats?.pts_std;
    if (row.week == null || pts == null) continue;
    logs.push({
      week: row.week,
      pts,
      opponent: row.opponent,
    });
  }

  return logs.sort((a, b) => a.week - b.week);
}

export function computeAvgPpg(logs: PlayerWeekLog[]): number | null {
  if (logs.length === 0) return null;
  const total = logs.reduce((sum, row) => sum + row.pts, 0);
  return total / logs.length;
}

export async function fetchPlayerSleeperSnapshot(playerId: string) {
  const state = await fetchNflState();
  const statsSeason = resolveStatsSeason(state);
  const projSeason = resolveProjectionSeason(state);
  const week = resolveProjectionWeek(state);

  const [weekLogs, projections] = await Promise.all([
    fetchPlayerWeeklyStats(playerId, statsSeason),
    fetchWeekProjections(projSeason, week),
  ]);

  return {
    week,
    statsSeason,
    projSeason,
    weekLogs,
    avgPpg: computeAvgPpg(weekLogs),
    weekProj: projections.get(playerId) ?? null,
  };
}
