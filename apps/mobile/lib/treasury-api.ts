import { api } from './api';

export type TreasuryMember = {
  userId: string;
  displayName: string;
  teamName: string | null;
  providerTeamId: string | null;
  paid: boolean;
  paidAt: string | null;
};

export type TreasuryData = {
  leagueId: string;
  potCents: number;
  platformFeeCents: number;
  buyInCents: number;
  paidMemberCount: number;
  totalMemberCount: number;
  payoutTemplate: string;
  payoutPreview: Array<{ place: number; percent: number; amountCents: number }>;
  stripeConnectOnboarded: boolean;
  members: TreasuryMember[];
};

export async function fetchTreasury(leagueId: string): Promise<TreasuryData> {
  return api.get<TreasuryData>(`/leagues/${leagueId}/treasury`);
}
