import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const providerEnum = pgEnum('provider', ['sleeper', 'yahoo', 'espn']);
export const memberRoleEnum = pgEnum('member_role', ['commissioner', 'member']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);
export const paymentTypeEnum = pgEnum('payment_type', [
  'buy_in',
  'side_pot',
  'weekly_prize',
]);
export const ledgerTypeEnum = pgEnum('ledger_type', [
  'buy_in',
  'platform_fee',
  'payout',
  'side_pot',
  'weekly_prize',
  'adjustment',
]);
export const feedTypeEnum = pgEnum('feed_type', [
  'post',
  'announcement',
  'award',
  'recap',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leagues = pgTable('leagues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  season: integer('season').notNull(),
  commissionerId: uuid('commissioner_id')
    .notNull()
    .references(() => users.id),
  buyInCents: integer('buy_in_cents').notNull().default(10000),
  platformFeeCents: integer('platform_fee_cents').notNull().default(500),
  payoutTemplate: varchar('payout_template', { length: 50 }).notNull().default('standard'),
  draftDate: timestamp('draft_date', { withTimezone: true }),
  customRules: text('custom_rules'),
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 255 }),
  connectOnboarded: boolean('connect_onboarded').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leagueProviderLinks = pgTable('league_provider_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  externalLeagueId: varchar('external_league_id', { length: 255 }).notNull(),
  encryptedCredentials: text('encrypted_credentials'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  syncStatus: varchar('sync_status', { length: 50 }).default('pending'),
  syncError: text('sync_error'),
  snapshot: jsonb('snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leagueMembers = pgTable('league_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  role: memberRoleEnum('role').notNull().default('member'),
  teamName: varchar('team_name', { length: 255 }),
  providerTeamId: varchar('provider_team_id', { length: 255 }),
  paid: boolean('paid').notNull().default(false),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  hostedRoster: jsonb('hosted_roster'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id),
  consumedById: uuid('consumed_by_id').references(() => users.id),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: paymentTypeEnum('type').notNull().default('buy_in'),
  amountCents: integer('amount_cents').notNull(),
  buyInCents: integer('buy_in_cents').notNull(),
  platformFeeCents: integer('platform_fee_cents').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const treasuryLedger = pgTable('treasury_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id),
  userId: uuid('user_id').references(() => users.id),
  type: ledgerTypeEnum('type').notNull(),
  amountCents: integer('amount_cents').notNull(),
  description: text('description'),
  stripeEventId: varchar('stripe_event_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const providerCredentials = pgTable('provider_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  encryptedPayload: text('encrypted_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const feedPosts = pgTable('feed_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  type: feedTypeEnum('type').notNull().default('post'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const feedReactions = pgTable('feed_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => feedPosts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id),
  question: text('question').notNull(),
  options: jsonb('options').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pollVotes = pgTable('poll_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  optionId: varchar('option_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const awards = pgTable('awards', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
  week: integer('week').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  winnerTeamName: varchar('winner_team_name', { length: 255 }),
  winnerUserName: varchar('winner_user_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  platform: varchar('platform', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  leagues: many(leagues),
  memberships: many(leagueMembers),
}));

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  commissioner: one(users, {
    fields: [leagues.commissionerId],
    references: [users.id],
  }),
  members: many(leagueMembers),
  providerLinks: many(leagueProviderLinks),
  invites: many(invites),
}));

export const leagueMembersRelations = relations(leagueMembers, ({ one }) => ({
  league: one(leagues, { fields: [leagueMembers.leagueId], references: [leagues.id] }),
  user: one(users, { fields: [leagueMembers.userId], references: [users.id] }),
}));
