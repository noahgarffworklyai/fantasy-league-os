import type { InvitePreview, LeagueListItem } from '@flos/shared';
import * as Linking from 'expo-linking';
import { api } from './api';

export type { InvitePreview, LeagueListItem };

export type LeagueInviteLink = {
  token: string;
  webLink: string;
  deepLink: string;
  expiresAt: string;
};

function buildInviteLinks(token: string, expiresAt: string): LeagueInviteLink {
  const deepLink = Linking.createURL(`invite/${token}`);
  return {
    token,
    expiresAt,
    deepLink,
    webLink: deepLink,
  };
}

export async function ensureLeagueInvite(leagueId: string): Promise<LeagueInviteLink> {
  const { invites } = await api.get<{
    invites: Array<{ token: string; expiresAt: string; consumedAt: string | null }>;
  }>(`/invites/league/${leagueId}`);

  const now = Date.now();
  const active = invites.find(
    (invite) => new Date(invite.expiresAt).getTime() > now,
  );

  if (active) {
    return buildInviteLinks(active.token, active.expiresAt);
  }

  const res = await api.post<{
    invite: { token: string; expiresAt: string; webLink: string; deepLink: string };
  }>('/invites', { leagueId });

  return buildInviteLinks(res.invite.token, res.invite.expiresAt);
}

export async function fetchLeaguesFromApi(): Promise<LeagueListItem[]> {
  const res = await api.get<{ leagues: LeagueListItem[] }>('/leagues');
  return res.leagues;
}

export type CreateHostedLeagueInput = {
  name: string;
  size: number;
  buyIn: number;
  scoring: string;
  draftType: string;
  draftDate?: string;
};

export async function createHostedLeagueOnApi(input: CreateHostedLeagueInput) {
  const season = new Date().getFullYear();
  return api.post<{ league: { id: string; name: string; buyInCents: number; platformFeeCents: number } }>(
    '/leagues',
    {
      name: input.name,
      season,
      buyInCents: input.buyIn * 100,
      platformFeeCents: Math.round(input.buyIn * 100 * 0.05),
      payoutTemplate: 'standard',
      draftDate: input.draftDate,
      customRules: JSON.stringify({
        scoring: input.scoring,
        size: input.size,
        draftType: input.draftType,
        draftDate: input.draftDate ?? null,
      }),
    },
  );
}

export type SyncLeagueFeatures = {
  pot: boolean;
  payments: boolean;
  payouts: boolean;
  reports: boolean;
  insights: boolean;
};

export type CreateSyncedLeagueInput = {
  provider: 'sleeper' | 'espn';
  externalLeagueId: string;
  name: string;
  season: number;
  teamCount?: number;
  credentials?: Record<string, unknown>;
  buyIn?: number;
  features?: SyncLeagueFeatures;
};

export async function createSyncedLeagueOnApi(input: CreateSyncedLeagueInput) {
  const buyIn = input.buyIn ?? 0;
  return api.post<{ league: { id: string; name: string; buyInCents: number; platformFeeCents: number } }>(
    '/leagues',
    {
      provider: input.provider,
      externalLeagueId: input.externalLeagueId,
      name: input.name,
      season: input.season,
      buyInCents: buyIn * 100,
      platformFeeCents: buyIn > 0 ? Math.round(buyIn * 100 * 0.05) : 0,
      payoutTemplate: 'standard',
      customRules: JSON.stringify({
        synced: true,
        provider: input.provider,
        features: input.features ?? null,
        teamCount: input.teamCount ?? null,
      }),
      credentials: input.credentials,
    },
  );
}

export function parseInviteToken(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/(?:invite\/|join\/)([A-Za-z0-9_-]+)/);
  return match?.[1] ?? trimmed;
}

export async function previewInvite(token: string): Promise<InvitePreview> {
  return api.get<InvitePreview>(`/invites/${encodeURIComponent(token)}`);
}

export async function redeemInvite(token: string): Promise<{ leagueId: string }> {
  return api.post<{ leagueId: string }>('/invites/redeem', { token });
}

export async function reconnectEspnLeague(
  leagueId: string,
  credentials: { espnS2: string; swid: string },
): Promise<{ syncStatus: 'ok'; externalLeagueId: string }> {
  return api.patch(`/leagues/${leagueId}/provider-credentials`, credentials);
}

export async function leaveLeague(leagueId: string): Promise<{ ok: true }> {
  return api.delete(`/leagues/${leagueId}/members/me`);
}

export async function deleteLeague(leagueId: string): Promise<{ ok: true }> {
  return api.delete(`/leagues/${leagueId}`);
}
