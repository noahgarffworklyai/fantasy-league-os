import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leagueProviderLinks } from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';

export async function playerRoutes(app: FastifyInstance) {
  app.get('/leagues/:id/players', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const { search } = request.query as { search?: string };

    try {
      await requireLeagueMembership(authReq, id, { paid: true });
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, id))
      .limit(1);

    const snapshot = link?.snapshot as {
      teams?: Array<{
        externalTeamId: string;
        name: string;
        ownerName?: string;
      }>;
    } | null;

    const players = (snapshot?.teams ?? []).map((t) => ({
      externalId: t.externalTeamId,
      name: t.name,
      position: 'TEAM',
      team: t.ownerName,
    }));

    const filtered = search
      ? players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : players;

    return { players: filtered };
  });

  app.get('/players/:playerId', { preHandler: authMiddleware }, async (request) => {
    const { playerId } = request.params as { playerId: string };
    return {
      externalId: playerId,
      name: `Player ${playerId}`,
      position: 'FLEX',
      status: 'Active',
      injuryStatus: null,
    };
  });
}
