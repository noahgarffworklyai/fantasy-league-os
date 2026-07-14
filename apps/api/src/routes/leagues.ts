import {
  fetchEspnMyRoster,
  fetchEspnWeekMatchups,
  fetchSleeperMyRoster,
  fetchSleeperOwnerAvatars,
  fetchSleeperWeekMatchups,
  previewEspnLeague,
  resolveEspnTeamId,
  resolveSleeperOwnerId,
  type EspnCredentials,
} from '@flos/league-adapters';
import {
  computePlatformFeeCents,
  createLeagueSchema,
  patchHostedRosterSchema,
  reconnectEspnCredentialsSchema,
  updateLeagueSettingsSchema,
  type CanonicalLeague,
} from '@flos/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leagueMembers, leagueProviderLinks, leagues, payments, treasuryLedger, users } from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { decryptCredentials, encryptCredentials } from '../lib/crypto.js';
import { buildHostedMatchups, buildHostedStandings } from '../lib/hosted-league.js';
import {
  enrichSleeperCredentials,
  resolveSleeperUserIdForMember,
} from '../lib/sleeper-credentials.js';
import {
  buildHostedMyRoster,
  collectHostedOwnership,
  addHostedPlayer,
  dropHostedPlayer,
  seedHostedRoster,
  swapHostedRoster,
  type HostedRosterData,
} from '../lib/hosted-roster.js';
import { scheduleLeagueSync, shouldRefreshSync } from '../services/sync-worker.js';
import { syncLeagueByLeagueId } from '../services/sync.js';

function getEspnCredentials(link: { encryptedCredentials: string | null }): EspnCredentials | null {
  if (!link.encryptedCredentials) return null;
  const creds = decryptCredentials<EspnCredentials>(link.encryptedCredentials);
  if (!creds.espnS2 || !creds.swid) return null;
  return creds;
}

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

    const isFreeLeague = body.buyInCents <= 0;

    await db.insert(leagueMembers).values({
      leagueId: league.id,
      userId,
      role: 'commissioner',
      paid: isFreeLeague,
      paidAt: isFreeLeague ? new Date() : null,
    });

    if (body.provider && body.externalLeagueId) {
      let credentials = (request.body as { credentials?: Record<string, unknown> }).credentials;
      if (body.provider === 'sleeper' && credentials) {
        credentials = await enrichSleeperCredentials(credentials);
      }
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
    let [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    if (link && shouldRefreshSync(link)) {
      try {
        await syncLeagueByLeagueId(id);
        [link] = await db
          .select()
          .from(leagueProviderLinks)
          .where(eq(leagueProviderLinks.leagueId, id))
          .limit(1);
      } catch {
        // Return last good snapshot if refresh fails.
      }
    }

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
            syncError: link.syncStatus === 'error' ? link.syncError : null,
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

    const updates: Record<string, unknown> = {
      ...body,
      draftDate: body.draftDate === null ? null : body.draftDate ? new Date(body.draftDate) : undefined,
      updatedAt: new Date(),
    };
    if (body.buyInCents !== undefined) {
      updates.platformFeeCents = computePlatformFeeCents(body.buyInCents);
    }

    const [updated] = await db
      .update(leagues)
      .set(updates)
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

    try {
      const snapshot = await syncLeagueByLeagueId(id);
      void scheduleLeagueSync(link.id);
      return { snapshot, syncStatus: 'ok' as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      request.log.warn({ leagueId: id, err: message }, 'Manual league sync failed');
      return reply.status(502).send({ error: message });
    }
  });

  app.patch('/leagues/:id/provider-credentials', { preHandler: authMiddleware }, async (request, reply) => {
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
    if (link.provider !== 'espn') {
      return reply.status(400).send({ error: 'Only ESPN leagues support reconnect' });
    }

    const body = reconnectEspnCredentialsSchema.parse(request.body);
    const credentials: EspnCredentials = {
      espnS2: body.espnS2.trim(),
      swid: body.swid.trim(),
      leagueId: link.externalLeagueId,
    };

    try {
      await previewEspnLeague(link.externalLeagueId, credentials);
    } catch {
      return reply.status(400).send({
        error: 'Could not verify ESPN sign-in for this league. Check your account can access the league on ESPN.',
      });
    }

    await db
      .update(leagueProviderLinks)
      .set({
        encryptedCredentials: encryptCredentials(credentials),
        syncStatus: 'pending',
        syncError: null,
      })
      .where(eq(leagueProviderLinks.id, link.id));

    try {
      await syncLeagueByLeagueId(id);
      return { syncStatus: 'ok' as const, externalLeagueId: link.externalLeagueId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed after reconnect';
      return reply.status(502).send({ error: message });
    }
  });

  app.delete('/leagues/:id/members/me', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    let member;
    try {
      member = await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    if (!league) return reply.status(404).send({ error: 'League not found' });

    if (member.role === 'commissioner' || league.commissionerId === authReq.userId) {
      return reply.status(400).send({
        error: 'Commissioners cannot leave. Delete the league instead, or transfer commissioner first.',
      });
    }

    await db
      .delete(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, authReq.userId)));

    return { ok: true };
  });

  app.delete('/leagues/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [league] = await db.select().from(leagues).where(eq(leagues.id, id)).limit(1);
    if (!league) return reply.status(404).send({ error: 'League not found' });
    if (league.commissionerId !== authReq.userId) {
      return reply.status(403).send({ error: 'Only the commissioner can delete this league' });
    }

    try {
      await db.delete(payments).where(eq(payments.leagueId, id));
      await db.delete(treasuryLedger).where(eq(treasuryLedger.leagueId, id));
      await db.delete(leagues).where(eq(leagues.id, id));
      return { ok: true };
    } catch (err) {
      request.log.error({ leagueId: id, err }, 'Failed to delete league');
      return reply.status(500).send({ error: 'Could not delete league. Try again.' });
    }
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

    if (!link) {
      const members = await db
        .select({
          userId: leagueMembers.userId,
          displayName: users.displayName,
          teamName: leagueMembers.teamName,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(eq(leagueMembers.leagueId, id));

      const standings = buildHostedStandings(members);
      return { standings, currentWeek: 1, source: 'hosted' as const };
    }

    if (!(snapshot?.standings?.length)) {
      return { standings: [], currentWeek: snapshot?.currentWeek ?? 0, source: 'snapshot' as const };
    }

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

    return { standings, currentWeek: snapshot?.currentWeek ?? 0, source: 'snapshot' as const };
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

    if (!link) {
      const members = await db
        .select({
          userId: leagueMembers.userId,
          displayName: users.displayName,
          teamName: leagueMembers.teamName,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(eq(leagueMembers.leagueId, id));

      const matchups = buildHostedMatchups(members, targetWeek);
      return { week: targetWeek, matchups, source: 'hosted' as const };
    }

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

    if (link?.provider === 'espn' && link.externalLeagueId) {
      const credentials = getEspnCredentials(link);
      if (!credentials) {
        return reply.status(400).send({ error: 'ESPN credentials missing. Re-connect your league.' });
      }
      try {
        const matchups = await fetchEspnWeekMatchups(
          link.externalLeagueId,
          targetWeek,
          credentials,
          snapshot?.season,
        );
        return { week: targetWeek, matchups, source: 'espn' as const };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to load ESPN matchups',
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

    if (!link?.externalLeagueId) {
      if (!membership) {
        return reply.status(404).send({ error: 'League membership not found' });
      }

      let hostedData = membership.hostedRoster as HostedRosterData | null;
      if (!hostedData) {
        hostedData = await seedHostedRoster(authReq.userId);
        await db
          .update(leagueMembers)
          .set({ hostedRoster: hostedData })
          .where(eq(leagueMembers.id, membership.id));
      }

      const roster = await buildHostedMyRoster(
        authReq.userId,
        user?.displayName ?? 'Manager',
        membership.teamName,
        hostedData,
      );
      return { roster, source: 'hosted' as const };
    }

    const snapshot = link.snapshot as CanonicalLeague | null;
    const teams = snapshot?.teams ?? [];

    if (link.provider === 'sleeper') {
      const linkCredentials = link.encryptedCredentials
        ? decryptCredentials<Record<string, unknown>>(link.encryptedCredentials)
        : null;
      const sleeperUserId = await resolveSleeperUserIdForMember(authReq.userId, linkCredentials);
      const ownerId = resolveSleeperOwnerId(teams, {
        displayName: user?.displayName ?? undefined,
        teamName: membership?.teamName,
        providerTeamId: membership?.providerTeamId,
        ownerExternalId: sleeperUserId,
      });

      if (!ownerId) {
        return reply.status(404).send({
          error: 'Could not match your account to a team. Try refreshing sync from Settings.',
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
    }

    if (link.provider === 'espn') {
      const credentials = getEspnCredentials(link);
      if (!credentials) {
        return reply.status(400).send({ error: 'ESPN credentials missing. Re-connect your league.' });
      }

      const teamId = resolveEspnTeamId(teams, credentials, {
        displayName: user?.displayName ?? undefined,
        teamName: membership?.teamName,
        providerTeamId: membership?.providerTeamId,
      });

      if (!teamId) {
        return reply.status(404).send({
          error: 'Could not match your account to an ESPN team. Try refreshing sync from Settings.',
        });
      }

      try {
        const roster = await fetchEspnMyRoster(link.externalLeagueId, teamId, credentials, {
          week: snapshot?.currentWeek,
          season: snapshot?.season,
        });
        return { roster, source: 'espn' as const };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to load roster',
        });
      }
    }

    return reply.status(404).send({ error: 'Roster sync not supported for this platform yet' });
  });

  app.patch('/leagues/:id/my-roster', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const parsed = patchHostedRosterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

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

    if (link?.externalLeagueId) {
      return reply.status(400).send({ error: 'Lineup changes must be made on your fantasy platform' });
    }

    const [membership] = await db
      .select()
      .from(leagueMembers)
      .where(and(eq(leagueMembers.leagueId, id), eq(leagueMembers.userId, authReq.userId)))
      .limit(1);

    if (!membership) {
      return reply.status(404).send({ error: 'League membership not found' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, authReq.userId)).limit(1);

    let hostedData = membership.hostedRoster as HostedRosterData | null;
    if (!hostedData) {
      hostedData = await seedHostedRoster(authReq.userId);
    }

    try {
      if (parsed.data.action === 'swap') {
        hostedData = swapHostedRoster(hostedData, parsed.data.starterIndex, parsed.data.benchIndex);
      } else if (parsed.data.action === 'drop') {
        hostedData = dropHostedPlayer(hostedData, parsed.data.playerId);
      } else {
        const memberRows = await db
          .select({
            userId: leagueMembers.userId,
            hostedRoster: leagueMembers.hostedRoster,
          })
          .from(leagueMembers)
          .where(eq(leagueMembers.leagueId, id));
        const { ownedIds } = collectHostedOwnership(
          memberRows.map((row) => ({
            userId: row.userId,
            hostedRoster: row.hostedRoster as HostedRosterData | null,
          })),
          authReq.userId,
        );
        hostedData = addHostedPlayer(hostedData, parsed.data.playerId, ownedIds);
      }
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Invalid roster change',
      });
    }

    await db
      .update(leagueMembers)
      .set({ hostedRoster: hostedData })
      .where(eq(leagueMembers.id, membership.id));

    const roster = await buildHostedMyRoster(
      authReq.userId,
      user?.displayName ?? 'Manager',
      membership.teamName,
      hostedData,
    );
    return { roster, source: 'hosted' as const };
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
