import { INVITE_EXPIRY_DAYS } from '@flos/shared';
import { createInviteSchema, redeemInviteSchema } from '@flos/shared';
import { and, count, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { invites, leagueMembers, leagues } from '../db/schema.js';
import { authMiddleware, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { generateToken } from '../lib/crypto.js';
import { config } from '../config.js';

export async function inviteRoutes(app: FastifyInstance) {
  app.post('/invites', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const body = createInviteSchema.parse(request.body);

    const [league] = await db.select().from(leagues).where(eq(leagues.id, body.leagueId)).limit(1);
    if (!league || league.commissionerId !== userId) {
      return reply.status(403).send({ error: 'Only commissioner can create invites' });
    }

    const token = generateToken(16);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const [invite] = await db
      .insert(invites)
      .values({
        leagueId: body.leagueId,
        token,
        email: body.email,
        createdById: userId,
        expiresAt,
      })
      .returning();

    const deepLink = `${config.appUrl}invite/${token}`;
    const webLink = `${config.webUrl}/invite/${token}`;

    return {
      invite: {
        id: invite.id,
        token: invite.token,
        expiresAt: invite.expiresAt.toISOString(),
        deepLink,
        webLink,
      },
    };
  });

  app.get('/invites/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.token, token), gt(invites.expiresAt, new Date()), isNull(invites.consumedAt)))
      .limit(1);

    if (!invite) return reply.status(404).send({ error: 'Invite not found or expired' });

    const [league] = await db.select().from(leagues).where(eq(leagues.id, invite.leagueId)).limit(1);
    const [memberCount] = await db
      .select({ count: count() })
      .from(leagueMembers)
      .where(eq(leagueMembers.leagueId, invite.leagueId));

    return {
      token: invite.token,
      leagueName: league?.name ?? 'League',
      buyInCents: league?.buyInCents ?? 0,
      platformFeeCents: league?.platformFeeCents ?? 0,
      memberCount: memberCount?.count ?? 0,
      expiresAt: invite.expiresAt.toISOString(),
    };
  });

  app.post('/invites/redeem', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const body = redeemInviteSchema.parse(request.body);

    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.token, body.token), gt(invites.expiresAt, new Date()), isNull(invites.consumedAt)))
      .limit(1);

    if (!invite) return reply.status(404).send({ error: 'Invite not found or expired' });

    const existing = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, invite.leagueId), eq(leagueMembers.userId, userId)))
      .limit(1);

    if (!existing.length) {
      await db.insert(leagueMembers).values({
        leagueId: invite.leagueId,
        userId,
        role: 'member',
        paid: false,
      });
    }

    await db
      .update(invites)
      .set({ consumedById: userId, consumedAt: new Date() })
      .where(eq(invites.id, invite.id));

    const [league] = await db.select().from(leagues).where(eq(leagues.id, invite.leagueId)).limit(1);

    return {
      leagueId: invite.leagueId,
      leagueName: league?.name,
      requiresPayment: !existing[0]?.paid,
    };
  });

  app.get('/invites/league/:leagueId', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { leagueId } = request.params as { leagueId: string };

    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
    if (!league || league.commissionerId !== userId) {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const leagueInvites = await db
      .select()
      .from(invites)
      .where(eq(invites.leagueId, leagueId));

    return { invites: leagueInvites };
  });
}
