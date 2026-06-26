import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leagueMembers, leagues } from '../db/schema.js';
import { verifyToken } from './jwt.js';

export type AuthenticatedRequest = FastifyRequest & {
  userId: string;
  userEmail: string;
};

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(header.slice(7));
    (request as AuthenticatedRequest).userId = payload.userId;
    (request as AuthenticatedRequest).userEmail = payload.email;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

export async function requireLeagueMembership(
  request: AuthenticatedRequest,
  leagueId: string,
  options: { paid?: boolean; commissioner?: boolean } = {},
) {
  const memberships = await db
    .select()
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));

  const member = memberships.find((m) => m.userId === request.userId);
  if (!member) {
    throw new Error('Not a league member');
  }
  if (options.paid && !member.paid) {
    throw new Error('Payment required');
  }
  if (options.commissioner && member.role !== 'commissioner') {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
    if (league?.commissionerId !== request.userId) {
      throw new Error('Commissioner access required');
    }
  }

  return member;
}
