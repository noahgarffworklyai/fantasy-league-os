import {
  fetchSleeperPlayerFromCache,
  isSleeperPlayerId,
  resolveSleeperPlayerIdFromCache,
} from './sleeper-players-cache';

export type SleeperPlayerProfile = {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  team?: string | null;
  status?: string;
  injury_status?: string | null;
  injury_body_part?: string | null;
  injury_start_date?: string | null;
  injury_notes?: string | null;
  practice_participation?: string | null;
  practice_description?: string | null;
  news_updated?: number | null;
  active?: boolean;
};

export function playerDisplayName(profile: SleeperPlayerProfile): string {
  return (
    profile.full_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    `Player ${profile.player_id}`
  );
}

export function mapInjuryStatus(status?: string | null): 'ok' | 'q' | 'o' {
  const value = status?.toLowerCase() ?? '';
  if (value.includes('out') || value === 'o' || value.includes('ir') || value.includes('pup')) return 'o';
  if (value.includes('question') || value === 'q' || value.includes('doubt')) return 'q';
  return 'ok';
}

export function formatPracticeStatus(participation?: string | null, description?: string | null): string {
  if (description?.trim()) return description.trim();
  if (!participation) return 'Full';
  const value = participation.toLowerCase();
  if (value.includes('did not') || value === 'dnp') return 'Did not practice';
  if (value.includes('limited') || value === 'lp') return 'Limited';
  if (value.includes('full') || value === 'fp') return 'Full';
  return participation;
}

export function estimatePlayProbability(status?: string | null, practice?: string | null): number {
  const injury = status?.toLowerCase() ?? '';
  const prac = practice?.toLowerCase() ?? '';

  if (injury.includes('out') || injury === 'o' || injury.includes('ir')) return 15;
  if (injury.includes('doubt')) return 45;
  if (injury.includes('question') || injury === 'q') {
    if (prac.includes('did not') || prac === 'dnp') return 55;
    if (prac.includes('limited') || prac === 'lp') return 72;
    return 78;
  }
  if (prac.includes('did not') || prac === 'dnp') return 82;
  if (prac.includes('limited') || prac === 'lp') return 92;
  return 97;
}

export async function fetchSleeperPlayerProfile(playerId: string): Promise<SleeperPlayerProfile | null> {
  return fetchSleeperPlayerFromCache(playerId);
}

export async function resolveSleeperPlayerId(
  name: string,
  pos?: string,
  team?: string,
): Promise<string | null> {
  return resolveSleeperPlayerIdFromCache(name, pos, team);
}

export async function resolvePlayerId(
  playerId: string | undefined,
  name?: string,
  pos?: string,
  team?: string,
): Promise<string | null> {
  if (isSleeperPlayerId(playerId)) return playerId!;
  if (!name) return null;
  return resolveSleeperPlayerIdFromCache(name, pos, team);
}
