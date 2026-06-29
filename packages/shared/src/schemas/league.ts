import { z } from 'zod';
import { PROVIDERS } from '../constants.js';

export const providerSchema = z.enum(PROVIDERS);

export const canonicalTeamSchema = z.object({
  externalTeamId: z.string(),
  name: z.string(),
  ownerName: z.string().optional(),
  ownerExternalId: z.string().optional(),
  wins: z.number().default(0),
  losses: z.number().default(0),
  ties: z.number().default(0),
  pointsFor: z.number().default(0),
  pointsAgainst: z.number().default(0),
});

export const canonicalStandingSchema = z.object({
  rank: z.number(),
  teamExternalId: z.string(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number().default(0),
  pointsFor: z.number(),
  pointsAgainst: z.number(),
});

export const canonicalMatchupSchema = z.object({
  week: z.number(),
  matchupId: z.string(),
  homeTeamExternalId: z.string(),
  awayTeamExternalId: z.string(),
  homeScore: z.number().optional(),
  awayScore: z.number().optional(),
  status: z.enum(['scheduled', 'in_progress', 'final']).default('scheduled'),
});

export const canonicalPlayerSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  position: z.string().optional(),
  team: z.string().optional(),
  status: z.string().optional(),
  injuryStatus: z.string().optional(),
});

export const canonicalLeagueSchema = z.object({
  externalId: z.string(),
  provider: providerSchema,
  name: z.string(),
  season: z.number(),
  currentWeek: z.number(),
  teams: z.array(canonicalTeamSchema),
  standings: z.array(canonicalStandingSchema),
  schedule: z.array(canonicalMatchupSchema),
});

export const leagueSummarySchema = z.object({
  externalId: z.string(),
  provider: providerSchema,
  name: z.string(),
  season: z.number(),
  teamCount: z.number().optional(),
});

export const createLeagueSchema = z
  .object({
    provider: providerSchema.optional(),
    externalLeagueId: z.string().optional(),
    name: z.string().min(1),
    season: z.number(),
    buyInCents: z.number().int().min(0).default(10000),
    platformFeeCents: z.number().int().min(0).default(500),
    payoutTemplate: z.string().default('standard'),
    draftDate: z.string().datetime().optional(),
    customRules: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasProvider = !!data.provider || !!data.externalLeagueId;
      if (!hasProvider) return true;
      return !!(data.provider && data.externalLeagueId);
    },
    { message: 'provider and externalLeagueId must both be set for synced leagues' },
  );

export const updateLeagueSettingsSchema = z.object({
  buyInCents: z.number().int().min(0).optional(),
  platformFeeCents: z.number().int().min(0).optional(),
  payoutTemplate: z.string().optional(),
  draftDate: z.string().datetime().optional().nullable(),
  customRules: z.string().optional().nullable(),
});

export type CanonicalTeam = z.infer<typeof canonicalTeamSchema>;
export type CanonicalStanding = z.infer<typeof canonicalStandingSchema>;
export type CanonicalMatchup = z.infer<typeof canonicalMatchupSchema>;
export type CanonicalPlayer = z.infer<typeof canonicalPlayerSchema>;
export type CanonicalLeague = z.infer<typeof canonicalLeagueSchema>;
export type LeagueSummary = z.infer<typeof leagueSummarySchema>;
export const leagueListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  season: z.number(),
  role: z.enum(['commissioner', 'member']),
  paid: z.boolean(),
  buyInCents: z.number(),
  platformFeeCents: z.number(),
  memberCount: z.number(),
  provider: providerSchema.nullable().optional(),
  currentWeek: z.number().optional(),
  teamName: z.string().nullable().optional(),
});

export type LeagueListItem = z.infer<typeof leagueListItemSchema>;
export type UpdateLeagueSettingsInput = z.infer<typeof updateLeagueSettingsSchema>;
