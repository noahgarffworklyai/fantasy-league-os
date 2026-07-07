import { espnPlayerImageUrl } from '@flos/shared';
import type { EspnCredentials } from './types.js';
import {
  ESPN_STARTER_SLOT_IDS,
  enrichEspnTeams,
  enrichTeamsWithDirectory,
  espnFetchLeague,
  espnFetchTeamDirectory,
  espnLineupSlotLabel,
  espnPlayerName,
  espnPlayerPosition,
  espnTeamName,
  mapEspnInjury,
  resolveEspnCurrentWeek,
  resolveEspnSeason,
  type EspnRosterEntry,
  type EspnTeamWithOwner,
} from './espn-api.js';

export type EspnLineupEntry = {
  slot: string;
  playerId: string;
  name: string;
  position: string;
  points: number;
  status?: string;
  imageUrl: string;
};

export type EspnMatchupSide = {
  rosterId: string;
  teamName: string;
  ownerName: string;
  points: number;
  lineup: EspnLineupEntry[];
};

export type EspnWeekMatchup = {
  matchupId: string;
  week: number;
  home: EspnMatchupSide;
  away: EspnMatchupSide;
  status: 'scheduled' | 'in_progress' | 'final';
};

function lineupFromEntries(entries?: EspnRosterEntry[]): EspnLineupEntry[] {
  if (!entries?.length) return [];
  return entries
    .filter((entry) => ESPN_STARTER_SLOT_IDS.has(entry.lineupSlotId))
    .sort((a, b) => a.lineupSlotId - b.lineupSlotId)
    .map((entry) => {
      const player = entry.playerPoolEntry?.player;
      return {
        slot: espnLineupSlotLabel(entry.lineupSlotId, player),
        playerId: String(entry.playerId),
        name: espnPlayerName(player, entry.playerId),
        position: espnPlayerPosition(player),
        points: entry.playerPoolEntry?.appliedStatTotal ?? 0,
        status: mapEspnInjury(player?.injuryStatus) ?? undefined,
        imageUrl: espnPlayerImageUrl(entry.playerId),
      };
    });
}

function inferStatus(
  week: number,
  currentWeek: number,
  homePoints: number,
  awayPoints: number,
): EspnWeekMatchup['status'] {
  if (week < currentWeek) return 'final';
  if (week > currentWeek) return 'scheduled';
  if (homePoints > 0 || awayPoints > 0) return 'in_progress';
  return 'scheduled';
}

function teamSide(
  teamId: number,
  points: number,
  entries: EspnRosterEntry[] | undefined,
  teamMap: Map<number, EspnTeamWithOwner>,
): EspnMatchupSide {
  const team = teamMap.get(teamId);
  return {
    rosterId: String(teamId),
    teamName: team ? espnTeamName(team) : `Team ${teamId}`,
    ownerName: team?.ownerDisplayName ?? 'Owner',
    points,
    lineup: lineupFromEntries(entries),
  };
}

/** Live week matchups with starter lineups and player points from ESPN. */
export async function fetchEspnWeekMatchups(
  externalLeagueId: string,
  week: number,
  credentials: EspnCredentials,
  season?: number,
): Promise<EspnWeekMatchup[]> {
  const data = await espnFetchLeague(externalLeagueId, credentials, {
    season,
    scoringPeriodId: week,
    views: ['mMatchupScore', 'mTeam', 'mSettings'],
  });

  const resolvedSeason = resolveEspnSeason(data.settings, season);
  const directory = await espnFetchTeamDirectory(externalLeagueId, credentials, resolvedSeason);
  const mergedRaw = enrichTeamsWithDirectory(data.teams ?? [], directory);
  const currentWeek = resolveEspnCurrentWeek(data.settings);
  const teams = enrichEspnTeams(mergedRaw, data.members ?? []);
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  return (data.schedule ?? [])
    .filter((matchup) => matchup.matchupPeriodId === week && matchup.home && matchup.away)
    .map((matchup) => {
      const homePoints = matchup.home!.totalPoints ?? 0;
      const awayPoints = matchup.away!.totalPoints ?? 0;
      return {
        matchupId: String(matchup.id),
        week,
        home: teamSide(
          matchup.home!.teamId,
          homePoints,
          matchup.home!.rosterForCurrentScoringPeriod?.entries,
          teamMap,
        ),
        away: teamSide(
          matchup.away!.teamId,
          awayPoints,
          matchup.away!.rosterForCurrentScoringPeriod?.entries,
          teamMap,
        ),
        status: inferStatus(week, currentWeek, homePoints, awayPoints),
      };
    });
}
