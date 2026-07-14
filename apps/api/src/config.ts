import 'dotenv/config';

function normalizeStripeSecretKey(raw: string): string {
  const key = raw.trim();
  if (!key) return '';
  if (/REPLACE|PASTE|YOUR_|xxx|\.\.\./i.test(key) || key.length < 20) return '';
  return key;
}

const stripeSecretKey = normalizeStripeSecretKey(process.env.STRIPE_SECRET_KEY ?? '');

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://flos:flos@localhost:5432/fantasy_league_os',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production',
  stripeSecretKey,
  /** No Stripe key — instant fake checkout for local testing. */
  paymentsDevMode: !stripeSecretKey,
  /** sk_test_ key — real Checkout UI, test cards only. */
  paymentsTestMode: stripeSecretKey.startsWith('sk_test_'),
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripeConnectClientId: process.env.STRIPE_CONNECT_CLIENT_ID ?? '',
  yahooClientId: process.env.YAHOO_CLIENT_ID ?? '',
  yahooClientSecret: process.env.YAHOO_CLIENT_SECRET ?? '',
  yahooRedirectUri: process.env.YAHOO_REDIRECT_URI ?? 'http://localhost:3000/auth/yahoo/callback',
  aiApiKey: process.env.AI_API_KEY ?? '',
  aiProvider: process.env.AI_PROVIDER ?? 'openai',
  appUrl: process.env.APP_URL ?? 'fantasyleagueos://',
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
};
