import { z } from 'zod';

export const fantasyDoctorResultSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  injuryStatus: z.string().optional(),
  expectedReturnWeek: z.number().nullable(),
  playProbability: z.number().min(0).max(100),
  reinjuryRisk: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  sources: z.array(z.string()).default([]),
});

export const waiverRecommendationSchema = z.object({
  addPlayerId: z.string(),
  addPlayerName: z.string(),
  dropPlayerId: z.string().optional(),
  dropPlayerName: z.string().optional(),
  faabBidCents: z.number().optional(),
  priority: z.enum(['must_add', 'strong', 'speculative']),
  reasoning: z.string(),
});

export const waiverAssistantResultSchema = z.object({
  recommendations: z.array(waiverRecommendationSchema),
  dropCandidates: z.array(
    z.object({
      playerId: z.string(),
      playerName: z.string(),
      reason: z.string(),
    }),
  ),
});

export const tradeAssistantResultSchema = z.object({
  fairnessScore: z.number().min(0).max(100),
  recommendation: z.enum(['accept', 'decline', 'counter']),
  needAnalysis: z.string(),
  playoffImpact: z.string(),
  summary: z.string(),
});

export const aiWaiverRequestSchema = z.object({
  leagueId: z.string().uuid(),
  rosterPlayerIds: z.array(z.string()).optional(),
});

export const aiTradeRequestSchema = z.object({
  leagueId: z.string().uuid(),
  givePlayerIds: z.array(z.string()),
  receivePlayerIds: z.array(z.string()),
  opponentTeamExternalId: z.string().optional(),
});

export const aiDoctorRequestSchema = z.object({
  playerId: z.string(),
  leagueId: z.string().uuid().optional(),
});

export type FantasyDoctorResult = z.infer<typeof fantasyDoctorResultSchema>;
export type WaiverAssistantResult = z.infer<typeof waiverAssistantResultSchema>;
export type TradeAssistantResult = z.infer<typeof tradeAssistantResultSchema>;
