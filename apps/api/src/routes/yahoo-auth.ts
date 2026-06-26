import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { providerCredentials } from '../db/schema.js';
import { authMiddleware, type AuthenticatedRequest } from '../lib/auth-middleware.js';
import { encryptCredentials, decryptCredentials } from '../lib/crypto.js';

const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth';
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';

export async function yahooAuthRoutes(app: FastifyInstance) {
  app.get('/auth/yahoo/start', { preHandler: authMiddleware }, async (request, reply) => {
    if (!config.yahooClientId) {
      return reply.status(503).send({ error: 'Yahoo OAuth not configured' });
    }

    const { userId } = request as AuthenticatedRequest;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    const url = new URL(YAHOO_AUTH_URL);
    url.searchParams.set('client_id', config.yahooClientId);
    url.searchParams.set('redirect_uri', config.yahooRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'fspt-r');
    url.searchParams.set('state', state);

    return { url: url.toString() };
  });

  app.get('/auth/yahoo/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing code or state' });
    }

    let userId: string;
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as { userId: string };
      userId = parsed.userId;
    } catch {
      return reply.status(400).send({ error: 'Invalid state' });
    }

    const basicAuth = Buffer.from(`${config.yahooClientId}:${config.yahooClientSecret}`).toString('base64');
    const tokenRes = await fetch(YAHOO_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: config.yahooRedirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      return reply.status(400).send({ error: 'Token exchange failed' });
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const encrypted = encryptCredentials({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });

    const existing = await db
      .select()
      .from(providerCredentials)
      .where(eq(providerCredentials.userId, userId))
      .limit(1);

    const yahooCreds = await db
      .select()
      .from(providerCredentials)
      .where(eq(providerCredentials.userId, userId));

    const yahooEntry = yahooCreds.find((c) => c.provider === 'yahoo');
    if (yahooEntry) {
      await db
        .update(providerCredentials)
        .set({ encryptedPayload: encrypted, updatedAt: new Date() })
        .where(eq(providerCredentials.id, yahooEntry.id));
    } else {
      await db.insert(providerCredentials).values({
        userId,
        provider: 'yahoo',
        encryptedPayload: encrypted,
      });
    }

    return reply.redirect(`${config.appUrl}yahoo-connected`);
  });
}

export async function refreshYahooToken(userId: string): Promise<string | null> {
  const [cred] = await db
    .select()
    .from(providerCredentials)
    .where(eq(providerCredentials.userId, userId))
    .limit(1);

  const yahooCreds = await db
    .select()
    .from(providerCredentials)
    .where(eq(providerCredentials.userId, userId));

  const yahooEntry = yahooCreds.find((c) => c.provider === 'yahoo');
  if (!yahooEntry) return null;

  const payload = decryptCredentials<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>(yahooEntry.encryptedPayload);

  if (Date.now() < payload.expiresAt - 60000) {
    return payload.accessToken;
  }

  const basicAuth = Buffer.from(`${config.yahooClientId}:${config.yahooClientSecret}`).toString('base64');
  const tokenRes = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: payload.refreshToken,
    }),
  });

  if (!tokenRes.ok) return null;

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const encrypted = encryptCredentials({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? payload.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });

  await db
    .update(providerCredentials)
    .set({ encryptedPayload: encrypted, updatedAt: new Date() })
    .where(eq(providerCredentials.id, yahooEntry.id));

  return tokens.access_token;
}
