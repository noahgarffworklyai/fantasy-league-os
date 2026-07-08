import type { TeamPlayer } from './team-roster-api';

export type PriorityPlayer = {
  id: string;
  name: string;
  pos: string;
  team?: string;
  imageUrl?: string;
  projectedPoints?: number;
  injuryStatus?: 'Q' | 'D' | 'O' | 'IR';
  statLabel?: string;
  statValue?: string;
};

export type PriorityInsightKind = 'start_sit' | 'injury' | 'competition' | 'matchup';

export type PriorityInsight = {
  id: string;
  kind: PriorityInsightKind;
  title: string;
  headline: string;
  insightParagraphs: string[];
  insightBullets: string[];
  tone?: 'success' | 'warning' | 'danger' | 'default';
  start?: PriorityPlayer;
  sit?: PriorityPlayer;
  subject?: PriorityPlayer;
  alternatives?: PriorityPlayer[];
  competitor?: PriorityPlayer;
  matchupOpponent?: string;
  matchupRank?: string;
};

/** @deprecated use PriorityInsight */
export type StartSitPlayer = PriorityPlayer;
/** @deprecated use PriorityInsight */
export type StartSitRecommendation = PriorityInsight;

type MockInsightTemplate = Omit<PriorityInsight, 'start' | 'sit' | 'subject' | 'alternatives' | 'competitor'> & {
  startId?: string;
  startName?: string;
  startPos?: string;
  startTeam?: string;
  sitId?: string;
  sitName?: string;
  sitPos?: string;
  sitTeam?: string;
  subjectId?: string;
  subjectName?: string;
  subjectPos?: string;
  subjectTeam?: string;
  subjectInjury?: PriorityPlayer['injuryStatus'];
  alternativeIds?: Array<{
    id: string;
    name: string;
    pos: string;
    team: string;
  }>;
  competitorId?: string;
  competitorName?: string;
  competitorPos?: string;
  competitorTeam?: string;
  subjectStatLabel?: string;
  subjectStatValue?: string;
  competitorStatLabel?: string;
  competitorStatValue?: string;
};

const MOCK_INSIGHT_TEMPLATES: MockInsightTemplate[] = [
  {
    id: 'pi-start-sit-qb',
    kind: 'start_sit',
    title: 'Start / Sit',
    headline: 'Start Jayden Daniels over Brock Purdy',
    insightParagraphs: [
      'Daniels draws a plus matchup against a bottom-five pass defense that has allowed the third-most fantasy points to mobile quarterbacks this season. His rushing floor adds 4–6 points of safety most weeks.',
      'Purdy faces the league\'s top turnover unit on the road, where his yardage has dipped in two of the last three away games. The 49ers may lean run-heavy if they grab an early lead.',
      'The projection gap is meaningful enough to prioritize Daniels even if Purdy has the higher season-long ceiling. This is a volume-and-matchup week, not a talent week.',
    ],
    insightBullets: [
      'Daniels: 23.8 proj · 9.1 rush att/game over last 4',
      'Purdy: tough CB matchup · 1.2 INT rate on road',
      'Weather clear in Washington · no wind concern',
      'Lock Daniels if you need floor; Purdy only if chasing ceiling',
    ],
    tone: 'success',
    startId: '11566',
    startName: 'Jayden Daniels',
    startPos: 'QB',
    startTeam: 'WAS',
    sitId: '8183',
    sitName: 'Brock Purdy',
    sitPos: 'QB',
    sitTeam: 'SF',
  },
  {
    id: 'pi-injury-kelce',
    kind: 'injury',
    title: 'Injury watch',
    headline: 'Kelce questionable — have a pivot ready',
    insightParagraphs: [
      'Travis Kelce was limited Wednesday with a knee issue and did not participate in the full team period Thursday. The Chiefs have historically been cautious with veteran tight ends on short weeks.',
      'If Kelce downgrades to doubtful or out, your TE slot becomes a priority pivot before Sunday morning inactives. Streaming options with stable roles beat chasing upside this late in the week.',
      'Trey McBride has the clearest path to volume with a 24% target share over the last three games. Goedert is a safer floor play if you want a lower-upside, higher-certainty option.',
    ],
    insightBullets: [
      'Kelce: limited Wed · monitor Friday injury report',
      'McBride: 7.8+ targets/game · red-zone looks trending up',
      'Goedert: safer floor · fewer TD-dependent weeks',
      'Have a backup plan locked before 11 AM ET Sunday',
    ],
    tone: 'warning',
    subjectId: '1466',
    subjectName: 'Travis Kelce',
    subjectPos: 'TE',
    subjectTeam: 'KC',
    subjectInjury: 'Q',
    alternativeIds: [
      { id: '8130', name: 'Trey McBride', pos: 'TE', team: 'ARI' },
      { id: '5022', name: 'Dallas Goedert', pos: 'TE', team: 'PHI' },
    ],
  },
  {
    id: 'pi-competition-wr',
    kind: 'competition',
    title: 'Target competition',
    headline: 'Addison is eating into Jefferson\'s target share',
    insightParagraphs: [
      'Jordan Addison has seen 28% of team targets over the last three games versus 22% for Justin Jefferson. The Vikings are spreading the ball more with a healthier secondary receiving group.',
      'Jefferson remains a must-start — this is about ceiling management, not benching your WR1. In close games or negative scripts, the target split tightens his spike-week probability.',
      'Addison\'s rise is real usage, not a one-week blip. He has out-snapped other WR2 options and is running routes on 78% of offensive snaps since Week 10.',
    ],
    insightBullets: [
      'Jefferson: 22% target share · still top-5 WR on volume',
      'Addison: 28% over last 3 · 6.2 targets/game',
      'Start Jefferson · temper expectations in low-scoring scripts',
      'Watch snap counts Sunday — split could widen if MIN leads',
    ],
    tone: 'default',
    subjectId: '13524',
    subjectName: 'Justin Jefferson',
    subjectPos: 'WR',
    subjectTeam: 'MIN',
    subjectStatLabel: 'Target share',
    subjectStatValue: '22%',
    competitorId: '9756',
    competitorName: 'Jordan Addison',
    competitorPos: 'WR',
    competitorTeam: 'MIN',
    competitorStatLabel: 'Last 3 games',
    competitorStatValue: '28%',
  },
  {
    id: 'pi-matchup-london',
    kind: 'matchup',
    title: 'Matchup edge',
    headline: 'Drake London faces a soft secondary',
    insightParagraphs: [
      'Tampa Bay ranks 29th in fantasy points allowed to wide receivers and has given up 240+ yards to opposing WR corps in three of the last four weeks. Their corner room is banged up entering this matchup.',
      'London has a stable 28% target share with 9+ targets in four straight games. He is the clear alpha in this offense and should see volume regardless of game script.',
      'This is one of the better matchups on London\'s remaining schedule. If you are deciding between two WR2/FLEX options, London has the clearest path to a top-12 week.',
    ],
    insightBullets: [
      'TB defense: 29th vs WR · 240+ WR yards in 3 of last 4',
      'London: 9+ targets in 4 straight · 28% target share',
      'Projected top-12 WR upside this week',
      'Start with confidence over lower-volume WR3 options',
    ],
    tone: 'success',
    subjectId: '8112',
    subjectName: 'Drake London',
    subjectPos: 'WR',
    subjectTeam: 'ATL',
    matchupOpponent: 'vs TB',
    matchupRank: '29th vs WR',
  },
];

function playerFromTemplate(
  id: string,
  name: string,
  pos: string,
  team: string,
  projections: Map<string, number>,
  extra?: Partial<PriorityPlayer>,
): PriorityPlayer {
  return {
    id,
    name,
    pos,
    team,
    projectedPoints: projections.get(id),
    ...extra,
  };
}

function positionMatchesSlot(slot: string, pos: string): boolean {
  const s = slot.toUpperCase();
  const p = pos.toUpperCase();
  if (s === 'FLEX') return ['RB', 'WR', 'TE'].includes(p);
  if (s === 'SUPER_FLEX' || s === 'SF' || s === 'SFX') {
    return ['QB', 'RB', 'WR', 'TE'].includes(p);
  }
  if (s === 'DEF' || s === 'DST') return p === 'DEF' || p === 'DST';
  if (s === 'K') return p === 'K';
  return s === p;
}

function toPriorityPlayer(player: TeamPlayer, projections: Map<string, number>): PriorityPlayer {
  return {
    id: player.id,
    name: player.name,
    pos: player.pos,
    team: player.team,
    imageUrl: player.imageUrl,
    projectedPoints: projections.get(player.id),
  };
}

export function buildStartSitFromRoster(input: {
  starters: TeamPlayer[];
  bench: TeamPlayer[];
  starterSlots: string[];
  projections: Map<string, number>;
  limit?: number;
}): PriorityInsight[] {
  const { starters, bench, starterSlots, projections, limit = 3 } = input;
  const candidates: Array<PriorityInsight & { edge: number }> = [];

  for (let i = 0; i < starters.length; i += 1) {
    const starter = starters[i];
    const slot = starterSlots[i] ?? starter.pos;
    const starterProj = projections.get(starter.id);
    if (starterProj == null) continue;

    for (const benchPlayer of bench) {
      if (!positionMatchesSlot(slot, benchPlayer.pos)) continue;
      const benchProj = projections.get(benchPlayer.id);
      if (benchProj == null) continue;

      const edge = benchProj - starterProj;
      if (edge <= 0.3) continue;

      const start = toPriorityPlayer(benchPlayer, projections);
      const sit = toPriorityPlayer(starter, projections);

      candidates.push({
        id: `${benchPlayer.id}-over-${starter.id}`,
        kind: 'start_sit',
        title: 'Start / Sit',
        headline: `Start ${start.name} over ${sit.name.split(' ').slice(-1)[0]}`,
        insightParagraphs: [
          `${start.name.split(' ').slice(-1)[0]} projects ${edge.toFixed(1)} points higher than ${sit.name.split(' ').slice(-1)[0]} in your ${slot} slot this week based on Sleeper projections.`,
          `The swap improves your projected lineup total without requiring a roster move — just a lineup change before kickoff.`,
        ],
        insightBullets: [
          `${start.name}: ${benchProj.toFixed(1)} proj pts`,
          `${sit.name}: ${starterProj.toFixed(1)} proj pts`,
          `Edge: +${edge.toFixed(1)} projected in ${slot}`,
          'Confirm final inactives before locking your lineup',
        ],
        tone: 'success',
        start,
        sit,
        edge,
      });
    }
  }

  candidates.sort((a, b) => b.edge - a.edge);

  const used = new Set<string>();
  const picked: PriorityInsight[] = [];
  for (const rec of candidates) {
    if (used.has(rec.start!.id) || used.has(rec.sit!.id)) continue;
    used.add(rec.start!.id);
    used.add(rec.sit!.id);
    const { edge: _edge, ...insight } = rec;
    picked.push(insight);
    if (picked.length >= limit) break;
  }

  return picked;
}

export function buildMockPriorityInsights(projections: Map<string, number>): PriorityInsight[] {
  return MOCK_INSIGHT_TEMPLATES.map((tpl) => {
    const base = {
      id: tpl.id,
      kind: tpl.kind,
      title: tpl.title,
      headline: tpl.headline,
      insightParagraphs: tpl.insightParagraphs,
      insightBullets: tpl.insightBullets,
      tone: tpl.tone,
      matchupOpponent: tpl.matchupOpponent,
      matchupRank: tpl.matchupRank,
    };

    if (tpl.kind === 'start_sit' && tpl.startId && tpl.sitId) {
      return {
        ...base,
        start: playerFromTemplate(
          tpl.startId,
          tpl.startName!,
          tpl.startPos!,
          tpl.startTeam!,
          projections,
        ),
        sit: playerFromTemplate(tpl.sitId, tpl.sitName!, tpl.sitPos!, tpl.sitTeam!, projections),
      };
    }

    if (tpl.kind === 'injury' && tpl.subjectId) {
      return {
        ...base,
        subject: playerFromTemplate(
          tpl.subjectId,
          tpl.subjectName!,
          tpl.subjectPos!,
          tpl.subjectTeam!,
          projections,
          { injuryStatus: tpl.subjectInjury },
        ),
        alternatives: (tpl.alternativeIds ?? []).map((alt) =>
          playerFromTemplate(alt.id, alt.name, alt.pos, alt.team, projections),
        ),
      };
    }

    if (tpl.kind === 'competition' && tpl.subjectId && tpl.competitorId) {
      return {
        ...base,
        subject: playerFromTemplate(
          tpl.subjectId,
          tpl.subjectName!,
          tpl.subjectPos!,
          tpl.subjectTeam!,
          projections,
          { statLabel: tpl.subjectStatLabel, statValue: tpl.subjectStatValue },
        ),
        competitor: playerFromTemplate(
          tpl.competitorId,
          tpl.competitorName!,
          tpl.competitorPos!,
          tpl.competitorTeam!,
          projections,
          { statLabel: tpl.competitorStatLabel, statValue: tpl.competitorStatValue },
        ),
      };
    }

    if (tpl.kind === 'matchup' && tpl.subjectId) {
      return {
        ...base,
        subject: playerFromTemplate(
          tpl.subjectId,
          tpl.subjectName!,
          tpl.subjectPos!,
          tpl.subjectTeam!,
          projections,
        ),
      };
    }

    return base as PriorityInsight;
  });
}

/** @deprecated use buildMockPriorityInsights */
export function buildMockStartSit(projections: Map<string, number>): PriorityInsight[] {
  return buildMockPriorityInsights(projections);
}
