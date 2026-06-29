import {
  createAwardSchema,
  createFeedPostSchema,
  createPollSchema,
  votePollSchema,
} from '@flos/shared';
import { and, count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import {
  awards,
  feedPosts,
  feedReactions,
  leagueProviderLinks,
  polls,
  pollVotes,
  pushTokens,
  users,
} from '../db/schema.js';
import { authMiddleware, requireLeagueMembership, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { randomUUID } from 'node:crypto';

export async function engagementRoutes(app: FastifyInstance) {
  // Feed
  app.get('/leagues/:id/feed', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    try {
      await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const posts = await db
      .select({
        post: feedPosts,
        authorName: users.displayName,
      })
      .from(feedPosts)
      .innerJoin(users, eq(feedPosts.authorId, users.id))
      .where(eq(feedPosts.leagueId, id))
      .orderBy(feedPosts.createdAt);

    const withReactions = await Promise.all(
      posts.map(async ({ post, authorName }) => {
        const [reactionCount] = await db
          .select({ count: count() })
          .from(feedReactions)
          .where(eq(feedReactions.postId, post.id));
        return {
          id: post.id,
          leagueId: post.leagueId,
          authorId: post.authorId,
          authorName,
          content: post.content,
          type: post.type,
          metadata: post.metadata,
          reactionCount: reactionCount?.count ?? 0,
          createdAt: post.createdAt.toISOString(),
        };
      }),
    );

    return { posts: withReactions.reverse() };
  });

  app.post('/leagues/:id/feed', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = createFeedPostSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const [post] = await db
      .insert(feedPosts)
      .values({
        leagueId: id,
        authorId: authReq.userId,
        content: body.content,
        type: body.type,
        metadata: body.metadata,
      })
      .returning();

    return reply.status(201).send({ post });
  });

  app.post('/feed/:postId/react', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { postId } = request.params as { postId: string };

    const existing = await db
      .select()
      .from(feedReactions)
      .where(and(eq(feedReactions.postId, postId), eq(feedReactions.userId, authReq.userId)))
      .limit(1);

    if (existing.length) {
      await db.delete(feedReactions).where(eq(feedReactions.id, existing[0].id));
      return { reacted: false };
    }

    await db.insert(feedReactions).values({ postId, userId: authReq.userId });
    return { reacted: true };
  });

  // Polls
  app.get('/leagues/:id/polls', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    try {
      await requireLeagueMembership(authReq, id);
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const leaguePolls = await db.select().from(polls).where(eq(polls.leagueId, id));
    const result = await Promise.all(
      leaguePolls.map(async (poll) => {
        const options = poll.options as Array<{ id: string; text: string; voteCount: number }>;
        const votes = await db.select().from(pollVotes).where(eq(pollVotes.pollId, poll.id));
        const userVote = votes.find((v) => v.userId === authReq.userId);
        const optionsWithCounts = options.map((o) => ({
          ...o,
          voteCount: votes.filter((v) => v.optionId === o.id).length,
        }));
        return {
          id: poll.id,
          leagueId: poll.leagueId,
          question: poll.question,
          options: optionsWithCounts,
          endsAt: poll.endsAt?.toISOString() ?? null,
          createdAt: poll.createdAt.toISOString(),
          userVoteOptionId: userVote?.optionId ?? null,
        };
      }),
    );

    return { polls: result };
  });

  app.post('/leagues/:id/polls', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = createPollSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const options = body.options.map((text) => ({
      id: randomUUID().slice(0, 8),
      text,
      voteCount: 0,
    }));

    const [poll] = await db
      .insert(polls)
      .values({
        leagueId: id,
        createdById: authReq.userId,
        question: body.question,
        options,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      })
      .returning();

    return reply.status(201).send({ poll });
  });

  app.post('/polls/:pollId/vote', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { pollId } = request.params as { pollId: string };
    const body = votePollSchema.parse(request.body);

    const existing = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, authReq.userId)))
      .limit(1);

    if (existing.length) {
      await db
        .update(pollVotes)
        .set({ optionId: body.optionId })
        .where(eq(pollVotes.id, existing[0].id));
    } else {
      await db.insert(pollVotes).values({
        pollId,
        userId: authReq.userId,
        optionId: body.optionId,
      });
    }

    return { ok: true };
  });

  // Awards
  app.get('/leagues/:id/awards', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    try {
      await requireLeagueMembership(authReq, id, { paid: true });
    } catch {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const leagueAwards = await db.select().from(awards).where(eq(awards.leagueId, id));
    return {
      awards: leagueAwards.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });

  app.post('/leagues/:id/awards', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
    const body = createAwardSchema.parse(request.body);

    try {
      await requireLeagueMembership(authReq, id, { commissioner: true });
    } catch {
      return reply.status(403).send({ error: 'Commissioner access required' });
    }

    const [award] = await db
      .insert(awards)
      .values({
        leagueId: id,
        week: body.week,
        title: body.title,
        description: body.description,
        winnerTeamName: body.winnerTeamName,
        winnerUserName: body.winnerUserName,
      })
      .returning();

    return reply.status(201).send({ award });
  });

  // Power rankings (rule-based from snapshot)
  app.get('/leagues/:id/power-rankings', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };
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
      standings?: Array<{
        rank: number;
        teamExternalId: string;
        wins: number;
        losses: number;
        pointsFor: number;
      }>;
      teams?: Array<{ externalTeamId: string; name: string }>;
    } | null;

    const teamMap = new Map(
      (snapshot?.teams ?? []).map((t) => [t.externalTeamId, t.name]),
    );

    const rankings = (snapshot?.standings ?? [])
      .map((s) => {
        const winPct = s.wins / Math.max(s.wins + s.losses, 1);
        const score = winPct * 50 + (s.pointsFor / 2000) * 50;
        return {
          rank: 0,
          teamExternalId: s.teamExternalId,
          teamName: teamMap.get(s.teamExternalId) ?? s.teamExternalId,
          score: Math.round(score * 10) / 10,
          trend: 'same' as const,
          notes: `${s.wins}-${s.losses}, ${s.pointsFor.toFixed(1)} PF`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return { rankings };
  });

  // Weekly recap (template-based)
  app.get('/leagues/:id/recap/:week', { preHandler: authMiddleware }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id, week } = request.params as { id: string; week: string };
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
      schedule?: Array<{
        week: number;
        homeTeamExternalId: string;
        awayTeamExternalId: string;
        homeScore?: number;
        awayScore?: number;
      }>;
      teams?: Array<{ externalTeamId: string; name: string }>;
    } | null;

    const weekNum = Number(week);
    const matchups = (snapshot?.schedule ?? []).filter((m) => m.week === weekNum);
    const teamMap = new Map(
      (snapshot?.teams ?? []).map((t) => [t.externalTeamId, t.name]),
    );

    const highlights = matchups.map((m) => {
      const home = teamMap.get(m.homeTeamExternalId) ?? m.homeTeamExternalId;
      const away = teamMap.get(m.awayTeamExternalId) ?? m.awayTeamExternalId;
      const winner =
        (m.homeScore ?? 0) >= (m.awayScore ?? 0) ? home : away;
      return `${winner} wins: ${home} ${m.homeScore ?? 0} - ${away} ${m.awayScore ?? 0}`;
    });

    return {
      week: weekNum,
      title: `Week ${weekNum} Recap`,
      content: highlights.length
        ? highlights.join('\n')
        : 'No matchup data available for this week yet.',
      generatedAt: new Date().toISOString(),
    };
  });

  // Push tokens
  app.post('/push/register', { preHandler: authMiddleware }, async (request) => {
    const authReq = request as AuthenticatedRequest;
    const { token, platform } = request.body as { token: string; platform: string };

    const existing = await db
      .select()
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, authReq.userId), eq(pushTokens.token, token)))
      .limit(1);

    if (!existing.length) {
      await db.insert(pushTokens).values({
        userId: authReq.userId,
        token,
        platform,
      });
    }

    return { ok: true };
  });
}
