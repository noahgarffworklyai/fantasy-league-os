import type { SleeperPlayerProfile } from './sleeper-player-profile';
import {
  estimatePlayProbability,
  formatPracticeStatus,
  mapInjuryStatus,
  playerDisplayName,
} from './sleeper-player-profile';

export type HealthArticle = {
  id: string;
  title: string;
  source: string;
  when: string;
};

export type SimilarInjuryCase = {
  player: string;
  pos: string;
  injury: string;
  returnTimeline: string;
  note: string;
};

export type PlayerHealthSnapshot = {
  playProbability: number;
  practiceStatus: string;
  bodyPart: string;
  injuryStatus: 'ok' | 'q' | 'o';
  injuryNotes?: string;
  articles: HealthArticle[];
  similarCases: SimilarInjuryCase[];
};

const ARTICLE_TEMPLATES: Array<Omit<HealthArticle, 'id'>> = [
  {
    title: 'Practice report: limited participation on Wednesday',
    source: 'Rotowire',
    when: '3h ago',
  },
  {
    title: 'Coach says player is day-to-day, expected to test it Friday',
    source: 'Team beat',
    when: '6h ago',
  },
  {
    title: 'Fantasy impact: workload may be capped if active',
    source: 'Commissioner',
    when: '1d ago',
  },
];

const SIMILAR_BY_BODY_PART: Record<string, SimilarInjuryCase[]> = {
  ankle: [
    { player: 'Jordan Mason', pos: 'RB', injury: 'Ankle', returnTimeline: '1 week', note: 'Returned to full practice in 6 days and played 14 touches.' },
    { player: 'Chris Olave', pos: 'WR', injury: 'Ankle', returnTimeline: '2 weeks', note: 'Missed one game, returned at 78% snap share.' },
  ],
  knee: [
    { player: 'Travis Kelce', pos: 'TE', injury: 'Knee', returnTimeline: '0 weeks', note: 'Played through limited practices with 9 targets in return game.' },
    { player: 'Saquon Barkley', pos: 'RB', injury: 'Knee', returnTimeline: '1 week', note: 'Sat one game, returned with 22 touches.' },
  ],
  calf: [
    { player: 'Christian McCaffrey', pos: 'RB', injury: 'Calf', returnTimeline: '1 week', note: 'Similar soft-tissue strain — cleared after limited/full week.' },
    { player: 'Tyreek Hill', pos: 'WR', injury: 'Calf', returnTimeline: '0 weeks', note: 'Managed through week, 7 catches for 82 yards.' },
  ],
  hamstring: [
    { player: 'Garrett Wilson', pos: 'WR', injury: 'Hamstring', returnTimeline: '2 weeks', note: 'Gradual ramp; first game back at 68% routes.' },
    { player: 'Josh Jacobs', pos: 'RB', injury: 'Hamstring', returnTimeline: '1 week', note: 'Missed one game, returned with 17 carries.' },
  ],
  concussion: [
    { player: 'Tua Tagovailoa', pos: 'QB', injury: 'Concussion', returnTimeline: '2 weeks', note: 'Cleared protocol in 11 days, no snap restriction.' },
    { player: 'Chris Olave', pos: 'WR', injury: 'Concussion', returnTimeline: '1 week', note: 'Missed one game, full route participation upon return.' },
  ],
  shoulder: [
    { player: 'Justin Jefferson', pos: 'WR', injury: 'Shoulder', returnTimeline: '0 weeks', note: 'Played through pain management, 10 targets.' },
    { player: 'Joe Burrow', pos: 'QB', injury: 'Shoulder', returnTimeline: '1 week', note: 'Sat one game, returned without limitation.' },
  ],
};

const DEFAULT_SIMILAR: SimilarInjuryCase[] = [
  { player: 'Jordan Mason', pos: 'RB', injury: 'Lower body', returnTimeline: '1 week', note: 'Comparable soft-tissue issue — returned after limited/full practice week.' },
  { player: 'Chris Olave', pos: 'WR', injury: 'Lower body', returnTimeline: '1–2 weeks', note: 'Missed one game, workload ramped over two weeks.' },
  { player: 'Travis Kelce', pos: 'TE', injury: 'Lower body', returnTimeline: '0 weeks', note: 'Played through limited practices with reduced early-down snaps.' },
];

function bodyPartKey(bodyPart?: string | null): string {
  const value = bodyPart?.toLowerCase() ?? '';
  if (value.includes('ankle') || value.includes('foot')) return 'ankle';
  if (value.includes('knee')) return 'knee';
  if (value.includes('calf')) return 'calf';
  if (value.includes('hamstring')) return 'hamstring';
  if (value.includes('concussion') || value.includes('head')) return 'concussion';
  if (value.includes('shoulder')) return 'shoulder';
  return 'default';
}

function buildArticles(name: string, injured: boolean, profile?: SleeperPlayerProfile | null): HealthArticle[] {
  if (!injured) return [];
  const bodyPart = profile?.injury_body_part ?? 'injury';
  return ARTICLE_TEMPLATES.slice(0, 2).map((article, i) => ({
    id: `article-${i}`,
    title: i === 0 ? `${name}: ${bodyPart} update` : article.title,
    source: article.source,
    when: article.when,
  }));
}

function buildSimilarCases(bodyPart?: string | null): SimilarInjuryCase[] {
  const key = bodyPartKey(bodyPart);
  return SIMILAR_BY_BODY_PART[key] ?? DEFAULT_SIMILAR;
}

export function buildPlayerHealthSnapshot(
  profile: SleeperPlayerProfile | null | undefined,
  fallback?: { name?: string; status?: 'ok' | 'q' | 'o'; note?: string },
): PlayerHealthSnapshot {
  const name = profile ? playerDisplayName(profile) : fallback?.name ?? 'Player';
  const injuryStatus = profile ? mapInjuryStatus(profile.injury_status) : fallback?.status ?? 'ok';
  const injured = injuryStatus === 'q' || injuryStatus === 'o';
  const practiceStatus = profile
    ? formatPracticeStatus(profile.practice_participation, profile.practice_description)
    : injured
      ? 'Limited'
      : 'Full';
  const bodyPart = profile?.injury_body_part?.trim() || (injured ? 'Undisclosed' : '—');
  const playProbability = estimatePlayProbability(profile?.injury_status, profile?.practice_participation);

  return {
    playProbability,
    practiceStatus,
    bodyPart,
    injuryStatus,
    injuryNotes: profile?.injury_notes ?? fallback?.note,
    articles: buildArticles(name, injured, profile),
    similarCases: injured ? buildSimilarCases(bodyPart) : [],
  };
}
