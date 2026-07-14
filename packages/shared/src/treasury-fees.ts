/** Platform processing fee on league buy-ins (5%). */
export const PLATFORM_FEE_RATE = 0.05;

export function computePlatformFeeCents(buyInCents: number): number {
  return Math.round(buyInCents * PLATFORM_FEE_RATE);
}

export function computeCheckoutTotalCents(buyInCents: number): number {
  return buyInCents + computePlatformFeeCents(buyInCents);
}
