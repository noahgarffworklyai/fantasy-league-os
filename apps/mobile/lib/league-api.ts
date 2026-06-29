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
    (invite) => !invite.consumedAt && new Date(invite.expiresAt).getTime() > now,
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
  const potCents = input.buyIn * 100 * input.size;
  return api.post<{ league: { id: string; name: string; buyInCents: number; platformFeeCents: number } }>(
    '/leagues',
    {
      name: input.name,
      season,
      buyInCents: input.buyIn * 100,
      platformFeeCents: Math.max(500, Math.round(potCents * 0.03)),
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
