import { executePayoutSchema } from '@flos/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { CanonicalLeague } from '@flos/shared';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/index.js';
import {
  leagueMembers,
  leagueProviderLinks,
  leagues,
  payments,
  treasuryLedger,
  users,
} from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { completeBuyInPayment } from '../lib/complete-buy-in.js';
import { decryptCredentials } from '../lib/crypto.js';
import { requireStripe } from '../lib/stripe.js';
import {
  buildPayoutPreviewWithMembers,
  dbMembersToTreasuryRoster,
  mergeTreasuryRoster,
  resolveTreasuryLeagueSnapshot,
} from '../lib/treasury-members.js';
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
      await requireLeagueMembership(authReq, id);
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    const ledger = await db
      .select()
      .from(treasuryLedger)
      .where(eq(treasuryLedger.leagueId, id));

    const dbMembers = await db
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

    const snapshot = link?.snapshot as CanonicalLeague | null;
    const { teams, standings } = link
      ? await resolveTreasuryLeagueSnapshot({
          provider: link.provider,
          externalLeagueId: link.externalLeagueId,
          snapshot,
          encryptedCredentials: link.encryptedCredentials,
          decryptCredentials,
        })
      : { teams: [], standings: [] };

    const members =
      teams.length > 0
        ? mergeTreasuryRoster(teams, standings, dbMembers)
        : dbMembersToTreasuryRoster(dbMembers);

    const potCents = computePotFromLedger(ledger);
    const paidMemberCount = members.filter((m) => m.paid).length;
    const totalMemberCount = members.length;
    const payoutPreview = computePayoutPreview(potCents, league.payoutTemplate);
    const payoutSlots =
      teams.length > 0
        ? buildPayoutPreviewWithMembers(potCents, league.payoutTemplate, standings, teams, members)
        : payoutPreview.map((slot) => ({
            ...slot,
            teamExternalId: null,
            teamName: null,
            ownerName: null,
            userId: null,
          }));

    const ledgerActivity = ledger
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 12)
      .map((entry) => {
        const member = members.find((m) => m.userId && m.userId === entry.userId);
        const who = member?.displayName ?? member?.teamName ?? 'Member';
        const dollars = (entry.amountCents / 100).toLocaleString(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        });
        let title = entry.description ?? entry.type;
        if (entry.type === 'buy_in') title = `${who} paid league dues (${dollars})`;
        else if (entry.type === 'platform_fee') title = `Platform fee recorded (${dollars})`;
        else if (entry.type === 'payout') title = `${who} received payout (${dollars})`;
        return {
          id: entry.id,
          title,
          when: entry.createdAt.toISOString(),
          type: entry.type,
        };
      });

    return {
      leagueId: id,
      potCents,
      platformFeeCents: league.platformFeeCents,
      buyInCents: league.buyInCents,
      paidMemberCount,
      totalMemberCount,
      payoutTemplate: league.payoutTemplate,
      payoutPreview,
      payoutSlots,
      stripeConnectOnboarded: league.connectOnboarded,
      paymentsDevMode: !config.stripeSecretKey,
      members,
      ledgerActivity,
      rosterSource: teams.length > 0 ? (link?.provider ?? 'snapshot') : 'hosted',
    };
  });

  app.post('/leagues/:id/treasury/mark-paid', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { userId: targetUserId } = z.object({ userId: z.string().uuid() }).parse(request.body);

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    if (!league) return reply.status(404).send({ error: 'League not found' });

    const [target] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, targetUserId)))
      .limit(1);

    if (!target) return reply.status(404).send({ error: 'Member not found' });
    if (target.paid) return reply.status(400).send({ error: 'Member already paid' });

    const amountCents = league.buyInCents + league.platformFeeCents;

    await db.insert(payments).values({
      leagueId: id,
      userId: targetUserId,
      amountCents,
      buyInCents: league.buyInCents,
      platformFeeCents: league.platformFeeCents,
      status: 'completed',
    });

    await completeBuyInPayment({
      leagueId: id,
      userId: targetUserId,
      buyInCents: league.buyInCents,
      platformFeeCents: league.platformFeeCents,
    });

    return { ok: true, userId: targetUserId };
  });

  /** Dev/testing only — undo a recorded buy-in so payment flow can be retried. */
  app.post('/leagues/:id/treasury/reset-payment', { preHandler: authMiddleware }, async (request, reply) => {
    if (config.stripeSecretKey) {
      return reply.status(403).send({ error: 'Only available in payments dev mode' });
    }

    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { userId: targetUserId } = z
      .object({ userId: z.string().uuid().optional() })
      .parse(request.body ?? {});

    const resetUserId = targetUserId ?? authReq.userId;

    if (resetUserId !== authReq.userId) {
      try {
        await requireLeagueMembership(authReq, id, { commissioner: true });
      } catch {
        return reply.status(403).send({ error: 'Commissioner access required' });
      }
    } else {
      try {
        await requireLeagueMembership(authReq, id);
      } catch {
        return reply.status(403).send({ error: 'Access denied' });
      }
    }

    await db
      .update(leagueMembers)
      .set({ paid: false, paidAt: null })
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, resetUserId)));

    await db
      .delete(treasuryLedger)
      .where(and(eq(treasuryLedger.leagueId, id), eq(treasuryLedger.userId, resetUserId)));

    await db
      .delete(payments)
      .where(and(eq(payments.leagueId, id), eq(payments.userId, resetUserId)));

    return { ok: true, userId: resetUserId };
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
