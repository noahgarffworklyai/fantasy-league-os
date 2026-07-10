import { createCheckoutSchema } from '@flos/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { leagueMembers, leagues, payments, users } from '../db/schema.js';
import { authMiddleware, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { completeBuyInPayment } from '../lib/complete-buy-in.js';
import { requireStripe } from '../lib/stripe.js';

function appendCheckoutSessionPlaceholder(url: string): string {
  if (url.includes('{CHECKOUT_SESSION_ID}')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
}

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/leagues/:id/payments/checkout', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = createCheckoutSchema.parse(request.body);

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    if (!league) return reply.status(404).send({ error: 'League not found' });

    const [member] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, authReq.userId)))
      .limit(1);

    if (!member) return reply.status(403).send({ error: 'Not a league member' });
    if (member.paid) return reply.status(400).send({ error: 'Already paid' });

    const amountCents = league.buyInCents + league.platformFeeCents;

    if (!config.stripeSecretKey) {
      await db.insert(payments).values({
        leagueId: id,
        userId: authReq.userId,
        amountCents,
        buyInCents: league.buyInCents,
        platformFeeCents: league.platformFeeCents,
        status: 'completed',
      });

      await completeBuyInPayment({
        leagueId: id,
        userId: authReq.userId,
        buyInCents: league.buyInCents,
        platformFeeCents: league.platformFeeCents,
      });

      return {
        checkoutUrl: '',
        sessionId: 'dev_mode',
        amountCents,
        buyInCents: league.buyInCents,
        platformFeeCents: league.platformFeeCents,
        devMode: true,
      };
    }

    const stripeClient = requireStripe();
    const [user] = await db.select().from(users).where(eq(users.id, authReq.userId)).limit(1);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.displayName,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${league.name} buy-in` },
            unit_amount: league.buyInCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Processing fee (5%)' },
            unit_amount: league.platformFeeCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        leagueId: id,
        userId: authReq.userId,
        buyInCents: String(league.buyInCents),
        platformFeeCents: String(league.platformFeeCents),
      },
      success_url: appendCheckoutSessionPlaceholder(body.successUrl),
      cancel_url: body.cancelUrl,
    });

    if (!session.url) {
      return reply.status(500).send({ error: 'Failed to create checkout session' });
    }

    await db.insert(payments).values({
      leagueId: id,
      userId: authReq.userId,
      amountCents,
      buyInCents: league.buyInCents,
      platformFeeCents: league.platformFeeCents,
      status: 'pending',
      stripeCheckoutSessionId: session.id,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      amountCents,
      buyInCents: league.buyInCents,
      platformFeeCents: league.platformFeeCents,
    };
  });

  app.get('/payments/checkout/:sessionId/status', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { sessionId } = request.params as { sessionId: string };

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripeCheckoutSessionId, sessionId))
      .limit(1);

    if (!payment || payment.userId !== authReq.userId) {
      return reply.status(404).send({ error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return {
        status: 'completed',
        leagueId: payment.leagueId,
        paid: true,
      };
    }

    if (!config.stripeSecretKey || sessionId === 'dev_mode') {
      return {
        status: payment.status,
        leagueId: payment.leagueId,
        paid: false,
      };
    }

    const stripeClient = requireStripe();
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const buyInCents = Number(session.metadata?.buyInCents ?? payment.buyInCents);
      const platformFeeCents = Number(session.metadata?.platformFeeCents ?? payment.platformFeeCents);
      const leagueId = session.metadata?.leagueId ?? payment.leagueId;
      const userId = session.metadata?.userId ?? payment.userId;

      await db
        .update(payments)
        .set({
          status: 'completed',
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      await completeBuyInPayment({
        leagueId,
        userId,
        buyInCents,
        platformFeeCents,
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id,
      });

      return {
        status: 'completed',
        leagueId,
        paid: true,
      };
    }

    return {
      status: session.status ?? 'open',
      leagueId: payment.leagueId,
      paid: false,
    };
  });
}
