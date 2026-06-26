import { createLeagueSchema, updateLeagueSettingsSchema } from '@flos/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leagueMembers, leagueProviderLinks, leagues } from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { encryptCredentials } from '../lib/crypto.js';
import { scheduleLeagueSync } from '../services/sync-worker.js';
import { syncLeagueByLeagueId } from '../services/sync.js';

export async function leagueRoutes(app: FastifyInstance) {
  app.get('/leagues', { preHandler: authMiddleware }, async (request) => {
    const { userId } = request as AuthenticatedRequest;
    const memberships = await db
      .select({
        league: leagues,
        member: leagueMembers,
      })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .where(eq(leagueMembers.userId, userId));

    return {
      leagues: memberships.map(({ league, member }) => ({
        id: league.id,
        name: league.name,
        season: league.season,
        role: member.role,
        paid: member.paid,
        buyInCents: league.buyInCents,
        platformFeeCents: league.platformFeeCents,
      })),
    };
  });

  app.post('/leagues', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const body = createLeagueSchema.parse(request.body);

    const [league] = await db
      .insert(leagues)
      .values({
        name: body.name,
        season: body.season,
        commissionerId: userId,
        buyInCents: body.buyInCents,
        platformFeeCents: body.platformFeeCents,
        payoutTemplate: body.payoutTemplate,
        draftDate: body.draftDate ? new Date(body.draftDate) : null,
        customRules: body.customRules,
      })
      .returning();

    await db.insert(leagueMembers).values({
      leagueId: league.id,
      userId,
      role: 'commissioner',
      paid: true,
      paidAt: new Date(),
    });

    const credentials = (request.body as { credentials?: Record<string, unknown> }).credentials;
    const [link] = await db
      .insert(leagueProviderLinks)
      .values({
        leagueId: league.id,
        provider: body.provider,
        externalLeagueId: body.externalLeagueId,
        encryptedCredentials: credentials ? encryptCredentials(credentials) : null,
      })
      .returning();

    try {
      await syncLeagueByLeagueId(league.id);
    } catch {
      // sync may fail if provider unavailable; league still created
    }
    await scheduleLeagueSync(link.id);

    return reply.status(201).send({ league });
  });

  app.get('/leagues/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(request as AuthenticatedRequest, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    const [membership] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, userId)))
      .limit(1);
    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    return {
      league,
      membership: membership
        ? { role: membership.role, paid: membership.paid }
        : null,
      providerLink: link
        ? {
            provider: link.provider,
            externalLeagueId: link.externalLeagueId,
            lastSyncedAt: link.lastSyncedAt?.toISOString(),
            syncStatus: link.syncStatus,
            snapshot: link.snapshot,
          }
        : null,
    };
  });

  app.patch('/leagues/:id/settings', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = updateLeagueSettingsSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const [updated] = await db
      .update(leagues)
      .set({
        ...body,
        draftDate: body.draftDate === null ? null : body.draftDate ? new Date(body.draftDate) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id))
      .returning();

    return { league: updated };
  });

  app.post('/leagues/:id/sync', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    if (!link) return reply.status(404).send({ error: 'No provider link' });

    await scheduleLeagueSync(link.id);
    const snapshot = await syncLeagueByLeagueId(id);
    return { snapshot, syncStatus: 'ok' };
  });

  app.get('/leagues/:id/standings', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(authReq, id, { paid: true });
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    const snapshot = link?.snapshot as { standings?: unknown[] } | null;
    return { standings: snapshot?.standings ?? [] };
  });

  app.get('/leagues/:id/matchups', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { week } = request.query as { week?: string };

    try {
      await requireLeagueMembership(authReq, id, { paid: true });
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    const snapshot = link?.snapshot as {
      schedule?: Array<{ week: number }>;
      currentWeek?: number;
    } | null;

    const targetWeek = week ? Number(week) : snapshot?.currentWeek ?? 1;
    const matchups = (snapshot?.schedule ?? []).filter((m) => m.week === targetWeek);

    return { week: targetWeek, matchups };
  });

  app.get('/leagues/:id/members', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const members = await db
      .select()
      .from(leagueMembers)
      .where(eq(leagueMembers.leagueId, id));

    return { members };
  });
}
