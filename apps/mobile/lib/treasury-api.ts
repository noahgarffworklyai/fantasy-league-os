import { api } from './api';

export type TreasuryMember = {
  userId: string;
  displayName: string;
  teamName: string | null;
  providerTeamId: string | null;
  paid: boolean;
  paidAt: string | null;
};

export type TreasuryLedgerActivity = {
  id: string;
  title: string;
  when: string;
  type: string;
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
  paymentsDevMode?: boolean;
  members: TreasuryMember[];
  ledgerActivity?: TreasuryLedgerActivity[];
};

export async function fetchTreasury(leagueId: string): Promise<TreasuryData> {
  return api.get<TreasuryData>(`/leagues/${leagueId}/treasury`);
}

export async function markMemberPaid(leagueId: string, userId: string): Promise<{ ok: true }> {
  return api.post(`/leagues/${leagueId}/treasury/mark-paid`, { userId });
}

export async function updateTreasurySettings(
  leagueId: string,
  input: { buyInCents?: number; payoutTemplate?: string; platformFeeCents?: number },
): Promise<void> {
  await api.patch(`/leagues/${leagueId}/settings`, input);
}

export async function executePayouts(
  leagueId: string,
  standings: Array<{ place: number; userId: string; teamName?: string }>,
): Promise<{ payouts: Array<{ place: number; userId: string; amountCents: number }> }> {
  return api.post(`/leagues/${leagueId}/payouts/execute`, { standings });
}

export type LeagueStandingRow = {
  rank: number;
  teamExternalId: string;
  teamName?: string;
  ownerName?: string | null;
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
};

export async function fetchLeagueStandings(leagueId: string) {
  return api.get<{ standings: LeagueStandingRow[]; currentWeek?: number; source?: string }>(
    `/leagues/${leagueId}/standings`,
  );
}

export async function resetMemberPayment(
  leagueId: string,
  userId?: string,
): Promise<{ ok: true; userId: string }> {
  return api.post(`/leagues/${leagueId}/treasury/reset-payment`, userId ? { userId } : {});
}

export function payoutTemplateToStructure(template: string): 'all' | 'top2' | 'top3' | 'top4' | 'custom' {
  if (template === 'winner_takes_all') return 'all';
  if (template === 'top_four') return 'top4';
  return 'top3';
}

export function structureToPayoutTemplate(structure: 'all' | 'top2' | 'top3' | 'top4' | 'custom'): string {
  if (structure === 'all') return 'winner_takes_all';
  if (structure === 'top4') return 'top_four';
  return 'standard';
}
