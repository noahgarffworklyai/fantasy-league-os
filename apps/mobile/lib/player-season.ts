import type { NflState } from './sleeper-projections-api';

export type PlayerSeasonKey = 'current' | 'previous';

export type PlayerSeasonOption = {
  key: PlayerSeasonKey;
  label: string;
  season: string;
};

export function getPlayerSeasonOptions(state: NflState): PlayerSeasonOption[] {
  const currentSeason =
    state.season_type === 'regular' && state.season
      ? state.season
      : state.league_season ?? state.season ?? String(new Date().getFullYear());
  const previousSeason =
    state.previous_season ?? String(Number(currentSeason) - 1);

  return [
    { key: 'current', label: `${currentSeason}`, season: currentSeason },
    { key: 'previous', label: `${previousSeason}`, season: previousSeason },
  ];
}

export function resolveSeasonFromKey(
  state: NflState,
  key: PlayerSeasonKey,
): string {
  const options = getPlayerSeasonOptions(state);
  return options.find((option) => option.key === key)?.season ?? options[0].season;
}

export function defaultPlayerSeasonKey(state: NflState): PlayerSeasonKey {
  return state.season_type === 'regular' ? 'current' : 'previous';
}
