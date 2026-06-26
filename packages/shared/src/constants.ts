export const PROVIDERS = ['sleeper', 'yahoo', 'espn'] as const;
export type Provider = (typeof PROVIDERS)[number];

export const DEFAULT_PLATFORM_FEE_CENTS = 500;
export const INVITE_EXPIRY_DAYS = 30;

export const PAYOUT_TEMPLATES = {
  standard: { label: '70/20/10', splits: [70, 20, 10] },
  winner_takes_all: { label: 'Winner Takes All', splits: [100] },
  top_four: { label: '50/25/15/10', splits: [50, 25, 15, 10] },
} as const;
