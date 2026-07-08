import {
  fetchNflState,
  fetchWeekProjections,
  resolveProjectionSeason,
  resolveProjectionWeek,
} from './sleeper-projections-api';
import {
  defaultPlayerSeasonKey,
  resolveSeasonFromKey,
  type PlayerSeasonKey,
} from './player-season';
import { fetchSleeperPlayerProfile, resolvePlayerId } from './sleeper-player-profile';

const STATS_BASE = 'https://api.sleeper.com/stats/nfl';

export type PlayerWeekLog = {
  week: number;
  pts: number;
  opponent?: string;
  rec?: number;
  recTgt?: number;
  recYds?: number;
  rushAtt?: number;
  rushYds?: number;
  touches?: number;
};

type SleeperPlayerWeekRow = {
  week?: number;
  team?: string;
  opponent?: string;
  stats?: {
    pts_ppr?: number;
    pts_half_ppr?: number;
    pts_std?: number;
    rec?: number;
    rec_tgt?: number;
    rec_yd?: number;
    rush_att?: number;
    rush_yd?: number;
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

  const raw = (await res.json()) as Record<string, SleeperPlayerWeekRow | null>;
  const logs: PlayerWeekLog[] = [];

  for (const row of Object.values(raw ?? {})) {
    if (!row) continue;
    const pts = row.stats?.pts_ppr ?? row.stats?.pts_half_ppr ?? row.stats?.pts_std;
    if (row.week == null || pts == null) continue;
    const rec = row.stats?.rec ?? 0;
    const rushAtt = row.stats?.rush_att ?? 0;
    logs.push({
      week: row.week,
      pts,
      opponent: row.opponent,
      rec,
      recTgt: row.stats?.rec_tgt,
      recYds: row.stats?.rec_yd,
      rushAtt,
      rushYds: row.stats?.rush_yd,
      touches: rec + rushAtt,
    });
  }

  return logs.sort((a, b) => a.week - b.week);
}

export function computeAvgPpg(logs: PlayerWeekLog[]): number | null {
  if (logs.length === 0) return null;
  const total = logs.reduce((sum, row) => sum + row.pts, 0);
  return total / logs.length;
}

export function computeVolumeAverages(logs: PlayerWeekLog[], count = 3) {
  if (logs.length === 0) return null;
  const slice = logs.slice(-count);
  const touches = slice.reduce((sum, row) => sum + (row.touches ?? 0), 0) / slice.length;
  const targets = slice.reduce((sum, row) => sum + (row.recTgt ?? 0), 0) / slice.length;
  return { touches, targets, games: slice.length };
}

export { resolvePlayerId } from './sleeper-player-profile';

export async function fetchPlayerSleeperSnapshot(
  playerId: string,
  options?: {
    name?: string;
    pos?: string;
    team?: string;
    seasonKey?: PlayerSeasonKey;
    statsSeason?: string;
  },
) {
  const state = await fetchNflState();
  const seasonKey = options?.seasonKey ?? defaultPlayerSeasonKey(state);
  const statsSeason = options?.statsSeason ?? resolveSeasonFromKey(state, seasonKey);
  const currentSeason = resolveSeasonFromKey(state, 'current');
  const projSeason = resolveProjectionSeason(state);
  const week = resolveProjectionWeek(state);
  const isCurrentSeason = statsSeason === currentSeason;

  const [weekLogs, projections, profile] = await Promise.all([
    fetchPlayerWeeklyStats(playerId, statsSeason),
    isCurrentSeason ? fetchWeekProjections(projSeason, week) : Promise.resolve(new Map<string, number>()),
    fetchSleeperPlayerProfile(playerId),
  ]);

  return {
    playerId,
    week: isCurrentSeason ? week : null,
    statsSeason,
    projSeason,
    seasonKey,
    weekLogs,
    profile,
    avgPpg: computeAvgPpg(weekLogs),
    weekProj: isCurrentSeason ? projections.get(playerId) ?? null : null,
    volume: computeVolumeAverages(weekLogs),
    team: profile?.team ?? options?.team ?? null,
  };
}

export type PlayerSleeperSnapshot = Awaited<ReturnType<typeof fetchPlayerSleeperSnapshot>>;
