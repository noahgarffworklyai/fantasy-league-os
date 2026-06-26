import { z } from 'zod';

export const treasurySummarySchema = z.object({
  leagueId: z.string().uuid(),
  potCents: z.number(),
  platformFeeCents: z.number(),
  buyInCents: z.number(),
  paidMemberCount: z.number(),
  totalMemberCount: z.number(),
  payoutTemplate: z.string(),
  payoutPreview: z.array(
    z.object({
      place: z.number(),
      percent: z.number(),
      amountCents: z.number(),
    }),
  ),
  stripeConnectOnboarded: z.boolean(),
});

export const memberPaymentStatusSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  teamName: z.string().optional(),
  paid: z.boolean(),
  paidAt: z.string().nullable().optional(),
  amountCents: z.number().optional(),
});

export const buyInPaymentSchema = z.object({
  checkoutUrl: z.string(),
  sessionId: z.string(),
  amountCents: z.number(),
  buyInCents: z.number(),
  platformFeeCents: z.number(),
  devMode: z.boolean().optional(),
});

export const createCheckoutSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const checkoutStatusSchema = z.object({
  status: z.string(),
  leagueId: z.string().uuid(),
  paid: z.boolean(),
});

export const executePayoutSchema = z.object({
  standings: z.array(
    z.object({
      place: z.number().int().min(1),
      userId: z.string().uuid(),
      teamName: z.string().optional(),
    }),
  ),
});

export const connectOnboardSchema = z.object({
  url: z.string().url(),
});

export type TreasurySummary = z.infer<typeof treasurySummarySchema>;
export type MemberPaymentStatus = z.infer<typeof memberPaymentStatusSchema>;
export type BuyInPayment = z.infer<typeof buyInPaymentSchema>;
