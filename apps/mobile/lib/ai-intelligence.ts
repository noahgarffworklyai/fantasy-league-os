// Centralized AI intelligence layer for Commissioner.
// Pure mock generators today — surfaces concise, actionable recommendations
// with required confidence, supporting "why", and a contextual action.

import type { League } from './league-context';

export type Confidence = 'high' | 'moderate' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  why: string;
  confidence: Confidence;
  action?: { label: string; hostedLabel?: string; kind?: 'primary' | 'ghost' };
  tone?: 'default' | 'success' | 'warning' | 'danger';
  category?: string;
}

// -------------------- Home --------------------
export function homePriorities(league: League): Recommendation[] {
  const synced = league.type === 'synced';
  const platformOpen = (label: string): Recommendation['action'] =>
    synced ? { label: `Open in ${league.platform}` } : { label, kind: 'primary' };

  switch (league.id) {
    case 'demo-1':
      return [
        {
          id: 'jf1',
          title: 'Invite 2 pending members',
          why: 'League is 10 of 12 joined. Draft is Sunday at 7:00 PM.',
          confidence: 'high',
          action: { label: 'Open Invites', kind: 'primary' },
          tone: 'warning',
          category: 'League',
        },
        {
          id: 'jf2',
          title: 'Send payment reminders',
          why: '2 members unpaid · pot is 75% funded.',
          confidence: 'high',
          action: { label: 'Open Treasury' },
          category: 'Treasury',
          tone: 'warning',
        },
        {
          id: 'jf3',
          title: 'Set draft order',
          why: 'Draft scheduled Sunday at 7:00 PM. Order not set.',
          confidence: 'moderate',
          action: { label: 'Open Draft' },
          category: 'Draft',
        },
      ];
    case 'demo-2':
      return [
        {
          id: 'wl1',
          title: 'Pay league dues',
          why: `$${(league.buyIn ?? 75) + (league.platformFee ?? 4)} due · 3 members still unpaid.`,
          confidence: 'high',
          action: { label: 'Pay $79', kind: 'primary' },
          tone: 'danger',
          category: 'Treasury',
        },
        {
          id: 'wl2',
          title: 'Set lineup before Thursday',
          why: '2 players questionable · waivers process tonight.',
          confidence: 'high',
          action: { label: 'Open Team', kind: 'primary' },
          tone: 'warning',
          category: 'Lineup',
        },
        {
          id: 'wl3',
          title: 'Waiver claims process tonight',
          why: 'Tank Bigsby is your top opportunity-score add.',
          confidence: 'moderate',
          action: { label: 'Add claim' },
          category: 'Waiver',
        },
      ];
    case 'demo-3':
      return [
        {
          id: 'cf1',
          title: 'Refresh Sleeper sync',
          why: 'Last sync 23 min ago. Pull latest scores and transactions.',
          confidence: 'high',
          action: { label: 'Refresh sync', kind: 'primary' },
          category: 'League',
        },
        {
          id: 'cf2',
          title: 'Generate weekly report',
          why: "Week 7 complete. Members are expecting Tuesday's recap.",
          confidence: 'high',
          action: { label: 'Open Reports' },
          category: 'Reports',
        },
        {
          id: 'cf3',
          title: 'Monitor two injured starters',
          why: 'Kelce (Q) and Walker (Q) flagged in your league.',
          confidence: 'moderate',
          action: platformOpen('Review'),
          tone: 'warning',
          category: 'Health',
        },
      ];
    case 'demo-4':
      return [
        {
          id: 'dy1',
          title: 'Review playoff matchup',
          why: 'Quarterfinal vs Legacy Lineup · projected within 6 points.',
          confidence: 'high',
          action: platformOpen('Open matchup'),
          tone: 'success',
          category: 'Matchup',
        },
        {
          id: 'dy2',
          title: 'Monitor Christian McCaffrey',
          why: 'Listed questionable (Achilles). Backup options trending up.',
          confidence: 'high',
          action: platformOpen('Open injury'),
          tone: 'danger',
          category: 'Health',
        },
        {
          id: 'dy3',
          title: 'Check payout projections',
          why: 'Pot fully funded at $1,800 · review prize structure.',
          confidence: 'moderate',
          action: { label: 'Open Treasury' },
          category: 'Treasury',
        },
      ];
    default:
      return [
        {
          id: 'h1',
          title: 'Start Drake London over Chris Godwin',
          why: 'London has a 3.4-point projection edge and an easier matchup.',
          confidence: 'high',
          action: platformOpen('Swap lineup'),
          category: 'Lineup',
          tone: 'success',
        },
      ];
  }
}

// -------------------- Team --------------------
export function teamCoaching(league: League): Recommendation[] {
  const synced = league.type === 'synced';
  return [
    {
      id: 't1',
      title: 'Start James Cook',
      why: 'Cook has out-snapped Davis 2:1 over the last 3 weeks.',
      confidence: 'high',
      action: synced ? { label: `Open in ${league.platform}` } : { label: 'Set lineup' },
      tone: 'success',
      category: 'Lineup',
    },
    {
      id: 't2',
      title: 'Bench Jordan Love this week',
      why: 'Toughest pass defense in the league + 38% pressure rate.',
      confidence: 'moderate',
      action: { label: 'Bench' },
      category: 'Lineup',
    },
    {
      id: 't3',
      title: 'You need another RB before Week 10',
      why: 'Three of your top backs share a bye in Weeks 9–11.',
      confidence: 'high',
      action: { label: 'See targets' },
      tone: 'warning',
      category: 'Roster',
    },
  ];
}

// -------------------- Trade Assistant --------------------
export interface TradeIdea {
  id: string;
  target: string;
  offer: string;
  likelihood: number;
  reason: string;
  type: 'Upgrade WR' | 'Backup RB' | 'Sell High' | 'Buy Low';
}
export const tradeIdeas: TradeIdea[] = [
  { id: 'ti1', target: 'DK Metcalf', offer: 'C. Olave + 2025 3rd', likelihood: 64, reason: 'Their owner is thin at WR and chasing playoff points.', type: 'Upgrade WR' },
  { id: 'ti2', target: 'Tank Bigsby', offer: 'R. Odunze', likelihood: 71, reason: 'Buy low after two quiet weeks; usage is climbing.', type: 'Buy Low' },
  { id: 'ti3', target: 'Pick + RB depth', offer: 'T. Kelce', likelihood: 48, reason: 'Sell high while Kelce is on a 3-game touchdown streak.', type: 'Sell High' },
];

export function evaluateTrade(input: { give: string[]; receive: string[] }): {
  recommendation: 'Accept' | 'Counter' | 'Decline';
  confidence: Confidence;
  why: string;
  tradeValue: number;
  rosterImpact: string;
  playoffImpact: string;
} {
  const delta = input.receive.length - input.give.length;
  if (delta >= 1)
    return {
      recommendation: 'Accept',
      confidence: 'high',
      why: 'You gain positional value and improve at your weakest spot.',
      tradeValue: 12,
      rosterImpact: 'WR upgrade, RB depth steady',
      playoffImpact: '+4.2 projected points/week through playoffs',
    };
  if (delta === 0)
    return {
      recommendation: 'Counter',
      confidence: 'moderate',
      why: 'Even on value, but a small sweetener tilts it your way.',
      tradeValue: 2,
      rosterImpact: 'Lateral move',
      playoffImpact: '+0.8 proj points/week',
    };
  return {
    recommendation: 'Decline',
    confidence: 'high',
    why: 'You give up more projected playoff value than you gain.',
    tradeValue: -9,
    rosterImpact: 'Weakens RB depth',
    playoffImpact: '-3.1 proj points/week',
  };
}

// -------------------- Waiver Assistant --------------------
export interface WaiverTarget {
  id: string;
  add: string;
  pos: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
  team: string;
  drop: string;
  opportunity: number;
  projectedImpact: string;
  faab: number;
  reason: string;
  confidence: Confidence;
}
export const waiverTargets: WaiverTarget[] = [
  { id: 'w1', add: 'Tank Bigsby', pos: 'RB', team: 'JAX', drop: 'M. Pittman', opportunity: 92, projectedImpact: '+3.4 pts/wk', faab: 22, reason: 'Etienne questionable; Bigsby drew 17 carries last week.', confidence: 'high' },
  { id: 'w2', add: 'Tyler Conklin', pos: 'TE', team: 'NYJ', drop: 'D. Goedert', opportunity: 78, projectedImpact: '+1.9 pts/wk', faab: 8, reason: '23% target share in last 3 games.', confidence: 'moderate' },
  { id: 'w3', add: 'Rams DEF', pos: 'DEF', team: 'LAR', drop: 'Steelers DEF', opportunity: 71, projectedImpact: '+1.1 pts/wk', faab: 3, reason: '3 of next 4 vs rookie QBs.', confidence: 'moderate' },
];

// -------------------- League --------------------
export interface LeagueHighlight {
  label: string;
  value: string;
  caption: string;
}
export function leagueHighlights(_league: League): LeagueHighlight[] {
  return [
    { label: 'Manager of the Week', value: 'Marcus Hill', caption: '178.4 pts · season high' },
    { label: 'Biggest Upset', value: 'Sam over Jenna', caption: '+18.3% win-prob swing' },
    { label: 'Best Pickup', value: 'Tank Bigsby', caption: 'Added Tue · 24.6 pts' },
    { label: 'Trade of the Week', value: 'Devon ↔ Priya', caption: 'Grade: A- / B+' },
  ];
}

// -------------------- Treasury --------------------
export function treasuryInsights(league: League): Recommendation[] {
  const isCommish = league.role === 'commissioner';
  const size = league.size ?? 12;
  const paid = league.paidCount ?? league.paid ?? size;
  const unpaid = league.unpaidCount ?? Math.max(0, size - paid);
  const pending = league.pendingCount ?? 0;
  const collected = league.potCollected ?? league.potUsd;
  const total = league.potTotal ?? (league.buyIn ?? 0) * size;
  const pct = total ? Math.round((collected / total) * 100) : 0;
  const out: Recommendation[] = [];

  if (league.paymentStatus === 'unpaid' && !isCommish) {
    out.push({
      id: 'tr-pay',
      title: 'You owe league dues',
      why: `$${(league.buyIn ?? 0) + (league.platformFee ?? 0)} due · ${unpaid} members unpaid.`,
      confidence: 'high',
      action: { label: 'Pay now', kind: 'primary' },
      tone: 'danger',
      category: 'Dues',
    });
  }

  if (unpaid > 0) {
    out.push({
      id: 'tr-unpaid',
      title: `${unpaid} member${unpaid > 1 ? 's' : ''} still unpaid`,
      why: `League pot is ${pct}% funded · $${collected.toLocaleString()} of $${total.toLocaleString()}.`,
      confidence: 'high',
      action: isCommish ? { label: 'Send reminders' } : undefined,
      tone: 'warning',
      category: 'Dues',
    });
  } else {
    out.push({
      id: 'tr-funded',
      title: 'League is fully funded',
      why: `${paid} of ${size} members paid · pot $${collected.toLocaleString()}.`,
      confidence: 'high',
      tone: 'success',
      category: 'Dues',
    });
  }

  if (pending > 0) {
    out.push({
      id: 'tr-pending',
      title: `${pending} payment pending`,
      why: 'Awaiting confirmation from the processor.',
      confidence: 'moderate',
      tone: 'warning',
      category: 'Dues',
    });
  }

  if (league.stage === 'playoffs') {
    out.push({
      id: 'tr-payout',
      title: isCommish ? 'Review payouts before distribution' : 'Payouts projected',
      why: 'Auto-distribution begins after the championship.',
      confidence: 'high',
      action: { label: isCommish ? 'Review payouts' : 'View payouts' },
      category: 'Payouts',
    });
  }
  return out;
}

// -------------------- Notifications --------------------
export interface AINotification {
  id: string;
  title: string;
  body: string;
  category: 'Injury' | 'Trade' | 'Waiver' | 'Treasury' | 'Draft' | 'Matchup';
  when: string;
}
export function recentNotifications(): AINotification[] {
  return [
    { id: 'n1', title: 'Player ruled out', body: 'Travis Kelce ruled OUT for Sunday.', category: 'Injury', when: '2h' },
    { id: 'n2', title: 'Trade received', body: 'Gridiron Gang sent you a trade offer.', category: 'Trade', when: '4h' },
    { id: 'n3', title: 'Waiver deadline tonight', body: 'Claims process at 3:00 AM ET.', category: 'Waiver', when: '1d' },
  ];
}
