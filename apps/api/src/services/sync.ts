import {
  getAdapter,
  resolveEspnTeamId,
  resolveSleeperOwnerId,
  type EspnCredentials,
  type LeagueAdapter,
} from '@flos/league-adapters';
import type { CanonicalLeague, Provider } from '@flos/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { leagueMembers, leagueProviderLinks, users } from '../db/schema.js';
import { decryptCredentials } from '../lib/crypto.js';

async function refreshMemberTeamsFromSnapshot(
  leagueId: string,
  snapshot: CanonicalLeague,
  link: { provider: string; encryptedCredentials: string | null },
) {
  const rows = await db
    .select({
      memberId: leagueMembers.id,
      providerTeamId: leagueMembers.providerTeamId,
      teamName: leagueMembers.teamName,
      displayName: users.displayName,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId));

  if (rows.length === 0 || snapshot.teams.length === 0) return;

  const credentials = link.encryptedCredentials ? decryptCredentials(link.encryptedCredentials) : {};

  for (const row of rows) {
    let externalTeamId = row.providerTeamId;

    if (link.provider === 'espn') {
      externalTeamId = resolveEspnTeamId(snapshot.teams, credentials as EspnCredentials, {
        displayName: row.displayName ?? undefined,
        teamName: row.teamName,
        providerTeamId: row.providerTeamId,
      });
    } else if (link.provider === 'sleeper') {
      externalTeamId = resolveSleeperOwnerId(snapshot.teams, {
        displayName: row.displayName ?? undefined,
        teamName: row.teamName,
        providerTeamId: row.providerTeamId,
      });
    }

    if (!externalTeamId) continue;
    const team = snapshot.teams.find((entry) => entry.externalTeamId === externalTeamId);
    if (!team?.name) continue;

    await db
      .update(leagueMembers)
      .set({ teamName: team.name, providerTeamId: externalTeamId })
      .where(eq(leagueMembers.id, row.memberId));
  }
}

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

    await refreshMemberTeamsFromSnapshot(link.leagueId, snapshot, link);

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
