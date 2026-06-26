import { Fragment, useRef, useState, type ReactNode } from 'react';
import { Modal, ScrollView, TextInput, useWindowDimensions, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line as SvgLine, Rect, Text as SvgText } from 'react-native-svg';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Flame,
  Heart,
  Laugh,
  type LucideIcon,
  MessageCircle,
  PartyPopper,
  Pin,
  Radio,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { useLeague, type League } from '@/lib/league-context';
import { personAvatar } from '@/lib/avatars';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

/* ------------------------------ MOCK DATA ------------------------------ */
interface TeamRow {
  rank: number;
  prev: number;
  name: string;
  owner: string;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
  streak: string;
  seed?: number;
  tag?: 'division' | 'playoff' | 'bubble' | 'last';
}

const TEAMS: TeamRow[] = [
  { rank: 1, prev: 1, name: 'Dynasty Wolves', owner: 'Jackson', wins: 6, losses: 1, pf: 832.4, pa: 712.0, streak: 'W4', seed: 1, tag: 'division' },
  { rank: 2, prev: 3, name: 'The Steel Curtain', owner: 'Mike', wins: 5, losses: 2, pf: 798.1, pa: 740.6, streak: 'W2', seed: 2, tag: 'division' },
  { rank: 3, prev: 2, name: 'Brady Bunch', owner: 'Sarah', wins: 5, losses: 2, pf: 781.6, pa: 745.2, streak: 'L1', seed: 3, tag: 'playoff' },
  { rank: 4, prev: 4, name: 'Punt God', owner: 'Devon', wins: 4, losses: 3, pf: 760.3, pa: 738.9, streak: 'W1', seed: 4, tag: 'playoff' },
  { rank: 5, prev: 7, name: 'Audible', owner: 'Priya', wins: 4, losses: 3, pf: 742.0, pa: 751.4, streak: 'W3', seed: 5, tag: 'bubble' },
  { rank: 6, prev: 5, name: 'Hail Mary', owner: 'Chris', wins: 3, losses: 4, pf: 715.5, pa: 766.1, streak: 'L2', seed: 6, tag: 'bubble' },
  { rank: 7, prev: 6, name: 'Field Stretchers', owner: 'Lena', wins: 3, losses: 4, pf: 702.2, pa: 770.0, streak: 'L1' },
  { rank: 8, prev: 8, name: 'Two Minute Drill', owner: 'Marcus', wins: 2, losses: 5, pf: 668.4, pa: 798.8, streak: 'L3' },
  { rank: 9, prev: 9, name: 'Couch Coaches', owner: 'Eli', wins: 2, losses: 5, pf: 651.9, pa: 802.1, streak: 'L2' },
  { rank: 10, prev: 10, name: 'Bottom Feeders', owner: 'Noah', wins: 1, losses: 6, pf: 612.3, pa: 819.5, streak: 'L4', tag: 'last' },
];

interface Matchup {
  id: string;
  home: TeamRow;
  hp: number;
  hproj: number;
  away: TeamRow;
  ap: number;
  aproj: number;
  state: 'pre' | 'live' | 'final';
  kickoff?: string;
  winProb: number;
}

const MATCHUPS: Matchup[] = [
  { id: 'm1', home: TEAMS[0], hp: 78.2, hproj: 124.2, away: TEAMS[1], ap: 65.1, aproj: 112.4, state: 'live', winProb: 0.71 },
  { id: 'm2', home: TEAMS[2], hp: 0, hproj: 98.1, away: TEAMS[4], ap: 0, aproj: 101.6, state: 'pre', kickoff: 'Sun 1:00pm', winProb: 0.46 },
  { id: 'm3', home: TEAMS[3], hp: 115.7, hproj: 115.7, away: TEAMS[5], ap: 88.3, aproj: 88.3, state: 'final', winProb: 0.93 },
  { id: 'm4', home: TEAMS[6], hp: 0, hproj: 104.5, away: TEAMS[7], ap: 0, aproj: 92.1, state: 'pre', kickoff: 'Sun 4:25pm', winProb: 0.62 },
  { id: 'm5', home: TEAMS[8], hp: 0, hproj: 88.7, away: TEAMS[9], ap: 0, aproj: 81.2, state: 'pre', kickoff: 'Mon 8:15pm', winProb: 0.58 },
];

type FeedKind = 'moment' | 'trade' | 'waiver' | 'announcement' | 'poll' | 'report' | 'payment';
interface FeedItem {
  id: string;
  kind: FeedKind;
  who: string;
  headline: string;
  body?: string;
  when: string;
  pinned?: boolean;
  reactions: { likes: number; cheers: number; laughs: number };
  comments: number;
  poll?: { question: string; options: { label: string; votes: number }[] };
}

const FEED: FeedItem[] = [
  { id: 'f0', kind: 'announcement', who: 'Commissioner', headline: 'Trade deadline is Sunday at midnight', body: 'Get your final deals in before week 10 kickoff.', when: '1h', pinned: true, reactions: { likes: 4, cheers: 1, laughs: 0 }, comments: 2 },
  { id: 'f1', kind: 'moment', who: 'League Moment', headline: 'Jackson upset Mike despite entering as an 18 point underdog.', when: '2h', reactions: { likes: 9, cheers: 3, laughs: 2 }, comments: 6 },
  { id: 'f2', kind: 'trade', who: 'Audible ↔ Brady Bunch', headline: 'Trade completed', body: 'Audible receives K. Walker III. Brady Bunch receives D. London + 2027 3rd.', when: '4h', reactions: { likes: 5, cheers: 2, laughs: 0 }, comments: 4 },
  { id: 'f3', kind: 'poll', who: 'Commissioner', headline: "Move next year's draft to a Saturday?", when: '6h', reactions: { likes: 2, cheers: 0, laughs: 0 }, comments: 1, poll: { question: "Move next year's draft to a Saturday?", options: [{ label: 'Yes, Saturday afternoon', votes: 6 }, { label: 'Keep it Thursday night', votes: 3 }, { label: 'Sunday morning', votes: 1 }] } },
  { id: 'f4', kind: 'moment', who: 'League Moment', headline: 'Sarah moved into the final playoff spot.', when: '1d', reactions: { likes: 7, cheers: 4, laughs: 0 }, comments: 3 },
  { id: 'f5', kind: 'waiver', who: 'Hail Mary', headline: 'Added Tyjae Spears (RB) — $14 FAAB', when: '1d', reactions: { likes: 1, cheers: 0, laughs: 1 }, comments: 0 },
  { id: 'f6', kind: 'payment', who: 'League Pot', headline: 'The league pot is now fully funded.', when: '2d', reactions: { likes: 10, cheers: 6, laughs: 0 }, comments: 1 },
  { id: 'f7', kind: 'report', who: 'Weekly Report', headline: 'Week 8 Power Rankings published', when: '3d', reactions: { likes: 4, cheers: 1, laughs: 0 }, comments: 2 },
];

const AWARDS = [
  { id: 'a1', title: 'Highest Score', value: 'Dynasty Wolves', detail: '151.3 pts' },
  { id: 'a2', title: 'Lowest Score', value: 'Bottom Feeders', detail: '62.4 pts' },
  { id: 'a3', title: 'Closest Win', value: 'Audible', detail: 'by 1.2 pts' },
  { id: 'a4', title: 'Biggest Blowout', value: 'Punt God', detail: '+38.5 pts' },
  { id: 'a5', title: 'Manager of the Week', value: 'Jackson', detail: 'Started 9 of 9 optimal' },
  { id: 'a6', title: 'League MVP', value: 'J. Jefferson', detail: '182.4 fantasy pts' },
];

const LINEUP_DEFAULT = [
  { slot: 'QB', name: 'J. Allen', pts: 22.4, rem: 'Q4 5:12' },
  { slot: 'RB', name: 'B. Robinson', pts: 16.1, rem: 'Final' },
  { slot: 'RB', name: 'K. Walker', pts: 8.7, rem: 'Q3 0:42' },
  { slot: 'WR', name: 'J. Jefferson', pts: 19.7, rem: 'Final' },
  { slot: 'WR', name: 'P. Nacua', pts: 11.4, rem: 'Q4 8:30' },
  { slot: 'TE', name: 'T. Kelce', pts: 0, rem: 'Sun 1:00' },
  { slot: 'FLX', name: 'R. Odunze', pts: 0, rem: 'Sun 1:00' },
  { slot: 'K', name: 'H. Butker', pts: 0, rem: 'Sun 1:00' },
  { slot: 'DST', name: 'Bills', pts: 0, rem: 'Sun 1:00' },
];

function lineupFor(seed: number) {
  const names = [
    ['P. Mahomes', 'S. Barkley', 'D. Henry', 'C. Lamb', 'A. St. Brown', 'G. Kittle', 'C. Olave', 'B. Aubrey', 'Cowboys'],
    ['J. Burrow', 'J. Taylor', 'J. Mixon', 'D. Adams', 'T. Hill', 'M. Andrews', 'Z. Flowers', 'J. Tucker', 'Ravens'],
    ['L. Jackson', 'C. McCaffrey', 'J. Conner', 'D. Moore', 'G. Wilson', 'D. Goedert', 'K. Allen', 'J. Bates', '49ers'],
    ['D. Prescott', 'T. Etienne', 'T. Pollard', 'M. Evans', 'C. Kupp', 'S. LaPorta', 'J. Smith-Njigba', 'C. McLaughlin', 'Steelers'],
  ];
  const arr = names[seed % names.length];
  return LINEUP_DEFAULT.map((p, i) => ({ ...p, name: arr[i], pts: Math.max(0, p.pts - 2 + ((i + seed) % 3) * 1.6) }));
}

/* ------------------------------ PAGE ------------------------------ */
type DetailView = { kind: 'league' } | { kind: 'matchup'; id: string } | { kind: 'team'; name: string };

export default function LeaguePage() {
  const { active } = useLeague();
  const [view, setView] = useState<DetailView>({ kind: 'league' });
  if (!active) return null;

  if (view.kind === 'matchup') {
    const m = MATCHUPS.find((x) => x.id === (view as { id: string }).id)!;
    return (
      <Screen>
        <MatchupDetail matchup={m} onBack={() => setView({ kind: 'league' })} />
      </Screen>
    );
  }
  if (view.kind === 'team') {
    const t = TEAMS.find((x) => x.name === (view as { name: string }).name)!;
    return (
      <Screen>
        <TeamOverview team={t} onBack={() => setView({ kind: 'league' })} />
      </Screen>
    );
  }

  return (
    <Screen>
      <LeagueHome active={active} onOpenMatchup={(id) => setView({ kind: 'matchup', id })} onOpenTeam={(name) => setView({ kind: 'team', name })} />
    </Screen>
  );
}

type LeagueTab = 'standings' | 'live' | 'analytics';

function LeagueHome({ active, onOpenMatchup, onOpenTeam }: { active: League; onOpenMatchup: (id: string) => void; onOpenTeam: (name: string) => void }) {
  const c = useColors();
  const [tab, setTab] = useState<LeagueTab>('standings');
  const [feedOpen, setFeedOpen] = useState(false);
  const totalW = TEAMS.reduce((s, t) => s + t.wins, 0);
  const totalL = TEAMS.reduce((s, t) => s + t.losses, 0);

  return (
    <View className="gap-5 px-4 pb-10 pt-1">
      <View className="gap-3 px-1 pt-1">
        <View className="min-w-0">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Week {active.week}</Text>
          <Text className="mt-1 text-[34px] font-semibold leading-[36px] tracking-tighter2" numberOfLines={1}>{active.name}</Text>
          <Text className="mt-2 text-[13px] text-muted-foreground">
            {active.members} teams · {totalW}-{totalL} combined · {active.type === 'synced' ? `Synced from ${active.platform}` : 'Hosted'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <Segmented
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'standings', label: 'Standings' },
              { key: 'live', label: 'Live' },
              { key: 'analytics', label: 'Analytics' },
            ]}
          />
        </View>
        <Pressable onPress={() => setFeedOpen(true)} className="relative h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card">
          <MessageCircle size={20} color={c.foreground} />
          <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-success px-1">
            <Text className="text-[10px] font-semibold text-background">{FEED.length}</Text>
          </View>
        </Pressable>
      </View>

      {tab === 'standings' ? <StandingsPane onOpenTeam={onOpenTeam} /> : null}
      {tab === 'live' ? <LivePane onOpenMatchup={onOpenMatchup} /> : null}
      {tab === 'analytics' ? <AnalyticsPane active={active} /> : null}

      <FeedSheet open={feedOpen} onClose={() => setFeedOpen(false)} />
    </View>
  );
}

/* ------------------------------ STANDINGS ------------------------------ */
function playoffOdds(rank: number) {
  return rank <= 2 ? 99 : rank <= 4 ? 92 : rank === 5 ? 71 : rank === 6 ? 58 : rank === 7 ? 22 : rank === 8 ? 8 : rank === 9 ? 3 : 1;
}

function StandingsPane({ onOpenTeam }: { onOpenTeam: (name: string) => void }) {
  const clinching = TEAMS.filter((t) => playoffOdds(t.rank) >= 95).length;
  const bubble = TEAMS.filter((t) => {
    const o = playoffOdds(t.rank);
    return o >= 20 && o < 95;
  }).length;

  return (
    <Section title="Standings & playoff odds">
      <View className="flex-row items-center justify-between rounded-[18px] bg-surface-elevated px-4 py-2.5">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Top 6 make playoffs</Text>
        <Text className="text-[11px] text-muted-foreground">
          <Text className="font-semibold text-success">{clinching}</Text> clinching · <Text className="font-semibold text-warning">{bubble}</Text> bubble
        </Text>
      </View>
      <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
        {TEAMS.map((t, i) => {
          const odds = playoffOdds(t.rank);
          const oddsColor = odds >= 90 ? 'text-success' : odds >= 50 ? 'text-foreground' : odds >= 20 ? 'text-warning' : 'text-destructive';
          const barColor = odds >= 90 ? 'bg-success' : odds >= 50 ? 'bg-foreground/80' : odds >= 20 ? 'bg-warning' : 'bg-destructive/70';
          return (
            <Pressable key={t.name} onPress={() => onOpenTeam(t.name)}>
              <View className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
                <Text className="w-5 text-[13px] font-semibold tabular-nums text-muted-foreground">{t.rank}</Text>
                <AvatarImage src={personAvatar(t.owner + t.name)} name={t.owner} className="h-9 w-9" />
                <TagDot tag={t.tag} />
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{t.name}</Text>
                  <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{t.owner} · {t.wins}-{t.losses} · {t.streak}</Text>
                  <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                    <View className={cn('h-full rounded-full', barColor)} style={{ width: `${odds}%` }} />
                  </View>
                </View>
                <View className="items-end">
                  <Text className={cn('text-[14px] font-semibold tabular-nums', oddsColor)}>{odds}%</Text>
                  <Text className="text-[11px] tabular-nums text-muted-foreground">{t.pf.toFixed(0)} PF</Text>
                </View>
                <Movement delta={t.prev - t.rank} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <Legend />
    </Section>
  );
}

/* ------------------------------ LIVE ------------------------------ */
function LivePane({ onOpenMatchup }: { onOpenMatchup: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<ScrollView | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (idx !== active) setActive(idx);
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Matchup {active + 1} of {MATCHUPS.length}</Text>
        <Text className="text-[11px] text-muted-foreground">Swipe →</Text>
      </View>
      <ScrollView
        ref={scrollerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
      >
        {MATCHUPS.map((m, idx) => (
          <View key={m.id} style={{ width: cardW }}>
            <LiveMatchupCard matchup={m} homeLineup={LINEUP_DEFAULT} awayLineup={lineupFor(idx + 1)} onOpen={() => onOpenMatchup(m.id)} />
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center justify-center gap-1.5 pt-1">
        {MATCHUPS.map((_, i) => (
          <Pressable key={i} onPress={() => scrollerRef.current?.scrollTo({ x: i * cardW, animated: true })}>
            <View className={cn('h-1.5 rounded-full', i === active ? 'w-5 bg-foreground' : 'w-1.5 bg-muted-foreground/40')} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LiveMatchupCard({ matchup: m, homeLineup, awayLineup, onOpen }: { matchup: Matchup; homeLineup: typeof LINEUP_DEFAULT; awayLineup: typeof LINEUP_DEFAULT; onOpen: () => void }) {
  const c = useColors();
  return (
    <View className="overflow-hidden rounded-[28px] bg-surface-elevated">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <StateBadge state={m.state} kickoff={m.kickoff} />
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{Math.round(m.winProb * 100)}% · {Math.round((1 - m.winProb) * 100)}%</Text>
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <AvatarImage src={personAvatar(m.home.owner + m.home.name)} name={m.home.owner} className="h-8 w-8" />
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{m.home.owner}</Text>
            </View>
            <Text className="mt-1 text-[14px] font-semibold tracking-tightish" numberOfLines={1}>{m.home.name}</Text>
            <Text className={cn('mt-1 text-[28px] font-semibold tabular-nums', m.hp > m.ap && m.state !== 'pre' ? 'text-success' : '')}>{m.state === 'pre' ? '—' : m.hp.toFixed(1)}</Text>
            <Text className="text-[10px] text-muted-foreground">proj {m.hproj.toFixed(1)}</Text>
          </View>
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">vs</Text>
          <View className="min-w-0 flex-1 items-end">
            <View className="flex-row items-center gap-2">
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{m.away.owner}</Text>
              <AvatarImage src={personAvatar(m.away.owner + m.away.name)} name={m.away.owner} className="h-8 w-8" />
            </View>
            <Text className="mt-1 text-[14px] font-semibold tracking-tightish" numberOfLines={1}>{m.away.name}</Text>
            <Text className={cn('mt-1 text-[28px] font-semibold tabular-nums', m.ap > m.hp && m.state !== 'pre' ? 'text-success' : '')}>{m.state === 'pre' ? '—' : m.ap.toFixed(1)}</Text>
            <Text className="text-[10px] text-muted-foreground">proj {m.aproj.toFixed(1)}</Text>
          </View>
        </View>
        <View className="mt-3 h-1 overflow-hidden rounded-full bg-border">
          <View className="h-full bg-foreground/80" style={{ width: `${Math.round(m.winProb * 100)}%` }} />
        </View>
      </View>
      <View className="mt-4 flex-row">
        <View className="flex-1"><LiveLineupCol team={m.home.name} rows={homeLineup} /></View>
        <View className="flex-1 border-l border-border"><LiveLineupCol team={m.away.name} rows={awayLineup} /></View>
      </View>
      <Pressable onPress={onOpen}>
        <View className="flex-row items-center justify-between border-t border-hairline px-5 py-3">
          <Text className="text-[13px] font-semibold tracking-tightish">Open matchup</Text>
          <ChevronRight size={16} color={c.mutedForeground} />
        </View>
      </Pressable>
    </View>
  );
}

function LiveLineupCol({ team, rows }: { team: string; rows: typeof LINEUP_DEFAULT }) {
  return (
    <View>
      <Text className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" numberOfLines={1}>{team}</Text>
      <View className="mt-1">
        {rows.map((r, i) => (
          <View key={r.slot + i} className={cn('flex-row items-center gap-2 px-3 py-1.5', i > 0 ? 'border-t border-hairline' : '')}>
            <Text className="w-8 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{r.slot}</Text>
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-medium tracking-tightish" numberOfLines={1}>{r.name}</Text>
              <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>{r.rem}</Text>
            </View>
            <Text className="text-[12px] font-semibold tabular-nums">{r.pts.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------ ANALYTICS ------------------------------ */
function AnalyticsPane({ active }: { active: League }) {
  const [awardFilter, setAwardFilter] = useState<'season' | number>('season');
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View className="gap-6">
      <Section title="Team comparison">
        <MetricScatter />
      </Section>

      <Section title="League awards">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <FilterChip active={awardFilter === 'season'} onPress={() => setAwardFilter('season')} label="Season" />
          {weeks.map((w) => (
            <FilterChip key={w} active={awardFilter === w} onPress={() => setAwardFilter(w)} label={`Wk ${w}`} />
          ))}
        </ScrollView>
        <View className="flex-row flex-wrap gap-2">
          {AWARDS.map((a) => (
            <View key={a.id} className="w-[48%] rounded-[22px] bg-surface-elevated p-4">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{a.title}</Text>
              <Text className="mt-1.5 text-[15px] font-semibold tracking-tightish">{a.value}</Text>
              <Text className="text-[12px] text-muted-foreground">{awardFilter === 'season' ? a.detail : `${a.detail} · Wk ${awardFilter}`}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="League information">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          <InfoRow label="Scoring" value={active.scoring ?? 'Half PPR'} first />
          <InfoRow label="League size" value={`${active.members} teams`} />
          <InfoRow label="Draft type" value={active.draftType ?? 'Snake'} />
          <InfoRow label="Trade deadline" value="Week 11" />
          <InfoRow label="Playoff format" value="6 teams · 3 weeks" />
          <InfoRow label="Buy in" value={`$${active.buyIn ?? 0}`} />
          <InfoRow label="Pot" value={`$${active.potUsd.toLocaleString()}`} />
        </View>
        <View className="mt-3 overflow-hidden rounded-[24px] bg-surface-elevated">
          <Text className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Scoring breakdown</Text>
          <View className="px-1 pb-2 pt-1">
            <InfoRow label="Passing TD" value="4 pts" first />
            <InfoRow label="Rushing/Receiving TD" value="6 pts" />
            <InfoRow label="Reception" value="0.5 pts" />
            <InfoRow label="Passing yard" value="0.04 pts" />
            <InfoRow label="Rush/Rec yard" value="0.1 pts" />
            <InfoRow label="Interception thrown" value="-2 pts" />
            <InfoRow label="Fumble lost" value="-2 pts" />
          </View>
        </View>
        <View className="mt-3 overflow-hidden rounded-[24px] bg-surface-elevated">
          <Text className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payouts</Text>
          <View className="px-1 pb-2 pt-1">
            <InfoRow label="1st place" value={`$${(active.potUsd * 0.7).toFixed(0)}`} first />
            <InfoRow label="2nd place" value={`$${(active.potUsd * 0.2).toFixed(0)}`} />
            <InfoRow label="3rd place" value={`$${(active.potUsd * 0.1).toFixed(0)}`} />
          </View>
        </View>
        <Text className="px-2 pt-2 text-[11px] text-muted-foreground">
          {active.type === 'synced' ? `Imported from ${active.platform}. Edit on the connected platform.` : 'Edit in Commissioner → League → Settings.'}
        </Text>
      </Section>
    </View>
  );
}

function FilterChip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} className={cn('shrink-0 rounded-full px-3 py-1.5', active ? 'bg-foreground' : 'bg-muted')}>
      <Text className={cn('text-[12px] font-semibold tracking-tightish', active ? 'text-background' : 'text-muted-foreground')}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------ METRIC SCATTER ------------------------------ */
type MetricKey = 'pf' | 'pa' | 'ppg' | 'diff' | 'wins';
const METRICS: { key: MetricKey; label: string; fmt: (n: number) => string }[] = [
  { key: 'pf', label: 'Points For', fmt: (n) => n.toFixed(0) },
  { key: 'pa', label: 'Points Against', fmt: (n) => n.toFixed(0) },
  { key: 'ppg', label: 'Points / Game', fmt: (n) => n.toFixed(1) },
  { key: 'diff', label: 'Point Differential', fmt: (n) => (n >= 0 ? `+${n.toFixed(0)}` : n.toFixed(0)) },
  { key: 'wins', label: 'Wins', fmt: (n) => n.toFixed(0) },
];

function teamMetric(t: TeamRow, k: MetricKey): number {
  const games = t.wins + t.losses;
  switch (k) {
    case 'pf': return t.pf;
    case 'pa': return t.pa;
    case 'ppg': return games ? t.pf / games : 0;
    case 'diff': return t.pf - t.pa;
    case 'wins': return t.wins;
  }
}

function MetricScatter() {
  const c = useColors();
  const [metric, setMetric] = useState<MetricKey>('pf');
  const [hover, setHover] = useState<number | null>(null);
  const cfg = METRICS.find((m) => m.key === metric)!;
  const values = TEAMS.map((t) => teamMetric(t, metric));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const pad = (max - min) * 0.12 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const W = 320, H = 200, padL = 8, padR = 8, padT = 14, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xFor = (i: number) => padL + (innerW * (i + 0.5)) / TEAMS.length;
  const yFor = (v: number) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const avgY = yFor(avg);
  const sorted = [...TEAMS].map((t, i) => ({ t, v: values[i] })).sort((a, b) => b.v - a.v);

  return (
    <View className="gap-3 overflow-hidden rounded-[24px] bg-surface-elevated p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Metric</Text>
          <Text className="text-[15px] font-semibold tracking-tightish">{cfg.label}</Text>
        </View>
        <Text className="text-[11px] text-muted-foreground">League avg <Text className="font-semibold text-foreground">{cfg.fmt(avg)}</Text></Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {METRICS.map((m) => (
          <FilterChip key={m.key} active={metric === m.key} onPress={() => setMetric(m.key)} label={m.label} />
        ))}
      </ScrollView>

      <View className="rounded-[18px] bg-background p-2">
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200}>
          <SvgLine x1={padL} x2={W - padR} y1={avgY} y2={avgY} stroke={c.foreground} strokeOpacity={0.4} strokeDasharray="4 4" strokeWidth={1} />
          <SvgText x={W - padR} y={avgY - 4} textAnchor="end" fill={c.mutedForeground} fontSize={9} fontWeight="600">AVG {cfg.fmt(avg)}</SvgText>
          {TEAMS.map((t, i) => {
            const v = values[i];
            const cx = xFor(i);
            const cy = yFor(v);
            const above = v >= avg;
            const isHover = hover === i;
            return (
              <Fragment key={t.name}>
                <SvgLine x1={cx} x2={cx} y1={avgY} y2={cy} stroke={c.foreground} strokeOpacity={0.18} strokeWidth={1} />
                <Circle cx={cx} cy={cy} r={isHover ? 7 : 5} fill={above ? c.success : c.destructive} fillOpacity={0.9} stroke={c.background} strokeWidth={1.5} onPress={() => setHover(isHover ? null : i)} />
                {isHover ? (
                  <>
                    <Rect x={cx - 42} y={cy - 28} width={84} height={20} rx={6} fill={c.foreground} />
                    <SvgText x={cx} y={cy - 14} textAnchor="middle" fill={c.background} fontSize={9} fontWeight="600">{t.name} · {cfg.fmt(v)}</SvgText>
                  </>
                ) : null}
                <SvgText x={cx} y={H - 10} textAnchor="middle" fill={c.mutedForeground} fontSize={8} fontWeight="600">{t.rank}</SvgText>
              </Fragment>
            );
          })}
        </Svg>
      </View>

      <View className="gap-1 pt-1">
        {sorted.map(({ t, v }, i) => {
          const above = v >= avg;
          const delta = v - avg;
          return (
            <View key={t.name} className="flex-row items-center justify-between rounded-[12px] px-2 py-1.5">
              <View className="min-w-0 flex-row items-center gap-2">
                <Text className="w-4 text-[11px] font-semibold tabular-nums text-muted-foreground">{i + 1}</Text>
                <View className={cn('h-2 w-2 rounded-full', above ? 'bg-success' : 'bg-destructive')} />
                <Text className="text-[12px] tracking-tightish" numberOfLines={1}>{t.name}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text className="text-[12px] font-semibold tabular-nums">{cfg.fmt(v)}</Text>
                <Text className={cn('w-12 text-right text-[11px] tabular-nums', above ? 'text-success' : 'text-destructive')}>{above ? '+' : ''}{delta.toFixed(1)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------ FEED SHEET ------------------------------ */
function FeedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(FEED);
  const [draft, setDraft] = useState('');

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-[30px] bg-background" style={{ height: '82%', paddingBottom: Math.max(insets.bottom, 8) }}>
          <View className="items-center pt-2"><View className="h-1.5 w-10 rounded-full bg-muted" /></View>
          <View className="flex-row items-center justify-between px-5 py-3">
            <View>
              <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">League</Text>
              <Text className="text-[17px] font-semibold tracking-tightish">Feed</Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Text className="text-[16px] font-semibold">×</Text>
            </Pressable>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            {items.map((f) => (
              <FeedCard key={f.id} item={f} />
            ))}
          </ScrollView>
          <View className="flex-row items-center gap-2 border-t border-hairline p-3">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Post to the league…"
              placeholderTextColor={c.mutedForeground}
              className="h-11 flex-1 rounded-full bg-muted px-4 text-[14px] text-foreground"
            />
            <Pressable
              onPress={() => {
                if (!draft.trim()) return;
                setItems((m) => [{ id: `me-${Date.now()}`, kind: 'announcement', who: 'You', headline: draft, when: 'now', reactions: { likes: 0, cheers: 0, laughs: 0 }, comments: 0 }, ...m]);
                setDraft('');
              }}
              className="h-11 items-center justify-center rounded-full bg-foreground px-4"
            >
              <Text className="text-[13px] font-semibold text-background">Post</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------ ATOMS ------------------------------ */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="px-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}

function TagDot({ tag }: { tag?: TeamRow['tag'] }) {
  const cls = tag === 'division' ? 'bg-success' : tag === 'playoff' ? 'bg-foreground/80' : tag === 'bubble' ? 'bg-warning' : tag === 'last' ? 'bg-destructive' : 'bg-transparent';
  return <View className={cn('h-2 w-2 shrink-0 rounded-full', cls)} />;
}

function Legend() {
  return (
    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 px-2 pt-1">
      <LegendDot color="bg-success" label="Division" />
      <LegendDot color="bg-foreground/80" label="Playoff" />
      <LegendDot color="bg-warning" label="Bubble" />
      <LegendDot color="bg-destructive" label="Last" />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className={cn('h-1.5 w-1.5 rounded-full', color)} />
      <Text className="text-[11px] text-muted-foreground">{label}</Text>
    </View>
  );
}

function Movement({ delta }: { delta: number }) {
  const c = useColors();
  if (delta === 0) return <Text className="w-6 text-right text-[11px] text-muted-foreground">—</Text>;
  const up = delta > 0;
  return (
    <View className="w-6 flex-row items-center justify-end gap-0.5">
      {up ? <TrendingUp size={12} color={c.success} /> : <TrendingDown size={12} color={c.destructive} />}
      <Text className={cn('text-[11px] font-semibold tabular-nums', up ? 'text-success' : 'text-destructive')}>{Math.abs(delta)}</Text>
    </View>
  );
}

function StateBadge({ state, kickoff }: { state: Matchup['state']; kickoff?: string }) {
  const c = useColors();
  if (state === 'live')
    return (
      <View className="flex-row items-center gap-1.5">
        <Radio size={12} color={c.success} />
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-success">Live</Text>
      </View>
    );
  if (state === 'final') return <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Final</Text>;
  return <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{kickoff ?? 'Upcoming'}</Text>;
}

const FEED_ICONS: Record<FeedKind, LucideIcon> = {
  announcement: Pin,
  trade: ChevronsUpDown,
  waiver: TrendingUp,
  poll: MessageCircle,
  report: Trophy,
  payment: PartyPopper,
  moment: Flame,
};

function FeedCard({ item }: { item: FeedItem }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [voted, setVoted] = useState<number | null>(null);
  const Icon = FEED_ICONS[item.kind] ?? Flame;
  const totalVotes = item.poll ? item.poll.options.reduce((s, o) => s + o.votes, 0) + (voted !== null ? 1 : 0) : 0;

  return (
    <View className={cn('overflow-hidden rounded-[24px] bg-surface-elevated', item.pinned ? 'border border-foreground/10' : '')}>
      <View className="gap-2 p-4">
        <View className="flex-row items-center gap-2">
          <Icon size={14} color={c.mutedForeground} />
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{item.who}</Text>
          <Text className="text-[11px] text-muted-foreground/60">·</Text>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{item.when}</Text>
          {item.pinned ? (
            <View className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5"><Text className="text-[10px] tracking-widest text-muted-foreground">Pinned</Text></View>
          ) : null}
        </View>
        <Text className="text-[15px] font-medium leading-snug tracking-tightish">{item.headline}</Text>
        {item.body ? <Text className="text-[13px] leading-snug text-muted-foreground">{item.body}</Text> : null}

        {item.poll ? (
          <View className="gap-1.5 pt-1">
            {item.poll.options.map((o, idx) => {
              const votes = o.votes + (voted === idx ? 1 : 0);
              const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
              const selected = voted === idx;
              return (
                <Pressable key={o.label} onPress={() => setVoted(idx)} className="relative overflow-hidden rounded-[14px] border border-border bg-background px-3 py-2">
                  <View className={cn('absolute inset-y-0 left-0', selected ? 'bg-foreground/15' : 'bg-foreground/5')} style={{ width: voted !== null ? `${pct}%` : 0 }} />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-medium tracking-tightish">{o.label}</Text>
                    {voted !== null ? <Text className="text-[12px] tabular-nums text-muted-foreground">{pct}%</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            <Text className="pt-0.5 text-[11px] text-muted-foreground">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-1 px-2 pb-2">
        <ReactBtn icon={ThumbsUp} count={item.reactions.likes} />
        <ReactBtn icon={Heart} count={item.reactions.cheers} />
        <ReactBtn icon={Laugh} count={item.reactions.laughs} />
        <Pressable onPress={() => setOpen((o) => !o)} className="ml-auto flex-row items-center gap-1.5 rounded-full px-3 py-1.5">
          <MessageCircle size={14} color={c.mutedForeground} />
          <Text className="text-[12px] font-medium text-muted-foreground">{item.comments}</Text>
        </Pressable>
      </View>

      {open ? (
        <View className="gap-2 border-t border-hairline p-3">
          <View className="rounded-[14px] bg-background px-3 py-2">
            <Text className="text-[11px] font-semibold text-muted-foreground">Mike</Text>
            <Text className="text-[13px] tracking-tightish">Brutal.</Text>
          </View>
          <TextInput placeholder="Write a comment…" placeholderTextColor={c.mutedForeground} className="rounded-full border border-border bg-background px-4 py-2 text-[13px] text-foreground" />
        </View>
      ) : null}
    </View>
  );
}

function ReactBtn({ icon: Icon, count }: { icon: LucideIcon; count: number }) {
  const c = useColors();
  return (
    <Pressable className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5">
      <Icon size={14} color={c.mutedForeground} />
      {count > 0 ? <Text className="text-[12px] font-medium tabular-nums text-muted-foreground">{count}</Text> : null}
    </Pressable>
  );
}

function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={cn('flex-row items-center justify-between px-4 py-3', first ? '' : 'border-t border-border')}>
      <Text className="text-[13px] text-muted-foreground">{label}</Text>
      <Text className="text-[14px] font-medium tracking-tightish">{value}</Text>
    </View>
  );
}

/* ------------------------------ DETAIL VIEWS ------------------------------ */
function BackBar({ onBack, title }: { onBack: () => void; title: string }) {
  const c = useColors();
  return (
    <View className="flex-row items-center gap-2 px-1 pt-2">
      <Pressable onPress={onBack} className="flex-row items-center gap-1 rounded-full px-2 py-1.5">
        <ChevronLeft size={16} color={c.mutedForeground} />
        <Text className="text-[14px] text-muted-foreground">League</Text>
      </Pressable>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">/ {title}</Text>
    </View>
  );
}

function MatchupDetail({ matchup: m, onBack }: { matchup: Matchup; onBack: () => void }) {
  const homeLineup = LINEUP_DEFAULT;
  const awayLineup = homeLineup.map((p, i) => ({
    ...p,
    name: ['P. Mahomes', 'S. Barkley', 'D. Henry', 'C. Lamb', 'A. St. Brown', 'G. Kittle', 'C. Olave', 'B. Aubrey', 'Cowboys'][i],
    pts: Math.max(0, p.pts - 2 + (i % 3) * 1.5),
  }));

  return (
    <View className="gap-5 px-4 pb-6">
      <BackBar onBack={onBack} title="Matchup" />
      <View className="overflow-hidden rounded-[28px] bg-surface-elevated p-5">
        <View className="flex-row items-center justify-between">
          <StateBadge state={m.state} kickoff={m.kickoff} />
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Win prob</Text>
        </View>
        <View className="mt-3 flex-row items-center gap-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <AvatarImage src={personAvatar(m.home.owner + m.home.name)} name={m.home.owner} className="h-9 w-9" />
              <Text className="text-[13px] text-muted-foreground">{m.home.owner}</Text>
            </View>
            <Text className="mt-1 text-[16px] font-semibold tracking-tightish">{m.home.name}</Text>
            <Text className="mt-2 text-[28px] font-semibold tabular-nums">{m.hp.toFixed(1)}</Text>
            <Text className="text-[11px] text-muted-foreground">proj {m.hproj.toFixed(1)}</Text>
          </View>
          <Text className="text-[11px] uppercase tracking-widest text-muted-foreground">vs</Text>
          <View className="flex-1 items-end">
            <View className="flex-row items-center gap-2">
              <Text className="text-[13px] text-muted-foreground">{m.away.owner}</Text>
              <AvatarImage src={personAvatar(m.away.owner + m.away.name)} name={m.away.owner} className="h-9 w-9" />
            </View>
            <Text className="mt-1 text-[16px] font-semibold tracking-tightish">{m.away.name}</Text>
            <Text className="mt-2 text-[28px] font-semibold tabular-nums">{m.ap.toFixed(1)}</Text>
            <Text className="text-[11px] text-muted-foreground">proj {m.aproj.toFixed(1)}</Text>
          </View>
        </View>
        <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
          <View className="h-full bg-foreground/80" style={{ width: `${Math.round(m.winProb * 100)}%` }} />
        </View>
        <View className="mt-1 flex-row justify-between">
          <Text className="text-[11px] tabular-nums text-muted-foreground">{Math.round(m.winProb * 100)}%</Text>
          <Text className="text-[11px] tabular-nums text-muted-foreground">{Math.round((1 - m.winProb) * 100)}%</Text>
        </View>
      </View>

      <Section title="AI summary">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <Text className="text-[14px] leading-snug tracking-tightish">
            {m.state === 'live'
              ? `${m.home.name} pulled ahead in the second half thanks to Jefferson and Robinson. ${m.away.name} still has Kelce and the Monday night flex to come.`
              : m.state === 'final'
                ? `${m.home.name} cruised behind a balanced attack. ${m.away.name} couldn't recover after two starters left early.`
                : `Projection model favors ${m.winProb >= 0.5 ? m.home.name : m.away.name} by ${Math.abs(m.hproj - m.aproj).toFixed(1)} points. Watch the late window for swing.`}
          </Text>
        </View>
      </Section>

      <Section title="Lineups">
        <View className="flex-row gap-2">
          <View className="flex-1"><LineupCol team={m.home.name} rows={homeLineup} /></View>
          <View className="flex-1"><LineupCol team={m.away.name} rows={awayLineup} /></View>
        </View>
      </Section>

      <Section title="Scoring timeline">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {[
            { t: 'Q4 7:22', who: 'Jefferson', play: '21yd TD reception', pts: '+8.1' },
            { t: 'Q3 2:11', who: 'Robinson', play: '4yd TD run', pts: '+7.4' },
            { t: 'Q2 9:05', who: 'Mahomes', play: '32yd TD pass', pts: '+5.2' },
            { t: 'Q1 4:48', who: 'Allen', play: '12yd TD run', pts: '+7.1' },
          ].map((e, i) => (
            <View key={i} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <Text className="w-14 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{e.t}</Text>
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-medium tracking-tightish" numberOfLines={1}>{e.who}</Text>
                <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{e.play}</Text>
              </View>
              <Text className="text-[13px] font-semibold tabular-nums text-success">{e.pts}</Text>
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

function LineupCol({ team, rows }: { team: string; rows: typeof LINEUP_DEFAULT }) {
  return (
    <View className="overflow-hidden rounded-[22px] bg-surface-elevated">
      <Text className="px-3 pt-3 text-[12px] font-semibold tracking-tightish" numberOfLines={1}>{team}</Text>
      <View className="mt-2">
        {rows.map((r, i) => (
          <View key={r.slot + i} className={cn('flex-row items-center gap-2 px-3 py-2', i > 0 ? 'border-t border-hairline' : '')}>
            <Text className="w-8 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{r.slot}</Text>
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-medium tracking-tightish" numberOfLines={1}>{r.name}</Text>
              <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>{r.rem}</Text>
            </View>
            <Text className="text-[12px] font-semibold tabular-nums">{r.pts.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TeamOverview({ team, onBack }: { team: TeamRow; onBack: () => void }) {
  return (
    <View className="gap-5 px-4 pb-6">
      <BackBar onBack={onBack} title="Team" />
      <View className="rounded-[28px] bg-surface-elevated p-5">
        <View className="flex-row items-center gap-3">
          <AvatarImage src={personAvatar(team.owner + team.name)} name={team.owner} className="h-14 w-14" />
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Rank {team.rank}{team.seed ? ` · Seed ${team.seed}` : ''}</Text>
            <Text className="mt-0.5 text-[24px] font-semibold tracking-tighter2" numberOfLines={1}>{team.name}</Text>
            <Text className="text-[13px] text-muted-foreground">{team.owner}</Text>
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          <Stat label="Record" value={`${team.wins}-${team.losses}`} />
          <Stat label="Streak" value={team.streak} />
          <Stat label="PF" value={team.pf.toFixed(0)} />
          <Stat label="PA" value={team.pa.toFixed(0)} />
        </View>
      </View>

      <Section title="Season trend">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <View className="h-20 flex-row items-end gap-1">
            {[78, 92, 110, 88, 121, 99, 134].map((v, i) => (
              <View key={i} className="flex-1 rounded-md bg-foreground/70" style={{ height: `${(v / 134) * 100}%` }} />
            ))}
          </View>
          <View className="mt-2 flex-row justify-between">
            {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'].map((w) => (
              <Text key={w} className="text-[11px] tabular-nums text-muted-foreground">{w}</Text>
            ))}
          </View>
        </View>
      </Section>

      <Section title="Recent activity">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {[
            { t: '2d', what: 'Added T. Spears (RB)' },
            { t: '5d', what: 'Traded D. London for K. Walker III' },
            { t: '1w', what: 'Dropped J. Reed (TE)' },
          ].map((a, i) => (
            <View key={i} className={cn('flex-row items-center justify-between px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <Text className="text-[13px] tracking-tightish">{a.what}</Text>
              <Text className="text-[11px] text-muted-foreground">{a.t}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Text className="px-2 text-[11px] text-muted-foreground">Roster management lives in the Team tab. This view is read only.</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-[16px] bg-background px-3 py-2.5">
      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-[15px] font-semibold tabular-nums tracking-tightish">{value}</Text>
    </View>
  );
}
