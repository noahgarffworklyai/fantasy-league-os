import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { payments, stripeWebhookEvents } from '../db/schema.js';
import { completeBuyInPayment } from '../lib/complete-buy-in.js';
import { requireStripe } from '../lib/stripe.js';

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
      return reply.status(503).send({ error: 'Stripe webhooks not configured' });
    }

    const stripeClient = requireStripe();
    const sig = request.headers['stripe-signature'] as string;
    const rawBody = (request as { rawBody?: Buffer }).rawBody;

    if (!rawBody || !sig) {
      return reply.status(400).send({ error: 'Missing signature or body' });
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, sig, config.stripeWebhookSecret);
    } catch (err) {
      return reply.status(400).send({ error: `Webhook Error: ${err instanceof Error ? err.message : 'unknown'}` });
    }

    const existing = await db
      .select()
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.id, event.id))
      .limit(1);

    if (existing.length) {
      return { received: true, duplicate: true };
    }

    await db.insert(stripeWebhookEvents).values({ id: event.id, type: event.type });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        payment_intent?: string | { id: string } | null;
        metadata: { leagueId?: string; userId?: string; buyInCents?: string; platformFeeCents?: string };
      };

      const { leagueId, userId, buyInCents, platformFeeCents } = session.metadata;
      if (leagueId && userId) {
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
          .where(eq(payments.stripeCheckoutSessionId, session.id));

        await completeBuyInPayment({
          leagueId,
          userId,
          buyInCents: Number(buyInCents ?? 0),
          platformFeeCents: Number(platformFeeCents ?? 0),
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          stripeEventId: event.id,
        });
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as {
        id: string;
        metadata: { leagueId?: string; userId?: string; buyInCents?: string; platformFeeCents?: string };
      };

      const { leagueId, userId, buyInCents, platformFeeCents } = pi.metadata;
      if (leagueId && userId) {
        await db
          .update(payments)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(payments.stripePaymentIntentId, pi.id));

        await completeBuyInPayment({
          leagueId,
          userId,
          buyInCents: Number(buyInCents ?? 0),
          platformFeeCents: Number(platformFeeCents ?? 0),
          stripePaymentIntentId: pi.id,
          stripeEventId: event.id,
        });
      }
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as { id: string; details_submitted?: boolean };
      if (account.details_submitted) {
        const { leagues } = await import('../db/schema.js');
        await db
          .update(leagues)
          .set({ connectOnboarded: true })
          .where(eq(leagues.stripeConnectAccountId, account.id));
      }
    }

    return { received: true };
  });
}
