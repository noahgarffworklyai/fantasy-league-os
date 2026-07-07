import type { CanonicalTeam } from '@flos/shared';
import { espnPlayerImageUrl } from '@flos/shared';
import type { EspnCredentials } from './types.js';
import {
  espnFetchLeague,
  espnLineupSlotLabel,
  espnPlayerName,
  espnPlayerPosition,
  espnPlayerTeam,
  espnRosterPositions,
  espnTeamName,
  mapEspnInjury,
  normalizeSwid,
  resolveEspnCurrentWeek,
  type EspnRosterEntry,
} from './espn-api.js';
import type { MyRosterResult, RosterPlayerRow } from './sleeper-roster.js';

function toRow(
  entry: EspnRosterEntry,
  extras: { slot?: string; bench?: boolean },
): RosterPlayerRow {
  const player = entry.playerPoolEntry?.player;
  const playerId = String(entry.playerId);
  const position = espnPlayerPosition(player);
  return {
    id: playerId,
    name: espnPlayerName(player, entry.playerId),
    position,
    team: espnPlayerTeam(player),
    slot: extras.slot ?? (extras.bench ? 'BN' : espnLineupSlotLabel(entry.lineupSlotId, player)),
    injuryStatus: mapEspnInjury(player?.injuryStatus),
    status: player?.active === false ? 'inactive' : undefined,
    imageUrl: espnPlayerImageUrl(entry.playerId),
    points: entry.playerPoolEntry?.appliedStatTotal,
  };
}

export function resolveEspnTeamId(
  teams: CanonicalTeam[],
  credentials: EspnCredentials,
  input: { displayName?: string; teamName?: string | null; providerTeamId?: string | null },
): string | null {
  if (input.providerTeamId) {
    const match = teams.find((team) => team.externalTeamId === input.providerTeamId);
    if (match) return match.externalTeamId;
  }

  const normalizedSwid = normalizeSwid(credentials.swid);
  const bySwid = teams.find(
    (team) => team.ownerExternalId && normalizeSwid(team.ownerExternalId) === normalizedSwid,
  );
  if (bySwid) return bySwid.externalTeamId;

  if (input.teamName) {
    const exact = teams.find((team) => team.name === input.teamName);
    if (exact) return exact.externalTeamId;
    const partial = teams.find(
      (team) =>
        team.name.toLowerCase().includes(input.teamName!.toLowerCase()) ||
        input.teamName!.toLowerCase().includes(team.name.toLowerCase()),
    );
    if (partial) return partial.externalTeamId;
  }

  const normalizedUser = input.displayName?.trim().toLowerCase();
  if (normalizedUser) {
    const byOwner = teams.find((team) => team.ownerName?.trim().toLowerCase() === normalizedUser);
    if (byOwner) return byOwner.externalTeamId;
    const first = normalizedUser.split(/\s+/)[0];
    const byFirst = teams.find((team) => team.ownerName?.trim().toLowerCase().startsWith(first));
    if (byFirst) return byFirst.externalTeamId;
  }

  return null;
}

/** Fetch the authenticated user's ESPN roster with starters, bench, and IR. */
export async function fetchEspnMyRoster(
  externalLeagueId: string,
  teamId: string,
  credentials: EspnCredentials,
  options: { week?: number; season?: number } = {},
): Promise<MyRosterResult> {
  const settingsData = await espnFetchLeague(externalLeagueId, credentials, {
    season: options.season,
    views: ['mSettings', 'mTeam'],
  });
  const targetWeek = options.week ?? resolveEspnCurrentWeek(settingsData.settings);
  const rosterPositions = espnRosterPositions(settingsData.settings);

  const data = await espnFetchLeague(externalLeagueId, credentials, {
    season: options.season ?? settingsData.settings?.seasonId,
    scoringPeriodId: targetWeek,
    forTeamId: Number(teamId),
    views: ['mRoster', 'mTeam'],
  });

  const team = (data.teams ?? []).find((entry) => String(entry.id) === teamId);
  if (!team) {
    throw new Error('Could not find your team in this league');
  }

  const entries = team.roster?.entries ?? [];
  const starters = entries
    .filter((entry) => entry.lineupSlotId !== 20 && entry.lineupSlotId !== 21)
    .sort((a, b) => a.lineupSlotId - b.lineupSlotId)
    .map((entry, index) =>
      toRow(entry, {
        slot: rosterPositions[index] ?? espnLineupSlotLabel(entry.lineupSlotId, entry.playerPoolEntry?.player),
      }),
    );

  const bench = entries
    .filter((entry) => entry.lineupSlotId === 20)
    .map((entry) => toRow(entry, { bench: true }));

  const reserve = entries
    .filter((entry) => entry.lineupSlotId === 21)
    .map((entry) => toRow(entry, { slot: 'IR' }));

  const ownerName =
    settingsData.members?.find(
      (member) => member.id === (team.primaryOwner ?? team.owners?.[0]),
    )?.displayName ?? 'Owner';

  return {
    rosterId: teamId,
    teamName: espnTeamName(team),
    ownerName,
    rosterPositions,
    week: targetWeek,
    starters,
    bench,
    reserve,
  };
}
