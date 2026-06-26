import { getAdapter } from '@flos/league-adapters';
import type { LeagueAdapter } from '@flos/league-adapters';
import type { CanonicalLeague, Provider } from '@flos/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leagueProviderLinks } from '../db/schema.js';
import { decryptCredentials } from '../lib/crypto.js';

export async function syncLeagueProviderLink(linkId: string): Promise<CanonicalLeague> {
  const [link] = await db
    .select()
    .from(leagueProviderLinks)
    .where(eq(leagueProviderLinks.id, linkId))
    .limit(1);

  if (!link) throw new Error('Provider link not found');

  const adapter = getAdapter(link.provider as Provider);
  const credentials = link.encryptedCredentials
    ? decryptCredentials(link.encryptedCredentials)
    : {};

  try {
    const snapshot = await (adapter as LeagueAdapter).fetchLeague(
      link.externalLeagueId,
      credentials,
    );
    await db
      .update(leagueProviderLinks)
      .set({
        snapshot,
        lastSyncedAt: new Date(),
        syncStatus: 'ok',
        syncError: null,
      })
      .where(eq(leagueProviderLinks.id, linkId));

    return snapshot;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await db
      .update(leagueProviderLinks)
      .set({
        syncStatus: 'error',
        syncError: message,
        lastSyncedAt: new Date(),
      })
      .where(eq(leagueProviderLinks.id, linkId));
    throw err;
  }
}

export async function syncLeagueByLeagueId(leagueId: string): Promise<CanonicalLeague | null> {
  const [link] = await db
    .select()
    .from(leagueProviderLinks)
    .where(eq(leagueProviderLinks.leagueId, leagueId))
    .limit(1);

  if (!link) return null;
  return syncLeagueProviderLink(link.id);
}
