import type { PlayerWeekLog } from './player-sleeper-stats';
import type { SleeperPlayerProfile } from './sleeper-player-profile';
import { formatPracticeStatus, mapInjuryStatus } from './sleeper-player-profile';

export type PlayerInsights = {
  paragraphs: string[];
  bullets: string[];
};

function recentAvg(logs: PlayerWeekLog[], count = 3): number | null {
  if (logs.length === 0) return null;
  const slice = logs.slice(-count);
  return slice.reduce((sum, row) => sum + row.pts, 0) / slice.length;
}

function volumeTrend(logs: PlayerWeekLog[]): 'up' | 'down' | 'flat' | null {
  if (logs.length < 4) return null;
  const early = logs.slice(-6, -3);
  const recent = logs.slice(-3);
  if (early.length === 0 || recent.length === 0) return null;

  const earlyTouches = early.reduce((sum, row) => sum + (row.touches ?? 0), 0) / early.length;
  const recentTouches = recent.reduce((sum, row) => sum + (row.touches ?? 0), 0) / recent.length;
  const delta = recentTouches - earlyTouches;
  if (Math.abs(delta) < 1.5) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function targetTrend(logs: PlayerWeekLog[]): 'up' | 'down' | 'flat' | null {
  if (logs.length < 4) return null;
  const early = logs.slice(-6, -3);
  const recent = logs.slice(-3);
  const earlyTgt = early.reduce((sum, row) => sum + (row.recTgt ?? 0), 0) / Math.max(1, early.length);
  const recentTgt = recent.reduce((sum, row) => sum + (row.recTgt ?? 0), 0) / Math.max(1, recent.length);
  const delta = recentTgt - earlyTgt;
  if (Math.abs(delta) < 1) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function matchupNote(pos: string, weekProj: number | null, seasonAvg: number | null): string {
  if (weekProj == null || seasonAvg == null) {
    return `Matchup data is still loading for this ${pos}, but weekly usage and recent scoring will matter more than the opponent name on paper.`;
  }
  const delta = weekProj - seasonAvg;
  if (delta >= 3) {
    return `The matchup sets up above ${pos} averages this week — projection is ${delta.toFixed(1)} points higher than the season-long baseline.`;
  }
  if (delta <= -3) {
    return `This is a tougher draw on paper — the weekly projection sits ${Math.abs(delta).toFixed(1)} points below the season average.`;
  }
  return `The matchup looks neutral relative to season norms — weekly projection is in line with the year-to-date scoring baseline.`;
}

export function buildPlayerCommissionerInsights(input: {
  name: string;
  pos: string;
  team: string;
  avgPpg?: number | null;
  weekProj?: number | null;
  week?: number;
  weekLogs?: PlayerWeekLog[];
  opp?: string;
  profile?: SleeperPlayerProfile | null;
  injuryStatus?: 'ok' | 'q' | 'o';
  note?: string;
}): PlayerInsights {
  const logs = input.weekLogs ?? [];
  const seasonAvg = input.avgPpg ?? null;
  const recent = recentAvg(logs);
  const week = input.week ?? 0;
  const weekProj = input.weekProj ?? null;
  const profileStatus = input.profile ? mapInjuryStatus(input.profile.injury_status) : input.injuryStatus ?? 'ok';
  const paragraphs: string[] = [];
  const bullets: string[] = [];

  if (input.opp && weekProj != null) {
    paragraphs.push(
      `${input.name} projects for ${weekProj.toFixed(1)} PPR points in Week ${week || '—'} against ${input.opp}. ${matchupNote(input.pos, weekProj, seasonAvg)}`,
    );
  } else if (weekProj != null) {
    paragraphs.push(
      `${input.name} is projected for ${weekProj.toFixed(1)} PPR points in Week ${week || '—'}. ${matchupNote(input.pos, weekProj, seasonAvg)}`,
    );
  } else {
    paragraphs.push(
      `${input.name} does not have a live Sleeper projection loaded yet. Check back closer to kickoff — matchup, volume, and recent scoring will drive the weekly call once projections update.`,
    );
  }

  if (seasonAvg != null && recent != null && logs.length >= 3) {
    const delta = recent - seasonAvg;
    const trend =
      Math.abs(delta) < 1.5 ? 'holding steady' : delta > 0 ? 'trending up' : 'cooling off';
    paragraphs.push(
      `Scoring has been ${trend}: ${input.name} is averaging ${recent.toFixed(1)} PPR points over the last three games versus ${seasonAvg.toFixed(1)} for the season. That recent form is the best signal for whether this week clears expectations.`,
    );
    bullets.push(`Last 3 games: ${recent.toFixed(1)} PPG · Season: ${seasonAvg.toFixed(1)} PPG`);
  } else if (seasonAvg != null) {
    paragraphs.push(
      `${input.name} is averaging ${seasonAvg.toFixed(1)} PPR points per game this season across ${logs.length || '—'} logged weeks, which anchors the weekly floor and ceiling.`,
    );
    bullets.push(`Season average: ${seasonAvg.toFixed(1)} PPG`);
  }

  const volTrend = volumeTrend(logs);
  const tgtTrend = targetTrend(logs);
  if (volTrend && logs.length >= 4) {
    const recentLogs = logs.slice(-3);
    const avgTouches = recentLogs.reduce((sum, row) => sum + (row.touches ?? 0), 0) / recentLogs.length;
    const avgTargets = recentLogs.reduce((sum, row) => sum + (row.recTgt ?? 0), 0) / recentLogs.length;
    const volCopy =
      volTrend === 'up'
        ? 'Volume is climbing — recent touches are up versus the prior three-game window.'
        : volTrend === 'down'
          ? 'Volume has dipped — recent touches are down versus the prior three-game window.'
          : 'Volume has been stable week to week.';
    paragraphs.push(
      `${volCopy} Over the last three games, ${input.name} is averaging ${avgTouches.toFixed(1)} touches${input.pos !== 'QB' && input.pos !== 'K' && input.pos !== 'DEF' ? ` and ${avgTargets.toFixed(1)} targets` : ''} per game.`,
    );
    bullets.push(`Recent volume: ${avgTouches.toFixed(1)} touches/game`);
    if (tgtTrend && input.pos !== 'QB' && input.pos !== 'K' && input.pos !== 'DEF') {
      bullets.push(
        `Target trend: ${tgtTrend === 'up' ? 'rising' : tgtTrend === 'down' ? 'falling' : 'steady'} (${avgTargets.toFixed(1)}/gm)`,
      );
    }
  }

  if (logs.length >= 2) {
    const last = logs[logs.length - 1];
    const prev = logs[logs.length - 2];
    const swing = last.pts - prev.pts;
    paragraphs.push(
      `Week ${last.week}${last.opponent ? ` vs ${last.opponent}` : ''} produced ${last.pts.toFixed(1)} points${Math.abs(swing) >= 3 ? `, a ${swing > 0 ? 'bounce' : 'step back'} of ${Math.abs(swing).toFixed(1)} from the prior week` : ''}. That game-to-game volatility is worth weighing against this week's role and matchup.`,
    );
    bullets.push(
      `Latest: W${last.week} ${last.pts.toFixed(1)} pts${last.touches != null ? ` · ${last.touches} touches` : ''}`,
    );
  }

  const injured = profileStatus === 'q' || profileStatus === 'o';
  if (injured) {
    const practice = input.profile
      ? formatPracticeStatus(input.profile.practice_participation, input.profile.practice_description)
      : null;
    paragraphs.push(
      `Injury is part of the equation this week${input.profile?.injury_body_part ? ` (${input.profile.injury_body_part})` : ''}${practice ? ` with ${practice.toLowerCase()} practice participation` : ''}. ${input.note ?? 'Monitor reports before locking lineups — a downgrade would push the projection lower.'}`,
    );
    bullets.push('Injury watch: verify status before kickoff');
  } else if (weekProj != null && seasonAvg != null) {
    const call =
      weekProj >= seasonAvg + 2
        ? 'a start with confidence in most formats'
        : weekProj <= seasonAvg - 2
          ? 'more of a matchup-dependent flex'
          : 'a solid weekly floor play';
    paragraphs.push(
      `Putting it together, ${input.name} profiles as ${call} this week based on live Sleeper scoring, volume, and projection data.`,
    );
  }

  if (weekProj != null) {
    bullets.push(`Week ${week || '—'} projection: ${weekProj.toFixed(1)} PPR pts`);
  }

  return {
    paragraphs: paragraphs.slice(0, 5),
    bullets: bullets.slice(0, 5),
  };
}

/** @deprecated use buildPlayerCommissionerInsights */
export function buildPlayerFantasyOutlook(input: Parameters<typeof buildPlayerCommissionerInsights>[0]) {
  return buildPlayerCommissionerInsights(input);
}

export type PlayerOutlook = PlayerInsights;
