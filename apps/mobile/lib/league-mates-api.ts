import { sleeperUserAvatarUrl } from '@flos/shared';
import { useQuery } from '@tanstack/react-query';
import { personAvatar } from './avatars';
import { fetchLeagueDetail } from './league-snapshot-api';
import { fetchMyTeamRoster } from './team-roster-api';

import { fetchWithTimeout } from './fetch-timeout';

const SLEEPER_BASE = 'https://api.sleeper.app/v1';

export type LeagueMate = {
  id: string;
  userId: string;
  username: string;
  name: string;
  team: string;
  avatarUrl?: string;
};

type SleeperLeagueUser = {
  user_id: string;
  username?: string;
  display_name: string;
  avatar?: string;
  metadata?: { team_name?: string };
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string;
};

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${SLEEPER_BASE}${path}`);
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

function mapSleeperMates(
  users: SleeperLeagueUser[],
  rosters: SleeperRoster[],
  excludeRosterId?: string,
): LeagueMate[] {
  const userMap = new Map(users.map((u) => [u.user_id, u]));

  return rosters
    .filter((r) => String(r.roster_id) !== excludeRosterId)
    .map((r) => {
      const user = userMap.get(r.owner_id);
      const displayName = user?.display_name ?? `Manager ${r.roster_id}`;
      const username = user?.username?.trim() || displayName;
      const team = user?.metadata?.team_name?.trim() || displayName;
      return {
        id: String(r.roster_id),
        userId: r.owner_id,
        username,
        name: displayName,
        team,
        avatarUrl: user?.avatar ? sleeperUserAvatarUrl(user.avatar) : undefined,
      };
    });
}

async function fetchSleeperLeagueMates(
  externalLeagueId: string,
  excludeRosterId?: string,
): Promise<LeagueMate[]> {
  const [users, rosters] = await Promise.all([
    sleeperFetch<SleeperLeagueUser[]>(`/league/${externalLeagueId}/users`),
    sleeperFetch<SleeperRoster[]>(`/league/${externalLeagueId}/rosters`),
  ]);
  return mapSleeperMates(users ?? [], rosters ?? [], excludeRosterId);
}

function matesFromSnapshot(
  teams: Array<{
    externalTeamId: string;
    name: string;
    ownerName?: string;
    ownerExternalId?: string;
    ownerAvatarUrl?: string;
  }>,
  excludeRosterId?: string,
): LeagueMate[] {
  return teams
    .filter((t) => t.externalTeamId !== excludeRosterId)
    .map((t) => ({
      id: t.externalTeamId,
      userId: t.ownerExternalId ?? t.externalTeamId,
      username: t.ownerName ?? t.name,
      name: t.ownerName ?? t.name,
      team: t.name,
      avatarUrl: t.ownerAvatarUrl,
    }));
}

export function leagueMateAvatar(mate: Pick<LeagueMate, 'userId' | 'name' | 'avatarUrl'>): string {
  return personAvatar(mate.userId || mate.name, mate.avatarUrl);
}

export async function fetchLeagueMates(
  leagueId: string,
  isSynced: boolean,
): Promise<LeagueMate[]> {
  let excludeRosterId: string | undefined;
  try {
    const myRoster = await fetchMyTeamRoster(leagueId);
    excludeRosterId = myRoster.roster.rosterId;
  } catch {
    // Hosted/demo leagues may not expose a roster id.
  }

  const detail = await fetchLeagueDetail(leagueId);
  const externalLeagueId = detail.providerLink?.externalLeagueId;
  const provider = detail.providerLink?.provider?.toLowerCase();

  if (externalLeagueId && provider === 'sleeper') {
    try {
      const mates = await fetchSleeperLeagueMates(externalLeagueId, excludeRosterId);
      if (mates.length > 0) return mates;
    } catch {
      // Fall through to snapshot.
    }
  }

  const snapshotTeams = detail.providerLink?.snapshot?.teams ?? [];
  if (snapshotTeams.length > 0) {
    const mates = matesFromSnapshot(snapshotTeams, excludeRosterId);
    if (mates.length > 0) return mates;
  }

  if (isSynced && externalLeagueId) {
    return fetchSleeperLeagueMates(externalLeagueId, excludeRosterId);
  }

  return [];
}

export function useLeagueMates(leagueId: string | undefined, isSynced: boolean) {
  return useQuery({
    queryKey: ['league-mates', leagueId, isSynced],
    queryFn: () => fetchLeagueMates(leagueId!, isSynced),
    enabled: !!leagueId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: isSynced,
  });
}
