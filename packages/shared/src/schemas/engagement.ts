import { z } from 'zod';

export const feedPostSchema = z.object({
  id: z.string().uuid(),
  leagueId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  content: z.string(),
  type: z.enum(['post', 'announcement', 'award', 'recap']).default('post'),
  metadata: z.record(z.unknown()).optional(),
  reactionCount: z.number().default(0),
  createdAt: z.string(),
});

export const createFeedPostSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['post', 'announcement', 'award', 'recap']).default('post'),
  metadata: z.record(z.unknown()).optional(),
});

export const pollSchema = z.object({
  id: z.string().uuid(),
  leagueId: z.string().uuid(),
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      voteCount: z.number(),
    }),
  ),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
  userVoteOptionId: z.string().nullable().optional(),
});

export const createPollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  endsAt: z.string().datetime().optional(),
});

export const votePollSchema = z.object({
  optionId: z.string(),
});

export const awardSchema = z.object({
  id: z.string().uuid(),
  leagueId: z.string().uuid(),
  week: z.number(),
  title: z.string(),
  description: z.string(),
  winnerTeamName: z.string().optional(),
  winnerUserName: z.string().optional(),
  createdAt: z.string(),
});

export const createAwardSchema = z.object({
  week: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  winnerTeamName: z.string().optional(),
  winnerUserName: z.string().optional(),
});

export const powerRankingSchema = z.object({
  rank: z.number(),
  teamExternalId: z.string(),
  teamName: z.string(),
  score: z.number(),
  trend: z.enum(['up', 'down', 'same']).default('same'),
  notes: z.string().optional(),
});

export type FeedPost = z.infer<typeof feedPostSchema>;
export type Poll = z.infer<typeof pollSchema>;
export type Award = z.infer<typeof awardSchema>;
export type PowerRanking = z.infer<typeof powerRankingSchema>;
