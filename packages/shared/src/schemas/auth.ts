import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});

export const createInviteSchema = z.object({
  leagueId: z.string().uuid(),
  email: z.string().email().optional(),
});

export const invitePreviewSchema = z.object({
  token: z.string(),
  leagueName: z.string(),
  buyInCents: z.number(),
  platformFeeCents: z.number(),
  memberCount: z.number(),
  maxMembers: z.number().optional(),
  expiresAt: z.string(),
});

export const redeemInviteSchema = z.object({
  token: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type InvitePreview = z.infer<typeof invitePreviewSchema>;
