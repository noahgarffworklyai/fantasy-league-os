import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { fetchTreasury, type TreasuryMember } from './treasury-api';

export type LeagueMemberRow = TreasuryMember & {
  role: 'commissioner' | 'member';
};

export async function fetchLeagueMemberRows(leagueId: string): Promise<LeagueMemberRow[]> {
  const [treasury, membersRes] = await Promise.all([
    fetchTreasury(leagueId),
    api.get<{ members: Array<{ userId: string; role: 'commissioner' | 'member' }> }>(
      `/leagues/${leagueId}/members`,
    ),
  ]);

  const roleByUser = new Map(membersRes.members.map((m) => [m.userId, m.role]));

  return treasury.members.map((member) => ({
    ...member,
    role: (member.userId ? roleByUser.get(member.userId) : undefined) ?? 'member',
  }));
}

export function useLeagueMemberStats(leagueId: string | undefined, capacity?: number) {
  const query = useQuery({
    queryKey: ['league-members', leagueId],
    queryFn: () => fetchLeagueMemberRows(leagueId!),
    enabled: !!leagueId,
  });

  const joined = query.data?.length ?? 0;
  const paid = query.data?.filter((m) => m.paid).length ?? 0;
  const size = capacity ?? joined;

  return { ...query, joined, paid, size, pending: Math.max(0, size - joined) };
}
