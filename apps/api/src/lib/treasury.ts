import { PAYOUT_TEMPLATES } from '@flos/shared';

export function getPayoutSplits(template: string): number[] {
  const entry = PAYOUT_TEMPLATES[template as keyof typeof PAYOUT_TEMPLATES];
  return entry ? [...entry.splits] : [...PAYOUT_TEMPLATES.standard.splits];
}

export function computePayoutPreview(
  potCents: number,
  template: string,
): Array<{ place: number; percent: number; amountCents: number }> {
  const splits = getPayoutSplits(template);
  return splits.map((percent, index) => ({
    place: index + 1,
    percent,
    amountCents: Math.floor((potCents * percent) / 100),
  }));
}

export function computePotFromLedger(entries: Array<{ type: string; amountCents: number }>): number {
  return entries.reduce((sum, e) => {
    if (e.type === 'buy_in') return sum + e.amountCents;
    if (e.type === 'payout') return sum - e.amountCents;
    if (e.type === 'side_pot') return sum + e.amountCents;
    if (e.type === 'weekly_prize') return sum - e.amountCents;
    if (e.type === 'adjustment') return sum + e.amountCents;
    return sum;
  }, 0);
}
