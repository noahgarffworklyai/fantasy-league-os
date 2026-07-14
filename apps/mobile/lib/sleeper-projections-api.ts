import { fetchWithTimeout } from './fetch-timeout';

const NFL_STATE_URL = 'https://api.sleeper.app/v1/state/nfl';
const PROJECTIONS_BASE = 'https://api.sleeper.com/projections/nfl';

export type NflState = {
  season: string;
  week: number;
  display_week: number;
  season_type: string;
  league_season: string;
  previous_season?: string;
};

type SleeperProjRow = {
  player_id: string;
  stats?: {
    pts_ppr?: number;
    pts_half_ppr?: number;
    pts_std?: number;
  };
};

export async function fetchNflState(): Promise<NflState> {
  const res = await fetchWithTimeout(NFL_STATE_URL);
  if (!res.ok) throw new Error(`Sleeper state error: ${res.status}`);
  return res.json() as Promise<NflState>;
}

/** Weekly projections keyed by Sleeper player id. */
export async function fetchWeekProjections(
  season: number | string,
  week: number,
): Promise<Map<string, number>> {
  const params = new URLSearchParams({ season_type: 'regular', order_by: 'pts_ppr' });
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) {
    params.append('position[]', pos);
  }
  const res = await fetch(`${PROJECTIONS_BASE}/${season}/${week}?${params.toString()}`);
  if (!res.ok) throw new Error(`Sleeper projections error: ${res.status}`);
  const rows = (await res.json()) as SleeperProjRow[];
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    const pts = row.stats?.pts_ppr ?? row.stats?.pts_half_ppr ?? row.stats?.pts_std;
    if (row.player_id != null && pts != null) {
      map.set(String(row.player_id), pts);
    }
  }
  return map;
}

export function resolveProjectionWeek(state: NflState, fallbackWeek = 1): number {
  const display = state.display_week ?? state.week;
  if (display > 0) return display;
  if (state.week > 0) return state.week;
  return fallbackWeek;
}

export function resolveProjectionSeason(state: NflState, fallbackSeason?: string): string {
  if (state.season_type === 'regular' && state.season) return state.season;
  if (state.league_season) return state.league_season;
  if (state.season) return state.season;
  return fallbackSeason ?? String(new Date().getFullYear());
}

export function resolveStatsSeason(state: NflState, fallbackSeason?: string): string {
  if (state.season_type === 'regular' && state.season) return state.season;
  if (state.previous_season) return state.previous_season;
  if (state.league_season) return String(Number(state.league_season) - 1);
  return fallbackSeason ?? String(new Date().getFullYear() - 1);
}
