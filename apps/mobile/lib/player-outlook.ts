import type { PlayerWeekLog } from './player-sleeper-stats';

export type PlayerOutlook = {
  paragraphs: string[];
  bullets: string[];
};

function recentAvg(logs: PlayerWeekLog[], count = 3): number | null {
  if (logs.length === 0) return null;
  const slice = logs.slice(-count);
  return slice.reduce((sum, row) => sum + row.pts, 0) / slice.length;
}

export function buildPlayerFantasyOutlook(input: {
  name: string;
  pos: string;
  team: string;
  avgPpg?: number | null;
  weekProj?: number | null;
  week?: number;
  weekLogs?: PlayerWeekLog[];
  opp?: string;
  injuryStatus?: 'ok' | 'q' | 'o' | 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';
  note?: string;
}): PlayerOutlook {
  const logs = input.weekLogs ?? [];
  const seasonAvg = input.avgPpg ?? null;
  const recent = recentAvg(logs);
  const week = input.week ?? 0;
  const weekProj = input.weekProj ?? null;
  const paragraphs: string[] = [];
  const bullets: string[] = [];

  if (input.opp && weekProj != null) {
    paragraphs.push(
      `${input.name} projects for ${weekProj.toFixed(1)} PPR points in Week ${week || '—'}${input.opp !== '—' ? ` against ${input.opp}` : ''}. Matchup context matters most at ${input.pos} — target volume and red-zone role drive the weekly ceiling.`,
    );
  } else if (weekProj != null) {
    paragraphs.push(
      `${input.name} is projected for ${weekProj.toFixed(1)} PPR points this week. The ${input.pos} role and recent usage will determine whether they clear that number.`,
    );
  } else {
    paragraphs.push(
      `${input.name} does not have a live projection loaded yet. Check back closer to kickoff as Sleeper updates weekly projections.`,
    );
  }

  if (seasonAvg != null && recent != null && logs.length >= 3) {
    const delta = recent - seasonAvg;
    const trend =
      Math.abs(delta) < 1.5
        ? 'holding steady'
        : delta > 0
          ? 'trending up'
          : 'cooling off';
    paragraphs.push(
      `Over the last three games, ${input.name} is averaging ${recent.toFixed(1)} points compared with a ${seasonAvg.toFixed(1)} season average — ${trend} on a points-per-game basis.`,
    );
    bullets.push(`Last 3: ${recent.toFixed(1)} PPG · Season: ${seasonAvg.toFixed(1)} PPG`);
  } else if (seasonAvg != null) {
    paragraphs.push(
      `${input.name} is averaging ${seasonAvg.toFixed(1)} PPR points per game this season, which sets the baseline expectation for weekly lineup decisions.`,
    );
    bullets.push(`Season average: ${seasonAvg.toFixed(1)} PPG`);
  }

  if (logs.length >= 2) {
    const last = logs[logs.length - 1];
    const prev = logs[logs.length - 2];
    const swing = last.pts - prev.pts;
    bullets.push(
      `Week ${last.week}: ${last.pts.toFixed(1)} pts${last.opponent ? ` vs ${last.opponent}` : ''}${Math.abs(swing) >= 3 ? ` (${swing > 0 ? '+' : ''}${swing.toFixed(1)} vs prior week)` : ''}`,
    );
  }

  const injured =
    input.injuryStatus === 'q' ||
    input.injuryStatus === 'o' ||
    input.injuryStatus === 'questionable' ||
    input.injuryStatus === 'doubtful' ||
    input.injuryStatus === 'out' ||
    input.injuryStatus === 'ir';

  if (injured) {
    paragraphs.push(
      `Injury status is a factor this week${input.note ? ` — ${input.note}` : ''}. Monitor practice reports before locking your lineup; a downgrade would push this projection lower.`,
    );
    bullets.push('Injury watch: verify status before kickoff');
  } else if (weekProj != null && seasonAvg != null) {
    const call =
      weekProj >= seasonAvg + 2
        ? 'favorable spot on paper'
        : weekProj <= seasonAvg - 2
          ? 'tougher than usual on paper'
          : 'in line with season norms';
    paragraphs.push(`This week's projection looks ${call} relative to ${input.name}'s season-long baseline.`);
  }

  if (weekProj != null) {
    bullets.push(`Week ${week || '—'} projection: ${weekProj.toFixed(1)} PPR pts`);
  }

  return {
    paragraphs: paragraphs.slice(0, 3),
    bullets: bullets.slice(0, 4),
  };
}
