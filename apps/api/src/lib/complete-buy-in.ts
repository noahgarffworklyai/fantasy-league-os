import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leagueMembers, payments, treasuryLedger } from '../db/schema.js';

export async function completeBuyInPayment(params: {
  leagueId: string;
  userId: string;
  buyInCents: number;
  platformFeeCents: number;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeEventId?: string;
}): Promise<{ alreadyCompleted: boolean }> {
  const [member] = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, params.leagueId), eq(leagueMembers.userId, params.userId)))
    .limit(1);

  if (member?.paid) {
    return { alreadyCompleted: true };
  }

  if (params.stripeCheckoutSessionId) {
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeCheckoutSessionId, params.stripeCheckoutSessionId))
      .limit(1);

    if (existingPayment?.status === 'completed' && member?.paid) {
      return { alreadyCompleted: true };
    }

    if (existingPayment) {
      await db
        .update(payments)
        .set({
          status: 'completed',
          stripePaymentIntentId: params.stripePaymentIntentId ?? existingPayment.stripePaymentIntentId,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, existingPayment.id));
    }
  }

  const [existingBuyIn] = await db
    .select()
    .from(treasuryLedger)
    .where(
      and(
        eq(treasuryLedger.leagueId, params.leagueId),
        eq(treasuryLedger.userId, params.userId),
        eq(treasuryLedger.type, 'buy_in'),
      ),
    )
    .limit(1);

  if (!existingBuyIn) {
    await db.insert(treasuryLedger).values([
      {
        leagueId: params.leagueId,
        userId: params.userId,
        type: 'buy_in',
        amountCents: params.buyInCents,
        stripeEventId: params.stripeEventId,
        description: 'Buy-in payment',
      },
      {
        leagueId: params.leagueId,
        userId: params.userId,
        type: 'platform_fee',
        amountCents: params.platformFeeCents,
        stripeEventId: params.stripeEventId,
        description: 'Platform fee',
      },
    ]);
  }

  if (member) {
    await db
      .update(leagueMembers)
      .set({ paid: true, paidAt: new Date() })
      .where(eq(leagueMembers.id, member.id));
  }

  return { alreadyCompleted: false };
}
