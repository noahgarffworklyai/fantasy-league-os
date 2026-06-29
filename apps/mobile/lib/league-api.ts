import type { InvitePreview, LeagueListItem } from '@flos/shared';
import { api } from './api';

export type { InvitePreview, LeagueListItem };

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
