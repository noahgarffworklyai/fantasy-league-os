import { discoverEspnLeagues, previewEspnLeague, previewSleeperLeague, resolveSleeperUserId, sleeperAdapter } from '@flos/league-adapters';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { authMiddleware, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { encryptCredentials } from '../lib/crypto.js';
import { db } from '../db/index.js';
import { providerCredentials } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function importRoutes(app: FastifyInstance) {
  app.get(
    '/imports/sleeper/leagues',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { username, season } = z
        .object({
          username: z.string(),
          season: z.coerce.number().optional(),
        })
        .parse(request.query);

      try {
        const leagues = await sleeperAdapter.discoverLeagues({ username }, season);
        return { leagues };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to fetch Sleeper leagues',
        });
      }
    },
  );

  app.get(
    '/imports/sleeper/league/:leagueId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { leagueId } = z.object({ leagueId: z.string().min(3) }).parse(request.params);
      try {
        const league = await previewSleeperLeague(leagueId);
        return { league };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to fetch Sleeper league',
        });
      }
    },
  );

  app.get(
    '/imports/sleeper/user/:username',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { username } = z.object({ username: z.string() }).parse(request.params);
      try {
        const userId = await resolveSleeperUserId(username);
        return { userId, username };
      } catch {
        return reply.status(404).send({ error: 'Sleeper user not found' });
      }
    },
  );

  app.post(
    '/imports/espn/leagues',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const body = z
        .object({
          espnS2: z.string().min(1),
          swid: z.string().min(1),
          season: z.number().optional(),
        })
        .parse(request.body);

      try {
        const leagues = await discoverEspnLeagues(
          { espnS2: body.espnS2, swid: body.swid },
          body.season,
        );
        return { leagues };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to fetch ESPN leagues',
        });
      }
    },
  );

  app.post(
    '/imports/espn/validate',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const body = z
        .object({
          leagueId: z.string(),
          espnS2: z.string(),
          swid: z.string(),
          season: z.number().optional(),
        })
        .parse(request.body);

      const { espnAdapter } = await import('@flos/league-adapters');
      try {
        const leagues = await espnAdapter.discoverLeagues({
          leagueId: body.leagueId,
          espnS2: body.espnS2,
          swid: body.swid,
        }, body.season);
        return { valid: true, leagues };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Invalid ESPN credentials',
        });
      }
    },
  );

  app.get(
    '/imports/espn/league/:leagueId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { leagueId } = z.object({ leagueId: z.string().min(1) }).parse(request.params);
      const { espnS2, swid } = z
        .object({
          espnS2: z.string().optional(),
          swid: z.string().optional(),
        })
        .parse(request.query);

      try {
        const league = await previewEspnLeague(leagueId, {
          leagueId,
          espnS2: espnS2?.trim() ?? '',
          swid: swid?.trim() ?? '',
        });
        return { league };
      } catch (err) {
        return reply.status(400).send({
          error: err instanceof Error ? err.message : 'Failed to fetch ESPN league',
        });
      }
    },
  );

  app.post(
    '/imports/credentials',
    { preHandler: authMiddleware },
    async (request) => {
      const { userId } = request as AuthenticatedRequest;
      const body = z
        .object({
          provider: z.enum(['sleeper', 'yahoo', 'espn']),
          payload: z.record(z.unknown()),
        })
        .parse(request.body);

      const encrypted = encryptCredentials(body.payload);
      const existing = await db
        .select()
        .from(providerCredentials)
        .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.provider, body.provider)))
        .limit(1);

      if (existing.length) {
        await db
          .update(providerCredentials)
          .set({ encryptedPayload: encrypted, updatedAt: new Date() })
          .where(eq(providerCredentials.id, existing[0].id));
      } else {
        await db.insert(providerCredentials).values({
          userId,
          provider: body.provider,
          encryptedPayload: encrypted,
        });
      }

      return { ok: true };
    },
  );
}
