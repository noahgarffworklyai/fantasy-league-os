import {
  aiDoctorRequestSchema,
  aiTradeRequestSchema,
  aiWaiverRequestSchema,
} from '@flos/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leagueProviderLinks } from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { getFantasyDoctor, getTradeAssistant, getWaiverAssistant } from '../services/ai.js';

export async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/doctor', { preHandler: authMiddleware }, async (request, reply) => {
    const body = aiDoctorRequestSchema.parse(request.body);
    const context = body.leagueId ? `League context: ${body.leagueId}` : undefined;

    if (body.leagueId) {
      try {
        await requireLeagueMembership(request as AuthenticatedRequest, body.leagueId, { paid: true });
      } catch {
        return reply.status(403).send({ error: 'Access denied' });
      }
    }

    const result = await getFantasyDoctor(body.playerId, body.playerId, context);
    return { ...result, playerId: body.playerId, disclaimer: 'Insights are informational, not medical or financial advice.' };
  });

  app.post('/ai/waiver', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = aiWaiverRequestSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, body.leagueId, { paid: true });
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, body.leagueId))
      .limit(1);

    const snapshot = link?.snapshot;
    const context = JSON.stringify({
      rosterPlayerIds: body.rosterPlayerIds,
      leagueSnapshot: snapshot,
    });

    const result = await getWaiverAssistant(context);
    return { ...result, disclaimer: 'AI recommendations are suggestions only.' };
  });

  app.post('/ai/trade', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = aiTradeRequestSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, body.leagueId, { paid: true });
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [link] = await db
      .select()
      .from(leagueProviderLinks)
      .where(eq(leagueProviderLinks.leagueId, body.leagueId))
      .limit(1);

    const context = JSON.stringify({
      give: body.givePlayerIds,
      receive: body.receivePlayerIds,
      opponent: body.opponentTeamExternalId,
      leagueSnapshot: link?.snapshot,
    });

    const result = await getTradeAssistant(context);
    return { ...result, disclaimer: 'AI recommendations are suggestions only.' };
  });
}
