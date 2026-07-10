import type { CanonicalLeague, CanonicalStanding, CanonicalTeam } from '@flos/shared';
import { getAdapter, type LeagueAdapter } from '@flos/league-adapters';
import type { Provider } from '@flos/shared';
import { computePayoutPreview } from './treasury.js';

export type DbLeagueMember = {
  userId: string;
  displayName: string | null;
  teamName: string | null;
  providerTeamId: string | null;
  paid: boolean;
  paidAt: Date | null;
};

export type TreasuryRosterMember = {
  id: string;
  userId: string | null;
  displayName: string;
  teamName: string | null;
  providerTeamId: string | null;
  ownerExternalId: string | null;
  ownerAvatarUrl: string | null;
  paid: boolean;
  paidAt: string | null;
  isAppMember: boolean;
  rank: number | null;
};

export type TreasuryPayoutSlot = {
  place: number;
  percent: number;
  amountCents: number;
  teamExternalId: string | null;
  teamName: string | null;
  ownerName: string | null;
  userId: string | null;
};

function findDbMemberForTeam(team: CanonicalTeam, dbMembers: DbLeagueMember[]): DbLeagueMember | undefined {
  return (
    dbMembers.find((m) => m.providerTeamId && m.providerTeamId === team.externalTeamId) ??
    dbMembers.find(
      (m) =>
        m.teamName &&
        team.name &&
        m.teamName.trim().toLowerCase() === team.name.trim().toLowerCase(),
    )
  );
}

export function mergeTreasuryRoster(
  teams: CanonicalTeam[],
  standings: CanonicalStanding[],
  dbMembers: DbLeagueMember[],
): TreasuryRosterMember[] {
  const rankByTeam = new Map(standings.map((s) => [s.teamExternalId, s.rank]));

  return teams
    .map((team) => {
      const dbMatch = findDbMemberForTeam(team, dbMembers);
      const ownerLabel = team.ownerName?.trim() || team.name?.trim() || `Team ${team.externalTeamId}`;

      return {
        id: dbMatch?.userId ?? team.externalTeamId,
        userId: dbMatch?.userId ?? null,
        displayName: dbMatch?.displayName?.trim() || ownerLabel,
        teamName: team.name ?? dbMatch?.teamName ?? null,
        providerTeamId: team.externalTeamId,
        ownerExternalId: team.ownerExternalId ?? null,
        ownerAvatarUrl: team.ownerAvatarUrl ?? null,
        paid: dbMatch?.paid ?? false,
        paidAt: dbMatch?.paidAt?.toISOString() ?? null,
        isAppMember: !!dbMatch,
        rank: rankByTeam.get(team.externalTeamId) ?? null,
      };
    })
    .sort((a, b) => {
      if (a.rank != null && b.rank != null) return a.rank - b.rank;
      if (a.rank != null) return -1;
      if (b.rank != null) return 1;
      return (a.teamName ?? a.displayName).localeCompare(b.teamName ?? b.displayName);
    });
}

export function dbMembersToTreasuryRoster(dbMembers: DbLeagueMember[]): TreasuryRosterMember[] {
  return dbMembers.map((m, index) => ({
    id: m.userId,
    userId: m.userId,
    displayName: m.displayName?.trim() || m.teamName?.trim() || 'Member',
    teamName: m.teamName,
    providerTeamId: m.providerTeamId,
    ownerExternalId: null,
    ownerAvatarUrl: null,
    paid: m.paid,
    paidAt: m.paidAt?.toISOString() ?? null,
    isAppMember: true,
    rank: index + 1,
  }));
}

export function buildPayoutPreviewWithMembers(
  potCents: number,
  template: string,
  standings: CanonicalStanding[],
  teams: CanonicalTeam[],
  roster: TreasuryRosterMember[],
): TreasuryPayoutSlot[] {
  const preview = computePayoutPreview(potCents, template);
  const teamMap = new Map(teams.map((t) => [t.externalTeamId, t]));
  const rosterByTeam = new Map(
    roster.filter((m) => m.providerTeamId).map((m) => [m.providerTeamId!, m]),
  );

  return preview.map((slot) => {
    const standing = standings.find((s) => s.rank === slot.place);
    const team = standing ? teamMap.get(standing.teamExternalId) : undefined;
    const rosterMember = standing ? rosterByTeam.get(standing.teamExternalId) : undefined;

    return {
      place: slot.place,
      percent: slot.percent,
      amountCents: slot.amountCents,
      teamExternalId: standing?.teamExternalId ?? null,
      teamName: rosterMember?.teamName ?? team?.name ?? null,
      ownerName: rosterMember?.displayName ?? team?.ownerName ?? null,
      userId: rosterMember?.userId ?? null,
    };
  });
}

export async function resolveTreasuryLeagueSnapshot(input: {
  provider: string;
  externalLeagueId: string;
  snapshot: CanonicalLeague | null;
  encryptedCredentials?: string | null;
  decryptCredentials?: (value: string) => Record<string, unknown>;
}): Promise<{ teams: CanonicalTeam[]; standings: CanonicalStanding[] }> {
  const snapshotTeams = input.snapshot?.teams ?? [];
  const snapshotStandings = input.snapshot?.standings ?? [];

  if (snapshotTeams.length > 0) {
    return { teams: snapshotTeams, standings: snapshotStandings };
  }

  if (input.provider !== 'sleeper' || !input.externalLeagueId) {
    return { teams: [], standings: [] };
  }

  try {
    const adapter = getAdapter(input.provider as Provider) as LeagueAdapter;
    const credentials =
      input.encryptedCredentials && input.decryptCredentials
        ? input.decryptCredentials(input.encryptedCredentials)
        : {};
    const fresh = await adapter.fetchLeague(input.externalLeagueId, credentials);
    return { teams: fresh.teams, standings: fresh.standings };
  } catch {
    return { teams: [], standings: [] };
  }
}
