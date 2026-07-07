import type { LeagueSummary } from '@flos/shared';

export type EspnSession = {
  espnS2: string;
  swid: string;
  leagues?: LeagueSummary[];
};

export function extractEspnLeagueId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d{4,12}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/leagueId[=:/](\d{4,12})/i);
  return match?.[1] ?? null;
}
