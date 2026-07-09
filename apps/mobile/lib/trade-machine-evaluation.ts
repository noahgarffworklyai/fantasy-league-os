import type { TradeAsset } from './trade-players-api';

const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;

export type TradeMachineVerdict =
  | 'strong_win'
  | 'slight_win'
  | 'fair'
  | 'slight_lose'
  | 'strong_lose';

export type TradeMachineEvaluation = {
  score: number;
  verdict: TradeMachineVerdict;
  verdictLabel: string;
  valueDelta: number;
  giveTotal: number;
  receiveTotal: number;
  needsImpact: number;
  paragraphs: string[];
  bullets: string[];
};

function sumTradeValue(players: TradeAsset[]) {
  return players.reduce((sum, p) => sum + (p.tradeValue > 0 ? p.tradeValue : 0), 0);
}

function avgPosRank(players: TradeAsset[]) {
  const ranked = players.filter((p) => p.posRank > 0);
  if (!ranked.length) return 99;
  return ranked.reduce((sum, p) => sum + p.posRank, 0) / ranked.length;
}

function bestPosRank(players: TradeAsset[]) {
  const ranked = players.map((p) => p.posRank).filter((r) => r > 0);
  return ranked.length ? Math.min(...ranked) : 99;
}

function verdictFromScore(score: number): { verdict: TradeMachineVerdict; label: string } {
  if (score >= 35) return { verdict: 'strong_win', label: 'You win' };
  if (score >= 12) return { verdict: 'slight_win', label: 'Slight edge' };
  if (score > -12) return { verdict: 'fair', label: 'Fair trade' };
  if (score > -35) return { verdict: 'slight_lose', label: 'Slight loss' };
  return { verdict: 'strong_lose', label: 'You lose' };
}

function computeNeedsImpact(myRoster: TradeAsset[], give: TradeAsset[], receive: TradeAsset[]) {
  let impact = 0;

  for (const pos of CORE_POSITIONS) {
    const before = myRoster.filter((p) => p.pos === pos);
    const afterGive = before.filter((p) => !give.some((g) => g.id === p.id));
    const after = [...afterGive, ...receive.filter((p) => p.pos === pos)];

    const beforeAvg = avgPosRank(before);
    const afterAvg = avgPosRank(after);
    impact += beforeAvg - afterAvg;

    if (afterGive.length === 0 && before.length > 0 && receive.every((p) => p.pos !== pos)) {
      impact -= 8;
    }
    if (before.length === 0 && after.length > 0) {
      impact += 6;
    }
  }

  return impact;
}

function buildInsights(input: {
  score: number;
  verdictLabel: string;
  valueDelta: number;
  give: TradeAsset[];
  receive: TradeAsset[];
  myRoster: TradeAsset[];
  needsImpact: number;
}): { paragraphs: string[]; bullets: string[] } {
  const { score, verdictLabel, valueDelta, give, receive, myRoster, needsImpact } = input;

  if (give.length === 0 && receive.length === 0) {
    return {
      paragraphs: [
        'Build a hypothetical trade to see how value and roster needs shift the outcome. Select players you would send, then add targets you want back.',
      ],
      bullets: [
        'The scale weighs raw trade value against positional upgrades on your roster.',
        'A deal can look even on paper but still help if it fixes a weak spot.',
      ],
    };
  }

  const giveNames = give.map((p) => p.name).join(', ') || 'nobody';
  const receiveNames = receive.map((p) => p.name).join(', ') || 'nobody';
  const valueLine =
    valueDelta > 0
      ? `You gain ${valueDelta} points of trade value on paper.`
      : valueDelta < 0
        ? `You surrender ${Math.abs(valueDelta)} points of trade value on paper.`
        : 'Trade value is essentially even on paper.';

  const needsLine =
    needsImpact > 4
      ? 'Roster fit tilts this toward your side — you shore up positions that were thin.'
      : needsImpact < -4
        ? 'Roster fit works against you — this deal leaves a positional hole or weakens depth.'
        : 'Roster fit is mostly neutral — starters and depth stay balanced by position.';

  const paragraphs = [
    `This deal grades as "${verdictLabel}" with a score of ${score > 0 ? '+' : ''}${score}. ${valueLine} ${needsLine}`,
    score >= 12
      ? `Shipping ${giveNames} for ${receiveNames} improves your competitive window if the added starters stay healthy through the playoff stretch.`
      : score <= -12
        ? `Giving up ${giveNames} for ${receiveNames} costs more projected value than it returns — consider asking for a sweetener or a different target.`
        : `${giveNames} for ${receiveNames} is workable, but small changes to either side could swing the outcome.`,
  ];

  const bullets: string[] = [];
  if (valueDelta !== 0) {
    bullets.push(
      valueDelta > 0
        ? `Value edge: +${valueDelta} trade score in your favor.`
        : `Value drag: ${valueDelta} trade score against you.`,
    );
  }
  if (needsImpact > 2) {
    bullets.push('Team needs: upgrades a position group that was below league average.');
  } else if (needsImpact < -2) {
    bullets.push('Team needs: creates a depth concern at a position you rely on weekly.');
  } else {
    bullets.push('Team needs: positional balance stays largely unchanged.');
  }

  const giveBest = bestPosRank(give);
  const receiveBest = bestPosRank(receive);
  if (giveBest < 99 && receiveBest < 99 && giveBest < receiveBest - 8) {
    bullets.push('Star power: you are moving the better fantasy asset in this deal.');
  } else if (giveBest < 99 && receiveBest < 99 && receiveBest < giveBest - 8) {
    bullets.push('Star power: you are acquiring the higher-ranked player in the swap.');
  }

  const thinAfter = CORE_POSITIONS.filter((pos) => {
    const remaining = myRoster.filter((p) => p.pos === pos && !give.some((g) => g.id === p.id));
    return remaining.length <= 1 && give.some((g) => g.pos === pos);
  });
  if (thinAfter.length) {
    bullets.push(`Watch ${thinAfter.join('/')} depth after this trade — you are thin at ${thinAfter.join(', ')}.`);
  }

  return { paragraphs, bullets };
}

export function evaluateTradeMachine(input: {
  give: TradeAsset[];
  receive: TradeAsset[];
  myRoster: TradeAsset[];
}): TradeMachineEvaluation {
  const { give, receive, myRoster } = input;
  const giveTotal = sumTradeValue(give);
  const receiveTotal = sumTradeValue(receive);
  const valueDelta = receiveTotal - giveTotal;
  const needsImpact = computeNeedsImpact(myRoster, give, receive);

  const valueScore = Math.max(-48, Math.min(48, valueDelta * 0.38));
  const needsScore = Math.max(-32, Math.min(32, needsImpact * 2.2));

  const giveBest = bestPosRank(give);
  const receiveBest = bestPosRank(receive);
  let starScore = 0;
  if (giveBest < 99 && receiveBest < 99) {
    starScore = Math.max(-12, Math.min(12, (receiveBest - giveBest) * 0.35));
  }

  const score = Math.round(Math.max(-100, Math.min(100, valueScore + needsScore + starScore)));
  const { verdict, label: verdictLabel } = verdictFromScore(score);
  const { paragraphs, bullets } = buildInsights({
    score,
    verdictLabel,
    valueDelta,
    give,
    receive,
    myRoster,
    needsImpact,
  });

  return {
    score,
    verdict,
    verdictLabel,
    valueDelta,
    giveTotal,
    receiveTotal,
    needsImpact,
    paragraphs,
    bullets,
  };
}
