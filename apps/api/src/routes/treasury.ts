import { executePayoutSchema } from '@flos/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/index.js';
import {
  leagueMembers,
  leagues,
  treasuryLedger,
  users,
} from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { requireStripe } from '../lib/stripe.js';
import { computePayoutPreview, computePotFromLedger, getPayoutSplits } from '../lib/treasury.js';

export async function treasuryRoutes(app: FastifyInstance) {
  app.post('/leagues/:id/treasury/onboard', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const stripeClient = requireStripe();
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);

    let accountId = league.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripeClient.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      await db
        .update(leagues)
        .set({ stripeConnectAccountId: accountId })
        .where(eq(leagues.id, id));
    }

    const accountLink = await stripeClient.accountLinks.create({
      account: accountId,
      refresh_url: `${config.webUrl}/treasury/refresh?league=${id}`,
      return_url: `${config.webUrl}/treasury/return?league=${id}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  });

  app.get('/leagues/:id/treasury', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(authReq, id, { paid: true });
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    const ledger = await db
      .select()
      .from(treasuryLedger)
      .where(eq(treasuryLedger.leagueId, id));

    const members = await db
      .select({
        userId: leagueMembers.userId,
        displayName: users.displayName,
        teamName: leagueMembers.teamName,
        providerTeamId: leagueMembers.providerTeamId,
        paid: leagueMembers.paid,
        paidAt: leagueMembers.paidAt,
      })
      .from(leagueMembers)
      .innerJoin(users, eq(leagueMembers.userId, users.id))
      .where(eq(leagueMembers.leagueId, id));

    const potCents = computePotFromLedger(ledger);
    const paidMemberCount = members.filter((m) => m.paid).length;

    return {
      leagueId: id,
      potCents,
      platformFeeCents: league.platformFeeCents,
      buyInCents: league.buyInCents,
      paidMemberCount,
      totalMemberCount: members.length,
      payoutTemplate: league.payoutTemplate,
      payoutPreview: computePayoutPreview(potCents, league.payoutTemplate),
      stripeConnectOnboarded: league.connectOnboarded,
      members,
    };
  });

  app.post('/leagues/:id/payments/buy-in', { preHandler: authMiddleware }, async (request, reply) => {
    return reply.status(410).send({
      error: 'Use POST /leagues/:id/payments/checkout with Stripe Web Checkout instead',
    });
  });

  app.post('/leagues/:id/payouts/execute', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = executePayoutSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    const ledger = await db.select().from(treasuryLedger).where(eq(treasuryLedger.leagueId, id));
    const potCents = computePotFromLedger(ledger);
    const splits = getPayoutSplits(league.payoutTemplate);

    const payouts = body.standings.map((s) => {
      const percent = splits[s.place - 1] ?? 0;
      return {
        ...s,
        amountCents: Math.floor((potCents * percent) / 100),
      };
    });

    for (const payout of payouts) {
      await db.insert(treasuryLedger).values({
        leagueId: id,
        userId: payout.userId,
        type: 'payout',
        amountCents: payout.amountCents,
        description: `${payout.place}${payout.place === 1 ? 'st' : payout.place === 2 ? 'nd' : payout.place === 3 ? 'rd' : 'th'} place payout`,
        metadata: { place: payout.place, teamName: payout.teamName },
      });
    }

    return { payouts, potCents, executedAt: new Date().toISOString() };
  });
}
