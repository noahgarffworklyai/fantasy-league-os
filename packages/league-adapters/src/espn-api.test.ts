import { describe, expect, it } from 'vitest';
import { espnTeamName, mergeEspnTeamRows } from './espn-api.js';

describe('espnTeamName', () => {
  it('prefers full name over abbrev', () => {
    expect(
      espnTeamName({
        id: 4,
        abbrev: 'TONY',
        name: 'Airtime Heating and Cooling',
      }),
    ).toBe('Airtime Heating and Cooling');
  });

  it('joins location and nickname when name is missing', () => {
    expect(
      espnTeamName({
        id: 4,
        abbrev: 'TONY',
        location: 'Airtime Heating',
        nickname: 'and Cooling',
      }),
    ).toBe('Airtime Heating and Cooling');
  });

  it('falls back to abbrev when nothing else exists', () => {
    expect(
      espnTeamName({
        id: 4,
        abbrev: 'TONY',
      }),
    ).toBe('TONY');
  });
});

describe('mergeEspnTeamRows', () => {
  it('keeps the row with richer name metadata', () => {
    const merged = mergeEspnTeamRows(
      { id: 4, abbrev: 'TONY' },
      {
        id: 4,
        abbrev: 'TONY',
        location: 'Airtime Heating',
        nickname: 'and Cooling',
        name: 'Airtime Heating and Cooling',
      },
    );
    expect(espnTeamName(merged)).toBe('Airtime Heating and Cooling');
  });
});
