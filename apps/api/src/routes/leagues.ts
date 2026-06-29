import { fetchSleeperMyRoster, fetchSleeperOwnerAvatars, fetchSleeperWeekMatchups, resolveSleeperOwnerId } from '@flos/league-adapters';
import { createLeagueSchema, updateLeagueSettingsSchema, type CanonicalLeague } from '@flos/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leagueMembers, leagueProviderLinks, leagues, users } from '../db/schema.js';
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

    if (memberships.length === 0) {
      return { leagues: [] };
    }

    const leagueIds = memberships.map(({ league }) => league.id);
    const memberCounts = await db
      .select({
        leagueId: leagueMembers.leagueId,
        count: sql<number>`count(*)::int`,
      })
      .from(leagueMembers)
      .where(inArray(leagueMembers.leagueId, leagueIds))
      .groupBy(leagueMembers.leagueId);

    const countByLeague = new Map(memberCounts.map((row) => [row.leagueId, row.count]));

    const links = await db
      .select()
      .from(leagueProviderLinks)
      .where(inArray(leagueProviderLinks.leagueId, leagueIds));
    const linkByLeague = new Map(links.map((link) => [link.leagueId, link]));

    return {
      leagues: memberships.map(({ league, member }) => {
        const link = linkByLeague.get(league.id);
        const snapshot = link?.snapshot as { currentWeek?: number } | null;
        return {
          id: league.id,
          name: league.name,
          season: league.season,
          role: member.role,
          paid: member.paid,
          buyInCents: league.buyInCents,
          platformFeeCents: league.platformFeeCents,
          memberCount: countByLeague.get(league.id) ?? 1,
          teamCount:
            (link?.snapshot as { teams?: unknown[] } | null)?.teams?.length ??
            countByLeague.get(league.id) ??
            1,
          provider: link?.provider ?? null,
          currentWeek: snapshot?.currentWeek ?? 0,
          teamName: member.teamName,
        };
      }),
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

    if (body.provider && body.externalLeagueId) {
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
    }

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
        ? { role: membership.role, paid: membership.paid, teamName: membership.teamName }
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
      await requireLeagueMembership(authReq, id);
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    const snapshot = link?.snapshot as CanonicalLeague | null;
    const teamMap = new Map((snapshot?.teams ?? []).map((t) => [t.externalTeamId, t]));

    let liveOwnerAvatars = new Map<string, string>();
    if (link?.provider === 'sleeper' && link.externalLeagueId) {
      try {
        liveOwnerAvatars = await fetchSleeperOwnerAvatars(link.externalLeagueId);
      } catch {
        // fall back to snapshot avatars only
      }
    }

    const standings = (snapshot?.standings ?? []).map((row) => {
      const team = teamMap.get(row.teamExternalId);
      const ownerAvatarUrl =
        team?.ownerAvatarUrl ??
        (team?.ownerExternalId ? liveOwnerAvatars.get(team.ownerExternalId) ?? null : null);
      return {
        ...row,
        teamName: team?.name ?? `Team ${row.teamExternalId}`,
        ownerName: team?.ownerName ?? null,
        ownerAvatarUrl,
        pointsAgainst: row.pointsAgainst ?? team?.pointsAgainst ?? 0,
      };
    });

    return { standings, currentWeek: snapshot?.currentWeek ?? 0 };
  });

  app.get('/leagues/:id/matchups', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { week } = request.query as { week?: string };

    try {
      await requireLeagueMembership(authReq, id);
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    const snapshot = link?.snapshot as CanonicalLeague | null;
    const targetWeek = week ? Number(week) : snapshot?.currentWeek ?? 1;

    if (link?.provider === 'sleeper' && link.externalLeagueId) {
      try {
        const matchups = await fetchSleeperWeekMatchups(link.externalLeagueId, targetWeek);
        return { week: targetWeek, matchups, source: 'sleeper' as const };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to load Sleeper matchups',
        });
      }
    }

    const teamMap = new Map((snapshot?.teams ?? []).map((t) => [t.externalTeamId, t]));
    const matchups = (snapshot?.schedule ?? [])
      .filter((m) => m.week === targetWeek)
      .map((m) => {
        const home = teamMap.get(m.homeTeamExternalId);
        const away = teamMap.get(m.awayTeamExternalId);
        return {
          matchupId: m.matchupId,
          week: m.week,
          status: m.status,
          home: {
            rosterId: m.homeTeamExternalId,
            teamName: home?.name ?? m.homeTeamExternalId,
            ownerName: home?.ownerName ?? null,
            points: m.homeScore ?? 0,
            lineup: [],
          },
          away: {
            rosterId: m.awayTeamExternalId,
            teamName: away?.name ?? m.awayTeamExternalId,
            ownerName: away?.ownerName ?? null,
            points: m.awayScore ?? 0,
            lineup: [],
          },
        };
      });

    return { week: targetWeek, matchups, source: 'snapshot' as const };
  });

  app.get('/leagues/:id/my-roster', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    try {
      await requireLeagueMembership(authReq, id);
    } catch (e) {
      return reply.status(403).send({ error: e instanceof Error ? e.message : 'Access denied' });
    }

    const [membership] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, authReq.userId)))
      .limit(1);

    const [user] = await db.select().from(users).where(eq(users.id, authReq.userId)).limit(1);

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    if (!link || link.provider !== 'sleeper' || !link.externalLeagueId) {
      return reply.status(404).send({ error: 'No synced Sleeper league linked' });
    }

    const snapshot = link.snapshot as CanonicalLeague | null;
    const teams = snapshot?.teams ?? [];
    const ownerId = resolveSleeperOwnerId(teams, {
      displayName: user?.displayName ?? undefined,
      teamName: membership?.teamName,
      providerTeamId: membership?.providerTeamId,
    });

    if (!ownerId) {
      return reply.status(404).send({
        error: 'Could not match your account to a Sleeper team. Try refreshing sync from Settings.',
      });
    }

    try {
      const roster = await fetchSleeperMyRoster(link.externalLeagueId, ownerId);
      return { roster, source: 'sleeper' as const };
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to load roster',
      });
    }
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
