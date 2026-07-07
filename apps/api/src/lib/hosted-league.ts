type HostedMember = {
  userId: string;
  displayName: string;
  teamName: string | null;
};

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function demoSeasonStats(userId: string) {
  const seed = hashSeed(userId);
  const wins = seed % 9;
  const losses = (seed >> 4) % 9;
  const ties = wins + losses > 14 ? 0 : (seed >> 8) % 2;
  const pointsFor = Math.round((850 + (seed % 420)) * 10) / 10;
  const pointsAgainst = Math.round((780 + ((seed >> 6) % 360)) * 10) / 10;
  return { wins, losses, ties, pointsFor, pointsAgainst };
}

function demoWeekScore(userId: string, week: number) {
  const seed = hashSeed(`${userId}:${week}`);
  return Math.round((55 + (seed % 95)) * 10) / 10;
}

export function teamLabel(member: HostedMember) {
  return member.teamName?.trim() || `${member.displayName}'s Team`;
}

export function buildHostedStandings(members: HostedMember[]) {
  const rows = members.map((member) => {
    const stats = demoSeasonStats(member.userId);
    return {
      rank: 0,
      teamExternalId: member.userId,
      teamName: teamLabel(member),
      ownerName: member.displayName,
      ownerAvatarUrl: null as string | null,
      ...stats,
    };
  });

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return a.losses - b.losses;
  });

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildHostedMatchups(members: HostedMember[], week: number) {
  if (members.length < 2) return [];

  const rotated = [...members];
  if (week > 1) {
    const shift = (week - 1) % Math.max(1, members.length - 1);
    rotated.push(...rotated.splice(0, shift));
  }

  const matchups = [];
  for (let i = 0; i + 1 < rotated.length; i += 2) {
    const home = rotated[i]!;
    const away = rotated[i + 1]!;
    const homePoints = demoWeekScore(home.userId, week);
    const awayPoints = demoWeekScore(away.userId, week);
    matchups.push({
      matchupId: `hosted-${week}-${home.userId}-${away.userId}`,
      week,
      status: 'final' as const,
      home: {
        rosterId: home.userId,
        teamName: teamLabel(home),
        ownerName: home.displayName,
        ownerAvatarUrl: null,
        points: homePoints,
        lineup: [],
      },
      away: {
        rosterId: away.userId,
        teamName: teamLabel(away),
        ownerName: away.displayName,
        ownerAvatarUrl: null,
        points: awayPoints,
        lineup: [],
      },
    });
  }

  return matchups;
}
