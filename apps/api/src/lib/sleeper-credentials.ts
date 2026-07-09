import { resolveSleeperUserId, type SleeperCredentials } from '@flos/league-adapters';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { providerCredentials } from '../db/schema.js';
import { decryptCredentials } from './crypto.js';

async function userIdFromCredentials(credentials: SleeperCredentials): Promise<string | null> {
  if (credentials.userId) return credentials.userId;
  if (!credentials.username) return null;
  try {
    return await resolveSleeperUserId(credentials.username);
  } catch {
    return null;
  }
}

/** Resolve the Sleeper user id for a league member from link + saved provider credentials. */
export async function resolveSleeperUserIdForMember(
  userId: string,
  linkCredentials: Record<string, unknown> | null | undefined,
): Promise<string | null> {
  const fromLink = await userIdFromCredentials((linkCredentials ?? {}) as SleeperCredentials);
  if (fromLink) return fromLink;

  const [row] = await db
    .select()
    .from(providerCredentials)
    .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.provider, 'sleeper')))
    .limit(1);

  if (!row) return null;
  return userIdFromCredentials(decryptCredentials<SleeperCredentials>(row.encryptedPayload));
}

/** Persist Sleeper userId when only username was provided at connect time. */
export async function enrichSleeperCredentials(
  credentials: Record<string, unknown>,
): Promise<SleeperCredentials> {
  const creds = { ...credentials } as SleeperCredentials;
  if (!creds.userId && creds.username) {
    creds.userId = await resolveSleeperUserId(creds.username);
  }
  return creds;
}
