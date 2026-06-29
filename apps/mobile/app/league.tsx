import { Fragment, useRef, useState, type ReactNode, useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
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
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { PageIntro } from '@/components/ui/PageIntro';
import { useLeague, type League } from '@/lib/league-context';
import { personAvatar } from '@/lib/avatars';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';

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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<LeagueTab>('standings');
  const [feedOpen, setFeedOpen] = useState(false);
  const totalW = TEAMS.reduce((s, t) => s + t.wins, 0);
  const totalL = TEAMS.reduce((s, t) => s + t.losses, 0);

  return (
    <View style={layout.screen}>
      <PageIntro
        eyebrow={`Week ${active.week}`}
        title={active.name}
        subtitle={`${active.members} teams · ${totalW}-${totalL} combined · ${active.type === 'synced' ? `Synced from ${active.platform}` : 'Hosted'}`}
      />

      <View style={[layout.row, { gap: 8 }]}>
        <View style={[layout.flex1, { minWidth: 0 }]}>
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
        <Pressable
          onPress={() => setFeedOpen(true)}
          style={[
            layout.iconButtonSm,
            { position: 'relative', borderRadius: 9999, backgroundColor: hex.surfaceElevated },
          ]}
        >
          <MessageCircle size={20} color={c.foreground} />
          <View style={surfaces.badge}>
            <Text variant="pill" style={{ fontWeight: '600', color: hex.background, fontSize: 10 }}>
              {FEED.length}
            </Text>
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
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const clinching = TEAMS.filter((t) => playoffOdds(t.rank) >= 95).length;
  const bubble = TEAMS.filter((t) => {
    const o = playoffOdds(t.rank);
    return o >= 20 && o < 95;
  }).length;

  return (
    <Section title="Standings & playoff odds">
      <View style={styles.standingsBanner}>
        <Text variant="eyebrow">Top 6 make playoffs</Text>
        <Text variant="caption">
          <Text variant="caption" style={{ color: toneFg.success, fontWeight: '600' }}>{clinching}</Text>
          {' clinching · '}
          <Text variant="caption" style={{ color: hex.warning, fontWeight: '600' }}>{bubble}</Text>
          {' bubble'}
        </Text>
      </View>
      <View style={surfaces.roundedCard}>
        {TEAMS.map((t, i) => {
          const odds = playoffOdds(t.rank);
          const oddsColor =
            odds >= 90 ? toneFg.success : odds >= 50 ? hex.foreground : odds >= 20 ? hex.warning : toneFg.danger;
          const barColor =
            odds >= 90 ? hex.success : odds >= 50 ? `rgba(${ink},0.8)` : odds >= 20 ? hex.warning : 'rgba(238,55,52,0.7)';
          return (
            <Pressable key={t.name} onPress={() => onOpenTeam(t.name)}>
              <View style={[styles.standingsRow, i > 0 ? layout.listRowBorder : null]}>
                <Text variant="bodyMuted" style={{ width: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{t.rank}</Text>
                <AvatarImage src={personAvatar(t.owner + t.name)} name={t.owner} size={36} />
                <TagDot tag={t.tag} />
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="body" numberOfLines={1}>{t.name}</Text>
                  <Text variant="bodyMuted" numberOfLines={1}>{t.owner} · {t.wins}-{t.losses} · {t.streak}</Text>
                  <View style={surfaces.progressTrack}>
                    <View style={[surfaces.progressFill, { width: `${odds}%`, backgroundColor: barColor }]} />
                  </View>
                </View>
                <View style={layout.alignEnd}>
                  <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'], color: oddsColor }}>{odds}%</Text>
                  <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{t.pf.toFixed(0)} PF</Text>
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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<ScrollView | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (idx !== active) setActive(idx);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[layout.rowBetween, { paddingHorizontal: 4 }]}>
        <Text variant="eyebrow">Matchup {active + 1} of {MATCHUPS.length}</Text>
        <Text variant="caption">Swipe →</Text>
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
      <View style={[layout.row, layout.centered, { gap: 6, paddingTop: 4 }]}>
        {MATCHUPS.map((_, i) => (
          <Pressable key={i} onPress={() => scrollerRef.current?.scrollTo({ x: i * cardW, animated: true })}>
            <View
              style={{
                height: 6,
                borderRadius: 9999,
                width: i === active ? 20 : 6,
                backgroundColor: i === active ? hex.foreground : 'rgba(99,99,99,0.4)',
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LiveMatchupCard({ matchup: m, homeLineup, awayLineup, onOpen }: { matchup: Matchup; homeLineup: typeof LINEUP_DEFAULT; awayLineup: typeof LINEUP_DEFAULT; onOpen: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const c = useColors();
  return (
    <View style={surfaces.roundedCardLg}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={layout.rowBetween}>
          <StateBadge state={m.state} kickoff={m.kickoff} />
          <Text variant="eyebrow">{Math.round(m.winProb * 100)}% · {Math.round((1 - m.winProb) * 100)}%</Text>
        </View>
        <View style={[layout.row, { gap: 8, marginTop: 12 }]}>
          <View style={[layout.flex1, { minWidth: 0 }]}>
            <View style={[layout.row, { gap: 8 }]}>
              <AvatarImage src={personAvatar(m.home.owner + m.home.name)} name={m.home.owner} size={32} />
              <Text variant="bodyMuted" numberOfLines={1}>{m.home.owner}</Text>
            </View>
            <Text variant="bodySm" style={{ marginTop: 4 }} numberOfLines={1}>{m.home.name}</Text>
            <Text
              variant="scoreLG"
              style={{ marginTop: 4, fontVariant: ['tabular-nums'], color: m.hp > m.ap && m.state !== 'pre' ? toneFg.success : hex.foreground }}
            >
              {m.state === 'pre' ? '—' : m.hp.toFixed(1)}
            </Text>
            <Text variant="pill" muted>proj {m.hproj.toFixed(1)}</Text>
          </View>
          <Text variant="caption" style={{ textTransform: 'uppercase', letterSpacing: 2 }}>vs</Text>
          <View style={[layout.flex1, layout.alignEnd, { minWidth: 0 }]}>
            <View style={[layout.row, { gap: 8 }]}>
              <Text variant="bodyMuted" numberOfLines={1}>{m.away.owner}</Text>
              <AvatarImage src={personAvatar(m.away.owner + m.away.name)} name={m.away.owner} size={32} />
            </View>
            <Text variant="bodySm" style={{ marginTop: 4 }} numberOfLines={1}>{m.away.name}</Text>
            <Text
              variant="scoreLG"
              style={{ marginTop: 4, fontVariant: ['tabular-nums'], color: m.ap > m.hp && m.state !== 'pre' ? toneFg.success : hex.foreground }}
            >
              {m.state === 'pre' ? '—' : m.ap.toFixed(1)}
            </Text>
            <Text variant="pill" muted>proj {m.aproj.toFixed(1)}</Text>
          </View>
        </View>
        <View style={[surfaces.progressTrack, { marginTop: 12, height: 4 }]}>
          <View style={[surfaces.progressFill, { width: `${Math.round(m.winProb * 100)}%`, backgroundColor: `rgba(${ink},0.8)` }]} />
        </View>
      </View>
      <View style={[layout.row, { marginTop: 16 }]}>
        <View style={layout.flex1}><LiveLineupCol team={m.home.name} rows={homeLineup} /></View>
        <View style={[layout.flex1, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: hex.border }]}>
          <LiveLineupCol team={m.away.name} rows={awayLineup} />
        </View>
      </View>
      <Pressable onPress={onOpen}>
        <View style={[layout.cardFooter, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, paddingHorizontal: 20 }]}>
          <Text variant="link">Open matchup</Text>
          <ChevronRight size={16} color={c.mutedForeground} />
        </View>
      </Pressable>
    </View>
  );
}

function LiveLineupCol({ team, rows }: { team: string; rows: typeof LINEUP_DEFAULT }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View>
      <Text variant="eyebrow" style={{ paddingHorizontal: 12, paddingTop: 12 }} numberOfLines={1}>{team}</Text>
      <View style={{ marginTop: 4 }}>
        {rows.map((r, i) => (
          <View key={r.slot + i} style={[styles.lineupRow, i > 0 ? layout.listRowBorder : null]}>
            <Text variant="pill" muted style={{ width: 32, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{r.slot}</Text>
            <View style={[layout.flex1, { minWidth: 0 }]}>
              <Text variant="bodyMuted" style={{ fontSize: 12, fontWeight: '500', color: hex.foreground }} numberOfLines={1}>{r.name}</Text>
              <Text variant="pill" muted numberOfLines={1}>{r.rem}</Text>
            </View>
            <Text variant="bodyMuted" style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], color: hex.foreground }}>{r.pts.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------ ANALYTICS ------------------------------ */
function AnalyticsPane({ active }: { active: League }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const [awardFilter, setAwardFilter] = useState<'season' | number>('season');
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={{ gap: 24 }}>
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
        <View style={[layout.rowWrap, { gap: 8 }]}>
          {AWARDS.map((a) => (
            <View key={a.id} style={styles.awardCard}>
              <Text variant="eyebrow">{a.title}</Text>
              <Text variant="body" style={{ marginTop: 6 }}>{a.value}</Text>
              <Text variant="bodyMuted">{awardFilter === 'season' ? a.detail : `${a.detail} · Wk ${awardFilter}`}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="League information">
        <View style={surfaces.roundedCard}>
          <InfoRow label="Scoring" value={active.scoring ?? 'Half PPR'} first />
          <InfoRow label="League size" value={`${active.members} teams`} />
          <InfoRow label="Draft type" value={active.draftType ?? 'Snake'} />
          <InfoRow label="Trade deadline" value="Week 11" />
          <InfoRow label="Playoff format" value="6 teams · 3 weeks" />
          <InfoRow label="Buy in" value={`$${active.buyIn ?? 0}`} />
          <InfoRow label="Pot" value={`$${active.potUsd.toLocaleString()}`} />
        </View>
        <View style={[surfaces.roundedCard, { marginTop: 12 }]}>
          <Text variant="eyebrow" style={{ paddingHorizontal: 16, paddingTop: 12 }}>Scoring breakdown</Text>
          <View style={{ paddingHorizontal: 4, paddingBottom: 8, paddingTop: 4 }}>
            <InfoRow label="Passing TD" value="4 pts" first />
            <InfoRow label="Rushing/Receiving TD" value="6 pts" />
            <InfoRow label="Reception" value="0.5 pts" />
            <InfoRow label="Passing yard" value="0.04 pts" />
            <InfoRow label="Rush/Rec yard" value="0.1 pts" />
            <InfoRow label="Interception thrown" value="-2 pts" />
            <InfoRow label="Fumble lost" value="-2 pts" />
          </View>
        </View>
        <View style={[surfaces.roundedCard, { marginTop: 12 }]}>
          <Text variant="eyebrow" style={{ paddingHorizontal: 16, paddingTop: 12 }}>Payouts</Text>
          <View style={{ paddingHorizontal: 4, paddingBottom: 8, paddingTop: 4 }}>
            <InfoRow label="1st place" value={`$${(active.potUsd * 0.7).toFixed(0)}`} first />
            <InfoRow label="2nd place" value={`$${(active.potUsd * 0.2).toFixed(0)}`} />
            <InfoRow label="3rd place" value={`$${(active.potUsd * 0.1).toFixed(0)}`} />
          </View>
        </View>
        <Text variant="caption" style={{ paddingHorizontal: 8, paddingTop: 8 }}>
          {active.type === 'synced' ? `Imported from ${active.platform}. Edit on the connected platform.` : 'Edit in Commissioner → League → Settings.'}
        </Text>
      </Section>
    </View>
  );
}

function FilterChip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, { backgroundColor: active ? hex.primary : hex.muted }]}
    >
      <Text variant="bodyMuted" style={{ fontSize: 12, fontWeight: '600', color: active ? hex.primaryForeground : hex.mutedForeground }}>
        {label}
      </Text>
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
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
    <View style={[surfaces.roundedCard, { gap: 12, padding: 16 }]}>
      <View style={layout.rowBetween}>
        <View>
          <Text variant="eyebrow">Metric</Text>
          <Text variant="body">{cfg.label}</Text>
        </View>
        <Text variant="caption">
          League avg <Text variant="caption" style={{ color: hex.foreground, fontWeight: '600' }}>{cfg.fmt(avg)}</Text>
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {METRICS.map((m) => (
          <FilterChip key={m.key} active={metric === m.key} onPress={() => setMetric(m.key)} label={m.label} />
        ))}
      </ScrollView>

      <View style={{ borderRadius: 18, backgroundColor: hex.background, padding: 8 }}>
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

      <View style={{ gap: 4, paddingTop: 4 }}>
        {sorted.map(({ t, v }, i) => {
          const above = v >= avg;
          const delta = v - avg;
          return (
            <View key={t.name} style={styles.metricRow}>
              <View style={[layout.row, { gap: 8, minWidth: 0, flex: 1 }]}>
                <Text variant="caption" style={{ width: 16, fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
                <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: above ? hex.success : hex.danger }} />
                <Text variant="bodyMuted" style={{ fontSize: 12, color: hex.foreground, flex: 1 }} numberOfLines={1}>{t.name}</Text>
              </View>
              <View style={[layout.row, { gap: 12 }]}>
                <Text variant="bodyMuted" style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], color: hex.foreground }}>{cfg.fmt(v)}</Text>
                <Text
                  variant="caption"
                  style={{
                    width: 48,
                    textAlign: 'right',
                    fontVariant: ['tabular-nums'],
                    color: above ? toneFg.success : toneFg.danger,
                  }}
                >
                  {above ? '+' : ''}{delta.toFixed(1)}
                </Text>
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
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(FEED);
  const [draft, setDraft] = useState('');

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.feedSheet, { height: '82%', paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ height: 6, width: 40, borderRadius: 9999, backgroundColor: hex.muted }} />
          </View>
          <View style={[layout.rowBetween, { paddingHorizontal: 20, paddingVertical: 12 }]}>
            <View>
              <Text variant="pill" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>League</Text>
              <Text variant="titleLg">Feed</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9999, backgroundColor: hex.muted }}
            >
              <Text variant="titleMd">×</Text>
            </Pressable>
          </View>
          <ScrollView
            style={layout.fill}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((f) => (
              <FeedCard key={f.id} item={f} />
            ))}
          </ScrollView>
          <View style={[layout.row, { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, padding: 12 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Post to the league…"
              placeholderTextColor={c.mutedForeground}
              style={styles.feedInput}
            />
            <Pressable
              onPress={() => {
                if (!draft.trim()) return;
                setItems((m) => [{ id: `me-${Date.now()}`, kind: 'announcement', who: 'You', headline: draft, when: 'now', reactions: { likes: 0, cheers: 0, laughs: 0 }, comments: 0 }, ...m]);
                setDraft('');
              }}
              style={styles.feedPostBtn}
            >
              <Text variant="button" style={{ color: hex.primaryForeground }}>Post</Text>
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
    <View style={{ marginBottom: 20, gap: 8 }}>
      <Text variant="eyebrow" style={{ paddingHorizontal: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function TagDot({ tag }: { tag?: TeamRow['tag'] }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const color =
    tag === 'division'
      ? hex.success
      : tag === 'playoff'
        ? `rgba(${ink},0.8)`
        : tag === 'bubble'
          ? hex.warning
          : tag === 'last'
            ? hex.danger
            : 'transparent';
  return <View style={{ width: 8, height: 8, borderRadius: 9999, flexShrink: 0, backgroundColor: color }} />;
}

function Legend() {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  return (
    <View style={[layout.rowWrap, { gap: 12, rowGap: 4, paddingHorizontal: 8, paddingTop: 4, alignItems: 'center' }]}>
      <LegendDot color={hex.success} label="Division" />
      <LegendDot color={`rgba(${ink},0.8)`} label="Playoff" />
      <LegendDot color={hex.warning} label="Bubble" />
      <LegendDot color={hex.danger} label="Last" />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={[layout.row, { gap: 4 }]}>
      <View style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: color }} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function Movement({ delta }: { delta: number }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  if (delta === 0) return <Text variant="caption" style={{ width: 24, textAlign: 'right' }}>—</Text>;
  const up = delta > 0;
  return (
    <View style={[layout.row, { width: 24, justifyContent: 'flex-end', gap: 2 }]}>
      {up ? <TrendingUp size={12} color={c.success} /> : <TrendingDown size={12} color={c.destructive} />}
      <Text variant="caption" style={{ fontWeight: '600', fontVariant: ['tabular-nums'], color: up ? toneFg.success : toneFg.danger }}>
        {Math.abs(delta)}
      </Text>
    </View>
  );
}

function StateBadge({ state, kickoff }: { state: Matchup['state']; kickoff?: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  if (state === 'live')
    return (
      <View style={[layout.row, { gap: 6 }]}>
        <Radio size={12} color={c.success} />
        <Text variant="captionSuccess" style={{ textTransform: 'uppercase', letterSpacing: 2 }}>Live</Text>
      </View>
    );
  if (state === 'final') return <Text variant="eyebrow">Final</Text>;
  return <Text variant="eyebrow">{kickoff ?? 'Upcoming'}</Text>;
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
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [voted, setVoted] = useState<number | null>(null);
  const Icon = FEED_ICONS[item.kind] ?? Flame;
  const totalVotes = item.poll ? item.poll.options.reduce((s, o) => s + o.votes, 0) + (voted !== null ? 1 : 0) : 0;

  return (
    <View style={[surfaces.roundedCard, item.pinned ? { borderWidth: StyleSheet.hairlineWidth, borderColor: `rgba(${ink},0.1)` } : null]}>
      <View style={{ gap: 8, padding: 16 }}>
        <View style={[layout.row, { gap: 8 }]}>
          <Icon size={14} color={c.mutedForeground} />
          <Text variant="eyebrow">{item.who}</Text>
          <Text variant="caption" style={{ opacity: 0.6 }}>·</Text>
          <Text variant="eyebrow">{item.when}</Text>
          {item.pinned ? (
            <View style={[surfaces.pillMuted, { marginLeft: 'auto' }]}>
              <Text variant="pill" muted style={{ letterSpacing: 1 }}>Pinned</Text>
            </View>
          ) : null}
        </View>
        <Text variant="body">{item.headline}</Text>
        {item.body ? <Text variant="subtitle">{item.body}</Text> : null}

        {item.poll ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            {item.poll.options.map((o, idx) => {
              const votes = o.votes + (voted === idx ? 1 : 0);
              const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
              const selected = voted === idx;
              return (
                <Pressable
                  key={o.label}
                  onPress={() => setVoted(idx)}
                  style={styles.pollOption}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      backgroundColor: selected ? `rgba(${ink},0.15)` : `rgba(${ink},0.05)`,
                      width: voted !== null ? `${pct}%` : 0,
                    }}
                  />
                  <View style={layout.rowBetween}>
                    <Text variant="bodySm" style={{ fontSize: 13 }}>{o.label}</Text>
                    {voted !== null ? <Text variant="bodyMuted" style={{ fontVariant: ['tabular-nums'] }}>{pct}%</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            <Text variant="caption" style={{ paddingTop: 2 }}>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</Text>
          </View>
        ) : null}
      </View>

      <View style={[layout.row, { gap: 4, paddingHorizontal: 8, paddingBottom: 8 }]}>
        <ReactBtn icon={ThumbsUp} count={item.reactions.likes} />
        <ReactBtn icon={Heart} count={item.reactions.cheers} />
        <ReactBtn icon={Laugh} count={item.reactions.laughs} />
        <Pressable onPress={() => setOpen((o) => !o)} style={[layout.row, { gap: 6, marginLeft: 'auto', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }]}>
          <MessageCircle size={14} color={c.mutedForeground} />
          <Text variant="bodyMuted" style={{ fontWeight: '500' }}>{item.comments}</Text>
        </Pressable>
      </View>

      {open ? (
        <View style={{ gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, padding: 12 }}>
          <View style={{ borderRadius: 14, backgroundColor: hex.background, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text variant="caption" style={{ fontWeight: '600' }}>Mike</Text>
            <Text variant="bodySm" style={{ fontSize: 13 }}>Brutal.</Text>
          </View>
          <TextInput
            placeholder="Write a comment…"
            placeholderTextColor={c.mutedForeground}
            style={styles.commentInput}
          />
        </View>
      ) : null}
    </View>
  );
}

function ReactBtn({ icon: Icon, count }: { icon: LucideIcon; count: number }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <Pressable style={[layout.row, { gap: 6, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }]}>
      <Icon size={14} color={c.mutedForeground} />
      {count > 0 ? <Text variant="bodyMuted" style={{ fontWeight: '500', fontVariant: ['tabular-nums'] }}>{count}</Text> : null}
    </Pressable>
  );
}

function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 12 }, !first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.border } : null]}>
      <Text variant="subtitle">{label}</Text>
      <Text variant="bodySm" style={{ fontSize: 14 }}>{value}</Text>
    </View>
  );
}

/* ------------------------------ DETAIL VIEWS ------------------------------ */
function BackBar({ onBack, title }: { onBack: () => void; title: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <View style={[layout.row, { gap: 8, paddingHorizontal: 4, paddingTop: 8 }]}>
      <Pressable onPress={onBack} style={[layout.row, { gap: 4, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 6 }]}>
        <ChevronLeft size={16} color={c.mutedForeground} />
        <Text variant="bodySm" style={{ fontSize: 14, color: hex.mutedForeground }}>League</Text>
      </Pressable>
      <Text variant="eyebrow">/ {title}</Text>
    </View>
  );
}

function MatchupDetail({ matchup: m, onBack }: { matchup: Matchup; onBack: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const homeLineup = LINEUP_DEFAULT;
  const awayLineup = homeLineup.map((p, i) => ({
    ...p,
    name: ['P. Mahomes', 'S. Barkley', 'D. Henry', 'C. Lamb', 'A. St. Brown', 'G. Kittle', 'C. Olave', 'B. Aubrey', 'Cowboys'][i],
    pts: Math.max(0, p.pts - 2 + (i % 3) * 1.5),
  }));

  return (
    <View style={layout.screen}>
      <BackBar onBack={onBack} title="Matchup" />
      <View style={[surfaces.roundedCardLg, { padding: 20 }]}>
        <View style={layout.rowBetween}>
          <StateBadge state={m.state} kickoff={m.kickoff} />
          <Text variant="eyebrow">Win prob</Text>
        </View>
        <View style={[layout.row, { gap: 8, marginTop: 12 }]}>
          <View style={layout.flex1}>
            <View style={[layout.row, { gap: 8 }]}>
              <AvatarImage src={personAvatar(m.home.owner + m.home.name)} name={m.home.owner} size={36} />
              <Text variant="subtitle">{m.home.owner}</Text>
            </View>
            <Text variant="titleMd" style={{ marginTop: 4 }}>{m.home.name}</Text>
            <Text variant="scoreLG" style={{ marginTop: 8, fontVariant: ['tabular-nums'] }}>{m.hp.toFixed(1)}</Text>
            <Text variant="caption">proj {m.hproj.toFixed(1)}</Text>
          </View>
          <Text variant="caption" style={{ textTransform: 'uppercase', letterSpacing: 2 }}>vs</Text>
          <View style={[layout.flex1, layout.alignEnd]}>
            <View style={[layout.row, { gap: 8 }]}>
              <Text variant="subtitle">{m.away.owner}</Text>
              <AvatarImage src={personAvatar(m.away.owner + m.away.name)} name={m.away.owner} size={36} />
            </View>
            <Text variant="titleMd" style={{ marginTop: 4 }}>{m.away.name}</Text>
            <Text variant="scoreLG" style={{ marginTop: 8, fontVariant: ['tabular-nums'] }}>{m.ap.toFixed(1)}</Text>
            <Text variant="caption">proj {m.aproj.toFixed(1)}</Text>
          </View>
        </View>
        <View style={[surfaces.progressTrack, { marginTop: 16, height: 6 }]}>
          <View style={[surfaces.progressFill, { width: `${Math.round(m.winProb * 100)}%`, backgroundColor: `rgba(${ink},0.8)` }]} />
        </View>
        <View style={[layout.rowBetween, { marginTop: 4 }]}>
          <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{Math.round(m.winProb * 100)}%</Text>
          <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{Math.round((1 - m.winProb) * 100)}%</Text>
        </View>
      </View>

      <Section title="AI summary">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <Text variant="bodySm" style={{ fontSize: 14, lineHeight: 20 }}>
            {m.state === 'live'
              ? `${m.home.name} pulled ahead in the second half thanks to Jefferson and Robinson. ${m.away.name} still has Kelce and the Monday night flex to come.`
              : m.state === 'final'
                ? `${m.home.name} cruised behind a balanced attack. ${m.away.name} couldn't recover after two starters left early.`
                : `Projection model favors ${m.winProb >= 0.5 ? m.home.name : m.away.name} by ${Math.abs(m.hproj - m.aproj).toFixed(1)} points. Watch the late window for swing.`}
          </Text>
        </View>
      </Section>

      <Section title="Lineups">
        <View style={[layout.row, { gap: 8 }]}>
          <View style={layout.flex1}><LineupCol team={m.home.name} rows={homeLineup} /></View>
          <View style={layout.flex1}><LineupCol team={m.away.name} rows={awayLineup} /></View>
        </View>
      </Section>

      <Section title="Scoring timeline">
        <View style={surfaces.roundedCard}>
          {[
            { t: 'Q4 7:22', who: 'Jefferson', play: '21yd TD reception', pts: '+8.1' },
            { t: 'Q3 2:11', who: 'Robinson', play: '4yd TD run', pts: '+7.4' },
            { t: 'Q2 9:05', who: 'Mahomes', play: '32yd TD pass', pts: '+5.2' },
            { t: 'Q1 4:48', who: 'Allen', play: '12yd TD run', pts: '+7.1' },
          ].map((e, i) => (
            <View key={i} style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 12 }, i > 0 ? layout.listRowBorder : null]}>
              <Text variant="eyebrow" style={{ width: 56 }}>{e.t}</Text>
              <View style={[layout.flex1, { minWidth: 0 }]}>
                <Text variant="bodySm" style={{ fontSize: 13 }} numberOfLines={1}>{e.who}</Text>
                <Text variant="bodyMuted" numberOfLines={1}>{e.play}</Text>
              </View>
              <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'], color: toneFg.success }}>{e.pts}</Text>
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

function LineupCol({ team, rows }: { team: string; rows: typeof LINEUP_DEFAULT }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: hex.surfaceElevated }}>
      <Text variant="bodySm" style={{ fontSize: 12, paddingHorizontal: 12, paddingTop: 12 }} numberOfLines={1}>{team}</Text>
      <View style={{ marginTop: 8 }}>
        {rows.map((r, i) => (
          <View key={r.slot + i} style={[styles.lineupRowLg, i > 0 ? layout.listRowBorder : null]}>
            <Text variant="pill" muted style={{ width: 32, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{r.slot}</Text>
            <View style={[layout.flex1, { minWidth: 0 }]}>
              <Text variant="bodyMuted" style={{ fontSize: 12, fontWeight: '500', color: hex.foreground }} numberOfLines={1}>{r.name}</Text>
              <Text variant="pill" muted numberOfLines={1}>{r.rem}</Text>
            </View>
            <Text variant="bodyMuted" style={{ fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], color: hex.foreground }}>{r.pts.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TeamOverview({ team, onBack }: { team: TeamRow; onBack: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  return (
    <View style={layout.screen}>
      <BackBar onBack={onBack} title="Team" />
      <View style={[surfaces.roundedCardLg, { padding: 20 }]}>
        <View style={[layout.row, { gap: 12 }]}>
          <AvatarImage src={personAvatar(team.owner + team.name)} name={team.owner} size={56} />
          <View style={[layout.flex1, { minWidth: 0 }]}>
            <Text variant="eyebrow">Rank {team.rank}{team.seed ? ` · Seed ${team.seed}` : ''}</Text>
            <Text variant="titleLg" style={{ marginTop: 2, fontSize: 24, letterSpacing: -0.6 }} numberOfLines={1}>{team.name}</Text>
            <Text variant="subtitle">{team.owner}</Text>
          </View>
        </View>
        <View style={[layout.row, { gap: 8, marginTop: 16 }]}>
          <Stat label="Record" value={`${team.wins}-${team.losses}`} />
          <Stat label="Streak" value={team.streak} />
          <Stat label="PF" value={team.pf.toFixed(0)} />
          <Stat label="PA" value={team.pa.toFixed(0)} />
        </View>
      </View>

      <Section title="Season trend">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <View style={{ height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            {[78, 92, 110, 88, 121, 99, 134].map((v, i) => (
              <View key={i} style={{ flex: 1, borderRadius: 6, backgroundColor: `rgba(${ink},0.7)`, height: `${(v / 134) * 100}%` }} />
            ))}
          </View>
          <View style={[layout.rowBetween, { marginTop: 8 }]}>
            {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'].map((w) => (
              <Text key={w} variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{w}</Text>
            ))}
          </View>
        </View>
      </Section>

      <Section title="Recent activity">
        <View style={surfaces.roundedCard}>
          {[
            { t: '2d', what: 'Added T. Spears (RB)' },
            { t: '5d', what: 'Traded D. London for K. Walker III' },
            { t: '1w', what: 'Dropped J. Reed (TE)' },
          ].map((a, i) => (
            <View key={i} style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 12 }, i > 0 ? layout.listRowBorder : null]}>
              <Text variant="bodySm" style={{ fontSize: 13 }}>{a.what}</Text>
              <Text variant="caption">{a.t}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Text variant="caption" style={{ paddingHorizontal: 8 }}>Roster management lives in the Team tab. This view is read only.</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: hex.background, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text variant="pill" muted style={{ fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
      <Text variant="body" style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function useLeagueStyles() {
  const { hex } = useThemeTokens();
  return useMemo(() => StyleSheet.create({

  standingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    backgroundColor: hex.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lineupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lineupRowLg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  awardCard: {
    width: '48%',
    borderRadius: 22,
    backgroundColor: hex.surfaceElevated,
    padding: 16,
  },
  filterChip: {
    flexShrink: 0,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  feedSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: hex.background,
  },
  feedInput: {
    height: 44,
    flex: 1,
    borderRadius: 9999,
    backgroundColor: hex.muted,
    paddingHorizontal: 16,
    fontSize: 14,
    color: hex.foreground,
  },
  feedPostBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.primary,
    paddingHorizontal: 16,
  },
  pollOption: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hex.border,
    backgroundColor: hex.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hex.border,
    backgroundColor: hex.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: hex.foreground,
  },

  }), [hex]);
}
