import { describe, expect, it } from 'vitest';
import { resolveSleeperOwnerId } from '../src/sleeper-roster.js';
import type { CanonicalTeam } from '@flos/shared';

const teams: CanonicalTeam[] = [
  {
    externalTeamId: '3',
    name: 'Gridiron Gang',
    ownerName: 'Marcus Hill',
    ownerExternalId: 'owner-a',
    wins: 5,
    losses: 2,
    ties: 0,
    pointsFor: 800,
    pointsAgainst: 720,
  },
  {
    externalTeamId: '7',
    name: 'Park Place',
    ownerName: 'Jenna Park',
    ownerExternalId: 'owner-b',
    wins: 4,
    losses: 3,
    ties: 0,
    pointsFor: 760,
    pointsAgainst: 740,
  },
];

describe('resolveSleeperOwnerId', () => {
  it('matches by Sleeper user id', () => {
    expect(
      resolveSleeperOwnerId(teams, { ownerExternalId: 'owner-b' }),
    ).toBe('owner-b');
  });

  it('matches by roster id stored on membership', () => {
    expect(
      resolveSleeperOwnerId(teams, { providerTeamId: '3' }),
    ).toBe('owner-a');
  });

  it('matches legacy owner id stored in providerTeamId', () => {
    expect(
      resolveSleeperOwnerId(teams, { providerTeamId: 'owner-b' }),
    ).toBe('owner-b');
  });

  it('falls back to owner display name', () => {
    expect(
      resolveSleeperOwnerId(teams, { displayName: 'Jenna Park' }),
    ).toBe('owner-b');
  });
});
