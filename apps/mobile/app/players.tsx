import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import {
  Activity,
  ChevronLeft,
  Flame,
  Heart,
  HeartPulse,
  Laugh,
  type LucideIcon,
  MessageCircle,
  MoreHorizontal,
  Newspaper,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { SearchInput } from '@/components/ui/Input';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { useLeague } from '@/lib/league-context';
import { playerAvatar } from '@/lib/avatars';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';

/* ------------------------------ TYPES + DATA ------------------------------ */
type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
type Health = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';

interface Player {
  id: string;
  name: string;
  pos: Pos;
  team: string;
  opp: string;
  bye: number;
  rank: number;
  proj: number;
  trend: number;
  ownership: number;
  health?: Health;
  mine?: boolean;
  watch?: boolean;
  avail?: number;
  added?: number;
  dropped?: number;
}

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Christian McCaffrey', pos: 'RB', team: 'SF', opp: 'vs SEA', bye: 9, rank: 4, proj: 19.8, trend: -1.4, ownership: 99, health: 'questionable', mine: true, watch: true },
  { id: 'p2', name: 'Tyreek Hill', pos: 'WR', team: 'MIA', opp: '@ NYJ', bye: 6, rank: 6, proj: 18.4, trend: 1.8, ownership: 99 },
  { id: 'p3', name: 'CeeDee Lamb', pos: 'WR', team: 'DAL', opp: 'vs PHI', bye: 7, rank: 5, proj: 19.1, trend: 0.4, ownership: 99, mine: true },
  { id: 'p4', name: 'Bijan Robinson', pos: 'RB', team: 'ATL', opp: '@ TB', bye: 12, rank: 2, proj: 21.6, trend: 2.1, ownership: 97, health: 'healthy', mine: true },
  { id: 'p5', name: 'Tyjae Spears', pos: 'RB', team: 'TEN', opp: 'vs JAX', bye: 5, rank: 38, proj: 12.4, trend: 5.4, ownership: 42, avail: 58, added: 34 },
  { id: 'p6', name: 'Rashee Rice', pos: 'WR', team: 'KC', opp: '@ BUF', bye: 6, rank: 14, proj: 15.2, trend: 4.0, ownership: 88, added: 12 },
  { id: 'p7', name: 'Jordan Addison', pos: 'WR', team: 'MIN', opp: 'vs GB', bye: 6, rank: 22, proj: 13.7, trend: 1.2, ownership: 76 },
  { id: 'p8', name: 'Sam LaPorta', pos: 'TE', team: 'DET', opp: 'vs CHI', bye: 5, rank: 3, proj: 12.9, trend: 0.9, ownership: 95, mine: true },
  { id: 'p9', name: 'Trey McBride', pos: 'TE', team: 'ARI', opp: '@ LAR', bye: 11, rank: 5, proj: 11.4, trend: 2.4, ownership: 81, watch: true },
  { id: 'p10', name: 'Jordan Mason', pos: 'RB', team: 'SF', opp: 'vs SEA', bye: 9, rank: 41, proj: 10.8, trend: 6.1, ownership: 38, avail: 62, added: 41 },
  { id: 'p11', name: 'Tank Dell', pos: 'WR', team: 'HOU', opp: 'vs IND', bye: 14, rank: 48, proj: 9.6, trend: -3.2, ownership: 71, dropped: 18, health: 'out' },
  { id: 'p12', name: 'Najee Harris', pos: 'RB', team: 'PIT', opp: '@ CIN', bye: 9, rank: 28, proj: 11.2, trend: -2.4, ownership: 84, dropped: 9 },
  { id: 'p13', name: 'Brock Bowers', pos: 'TE', team: 'LV', opp: 'vs DEN', bye: 10, rank: 4, proj: 12.1, trend: 3.7, ownership: 92, added: 6 },
  { id: 'p14', name: 'Patrick Mahomes', pos: 'QB', team: 'KC', opp: '@ BUF', bye: 6, rank: 3, proj: 22.6, trend: 0.8, ownership: 99 },
  { id: 'p15', name: 'Justin Tucker', pos: 'K', team: 'BAL', opp: 'vs CLE', bye: 14, rank: 6, proj: 8.2, trend: -1.1, ownership: 88 },
];

interface DoctorAlert { playerId: string; status: string; detail: string; prob: number }
const ALERTS: DoctorAlert[] = [
  { playerId: 'p1', status: 'Trending up', detail: 'Full practice Thursday — expected to play with monitored workload.', prob: 78 },
  { playerId: 'p11', status: 'Likely inactive', detail: 'Did not practice all week. Backup expected to lead the room.', prob: 12 },
  { playerId: 'p10', status: 'Snap count rising', detail: 'Workload trending toward 1A back if CMC is limited.', prob: 96 },
];

interface NewsItem { id: string; playerId: string; headline: string; source: string; when: string; tag: 'injury' | 'role' | 'depth' | 'coach' | 'trade' }
const NEWS: NewsItem[] = [
  { id: 'n1', playerId: 'p1', headline: 'McCaffrey listed as questionable, expected to play limited snaps', source: 'Adam Schefter', when: '2h', tag: 'injury' },
  { id: 'n2', playerId: 'p5', headline: 'Spears taking over passing-down work in Tennessee', source: 'PFF', when: '5h', tag: 'role' },
  { id: 'n3', playerId: 'p13', headline: 'Bowers leads all TEs in routes run last week', source: 'NextGen Stats', when: '1d', tag: 'role' },
  { id: 'n4', playerId: 'p11', headline: 'Dell hits IR with foot injury', source: 'Ian Rapoport', when: '1d', tag: 'injury' },
  { id: 'n5', playerId: 'p12', headline: 'Steelers shift to RBBC, Harris snaps trending down', source: 'Beat Reporter', when: '2d', tag: 'depth' },
];

interface Post { id: string; user: string; when: string; body: string; reactions: { likes: number; cheers: number; laughs: number }; comments: number; pinned?: boolean }
const POSTS_BY_PLAYER: Record<string, Post[]> = {
  p1: [
    { id: 'c0', user: 'Mod', when: 'pinned', body: 'Use this thread for all CMC week 10 questions. Be kind, no leaks.', reactions: { likes: 12, cheers: 0, laughs: 0 }, comments: 0, pinned: true },
    { id: 'c1', user: 'fadethechalk', when: '1h', body: 'Full practice Thursday is the green light I needed. Starting with confidence.', reactions: { likes: 24, cheers: 6, laughs: 0 }, comments: 8 },
    { id: 'c2', user: 'ballerbets', when: '3h', body: 'Mason is the cleanest handcuff in football right now. If you have CMC, you should have him.', reactions: { likes: 41, cheers: 12, laughs: 1 }, comments: 14 },
    { id: 'c3', user: 'ppr_lord', when: '5h', body: 'Calling it now: 14 carries, 5 catches, 1 TD. Vintage CMC week.', reactions: { likes: 6, cheers: 1, laughs: 3 }, comments: 2 },
  ],
};
const DEFAULT_POSTS: Post[] = [
  { id: 'd1', user: 'ridethewave', when: '2h', body: 'Quietly the best buy-low candidate in the league right now. Schedule opens up after the bye.', reactions: { likes: 11, cheers: 2, laughs: 0 }, comments: 3 },
  { id: 'd2', user: 'fantasydoc', when: '1d', body: 'Snap share trending up four straight weeks. Role is real.', reactions: { likes: 7, cheers: 0, laughs: 0 }, comments: 1 },
];

const GAME_LOG = [
  { wk: 1, opp: 'vs NYJ', pts: 18.4, tch: 22, tgt: 4, yds: 112 },
  { wk: 2, opp: '@ MIN', pts: 12.1, tch: 18, tgt: 2, yds: 78 },
  { wk: 3, opp: 'vs LAR', pts: 24.6, tch: 24, tgt: 6, yds: 154 },
  { wk: 4, opp: '@ ARI', pts: 16.2, tch: 20, tgt: 3, yds: 96 },
  { wk: 5, opp: 'vs SEA', pts: 29.1, tch: 26, tgt: 7, yds: 188 },
  { wk: 6, opp: '@ KC', pts: 14.8, tch: 16, tgt: 5, yds: 84 },
  { wk: 7, opp: 'vs DAL', pts: 21.3, tch: 21, tgt: 4, yds: 132 },
];

const FILTERS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;

/* ------------------------------ PAGE ------------------------------ */
type DetailView = { kind: 'home' } | { kind: 'player'; id: string };

export default function PlayersPage() {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const { active } = useLeague();
  const [view, setView] = useState<DetailView>({ kind: 'home' });
  const [watchIds, setWatchIds] = useState<Set<string>>(() => new Set(PLAYERS.filter((p) => p.watch).map((p) => p.id)));

  const toggleWatch = (id: string) =>
    setWatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!active) return null;

  if (view.kind === 'player') {
    const p = PLAYERS.find((x) => x.id === view.id)!;
    return (
      <Screen>
        <PlayerDetail
          player={p}
          isSynced={active.type === 'synced'}
          platform={active.platform}
          onBack={() => setView({ kind: 'home' })}
          onOpenPlayer={(id) => setView({ kind: 'player', id })}
          watched={watchIds.has(p.id)}
          onToggleWatch={() => toggleWatch(p.id)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PlayersHome isSynced={active.type === 'synced'} platform={active.platform} onOpenPlayer={(id) => setView({ kind: 'player', id })} watchIds={watchIds} toggleWatch={toggleWatch} />
    </Screen>
  );
}

/* ------------------------------ HOME ------------------------------ */
type HomeTab = 'all' | 'available' | 'injured' | 'watchlist';

function PlayersHome({
  isSynced,
  platform,
  onOpenPlayer,
  watchIds,
  toggleWatch,
}: {
  isSynced: boolean;
  platform?: string;
  onOpenPlayer: (id: string) => void;
  watchIds: Set<string>;
  toggleWatch: (id: string) => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<(typeof FILTERS)[number]>('All');
  const [tab, setTab] = useState<HomeTab>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const searching = q.trim().length > 0;

  const matchesPos = (p: Player) => pos === 'All' || p.pos === pos;
  const matchesQ = (p: Player) => !q || p.name.toLowerCase().includes(q.toLowerCase());
  const isInjured = (p: Player) => p.health === 'questionable' || p.health === 'doubtful' || p.health === 'out' || p.health === 'ir';
  const isAvailable = (p: Player) => (p.avail ?? 100 - p.ownership) >= 20;

  const searchResults = useMemo(() => PLAYERS.filter((p) => matchesPos(p) && matchesQ(p)), [q, pos]);
  const tabPlayers = useMemo(() => {
    const base = PLAYERS.filter(matchesPos);
    if (tab === 'all') return base;
    if (tab === 'available') return base.filter(isAvailable);
    if (tab === 'injured') return base.filter(isInjured);
    return base.filter((p) => watchIds.has(p.id));
  }, [tab, pos, watchIds]);
  const trending = useMemo(() => [...tabPlayers].sort((a, b) => b.trend - a.trend), [tabPlayers]);

  const waivers = PLAYERS.filter((p) => (p.avail ?? 0) > 0).sort((a, b) => (b.avail ?? 0) - (a.avail ?? 0));
  const mostAdded = PLAYERS.filter((p) => (p.added ?? 0) > 0).sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
  const mostDropped = PLAYERS.filter((p) => (p.dropped ?? 0) > 0).sort((a, b) => (b.dropped ?? 0) - (a.dropped ?? 0));

  const tabCopy: Record<HomeTab, { title: string; empty: string }> = {
    all: { title: 'Trending players', empty: 'No players match this filter.' },
    available: { title: 'Trending available', empty: 'No available players match this filter.' },
    injured: { title: 'Trending injured', empty: 'No injured players right now.' },
    watchlist: { title: 'Trending watchlist', empty: 'Tap the star on any player to add them here.' },
  };

  return (
    <View style={layout.screen}>
      <View style={layout.intro}>
        <Text variant="hero">Player Search</Text>
        <Text variant="subtitle" style={{ marginTop: 8 }}>Trending, injuries, and waiver targets across the league.</Text>
      </View>

      <View>
        <View style={[layout.row, { gap: 8 }]}>
          <View style={layout.searchBar}>
            <Search size={16} color={c.mutedForeground} />
            <SearchInput value={q} onChangeText={setQ} placeholder="Search players" />
            {q ? (
              <Pressable onPress={() => setQ('')}>
                <X size={16} color={c.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setFilterOpen((s) => !s)}
            style={[
              layout.iconButton,
              (pos !== 'All' || filterOpen) && { backgroundColor: hex.foreground },
            ]}
          >
            <SlidersHorizontal size={16} color={pos !== 'All' || filterOpen ? hex.background : c.foreground} />
            {pos !== 'All' ? (
              <View style={surfaces.badge}>
                <Text variant="pill" style={{ color: hex.background, fontSize: 9, fontWeight: '600' }}>{pos}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {filterOpen ? (
          <View style={[surfaces.roundedCard, { marginTop: 8, padding: 12 }]}>
            <Text variant="eyebrow" style={{ paddingHorizontal: 4, paddingBottom: 8 }}>Position</Text>
            <View style={[layout.rowWrap, { gap: 6 }]}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => { setPos(f); setFilterOpen(false); }}
                  style={[surfaces.pill, { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: f === pos ? hex.foreground : hex.background }]}
                >
                  <Text variant="caption" style={{ color: f === pos ? hex.background : hex.mutedForeground }}>{f}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All' },
          { key: 'available', label: 'Available' },
          { key: 'injured', label: 'Injured' },
          { key: 'watchlist', label: 'Watchlist' },
        ]}
      />

      {searching ? (
        <Section title="Search results">
          <PlayerList players={searchResults} onOpen={onOpenPlayer} watchIds={watchIds} toggleWatch={toggleWatch} />
        </Section>
      ) : (
        <>
          <Section title={tabCopy[tab].title}>
            {trending.length === 0 ? (
              <EmptyState icon={tab === 'watchlist' ? Star : tab === 'injured' ? HeartPulse : Flame} title={tabCopy[tab].empty} body={pos !== 'All' ? `Try clearing the ${pos} filter.` : 'Check back later.'} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {trending.map((p) => (
                  <Pressable key={p.id} onPress={() => onOpenPlayer(p.id)} style={[surfaces.roundedCard, { width: 170, padding: 16 }]}>
                    <View style={layout.rowBetween}>
                      <HeadshotBubble player={p} />
                      <HealthDot health={p.health} />
                    </View>
                    <Text variant="bodySm" style={{ marginTop: 12 }} numberOfLines={1}>{p.name}</Text>
                    <Text variant="caption" muted>{p.pos} · {p.team} · #{p.rank}</Text>
                    <View style={[layout.rowEnd, { marginTop: 8 }]}>
                      <Text variant="titleLg" style={{ fontVariant: ['tabular-nums'] }}>{p.proj.toFixed(1)}</Text>
                      <TrendPill trend={p.trend} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Section>

          {tab === 'available' ? (
            <>
              <Section title="Top waiver targets">
                <View style={{ gap: 8 }}>
                  {waivers.filter(matchesPos).map((p) => (
                    <View key={p.id} style={[surfaces.roundedCard, { padding: 16 }]}>
                      <Pressable onPress={() => onOpenPlayer(p.id)} style={[layout.row, { gap: 12 }]}>
                        <HeadshotBubble player={p} />
                        <View style={[layout.flex1, { minWidth: 0 }]}>
                          <Text variant="body" numberOfLines={1}>{p.name}</Text>
                          <Text variant="bodyMuted">{p.pos} · {p.team} · {p.avail}% available</Text>
                        </View>
                        <View style={layout.alignEnd}>
                          <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{p.proj.toFixed(1)}</Text>
                          <TrendPill trend={p.trend} small />
                        </View>
                      </Pressable>
                      <Text variant="bodyMuted" style={{ marginTop: 8, lineHeight: 18 }}>Opportunity score 87 · projected role expanding through bye.</Text>
                      <View style={{ marginTop: 12 }}>
                        <PrimaryButton>{isSynced ? `Open waivers in ${platform}` : 'Add to waivers'}</PrimaryButton>
                      </View>
                    </View>
                  ))}
                </View>
              </Section>

              <Section title="Most added">
                <CompactList players={mostAdded.filter(matchesPos)} metric={(p) => `+${p.added}%`} onOpen={onOpenPlayer} />
              </Section>
              <Section title="Most dropped">
                <CompactList players={mostDropped.filter(matchesPos)} metric={(p) => `-${p.dropped}%`} metricNegative onOpen={onOpenPlayer} />
              </Section>
            </>
          ) : null}

          {tab === 'injured' ? (
            <>
              <Section title="Fantasy doctor alerts">
                <View style={{ gap: 8 }}>
                  {ALERTS.map((a) => {
                    const p = PLAYERS.find((x) => x.id === a.playerId);
                    if (!p || !matchesPos(p)) return null;
                    return (
                      <Pressable key={a.playerId} onPress={() => onOpenPlayer(p.id)} style={[surfaces.roundedCard, { padding: 16 }]}>
                        <View style={[layout.row, { gap: 12 }]}>
                          <HeadshotBubble player={p} />
                          <View style={[layout.flex1, { minWidth: 0 }]}>
                            <View style={[layout.row, { gap: 4 }]}>
                              <HeartPulse size={12} color={c.mutedForeground} />
                              <Text variant="eyebrow">Fantasy doctor</Text>
                            </View>
                            <Text variant="body" numberOfLines={1}>{p.name}</Text>
                          </View>
                          <View style={layout.alignEnd}>
                            <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>{a.prob}%</Text>
                            <Text variant="eyebrow">to play</Text>
                          </View>
                        </View>
                        <Text variant="bodyMuted" style={{ marginTop: 8, lineHeight: 18 }}>
                          <Text variant="bodySm" style={{ fontWeight: '500' }}>{a.status}.</Text> {a.detail}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>

              <Section title="Injury news">
                <View style={surfaces.roundedCard}>
                  {NEWS.filter((n) => n.tag === 'injury').map((n, i) => {
                    const p = PLAYERS.find((x) => x.id === n.playerId);
                    return (
                      <Pressable key={n.id} onPress={() => p && onOpenPlayer(p.id)}>
                        <View style={[layout.rowStart, { paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
                          <View style={[surfaces.iconBoxSm, { marginTop: 2, borderRadius: 9999, backgroundColor: hex.background }]}>
                            <Newspaper size={14} color={c.mutedForeground} />
                          </View>
                          <View style={[layout.flex1, { minWidth: 0 }]}>
                            <Text variant="bodySm" style={{ lineHeight: 20 }} numberOfLines={2}>{n.headline}</Text>
                            <Text variant="caption" muted style={{ marginTop: 2 }}>{p?.name} · {n.source} · {n.when}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>
            </>
          ) : null}

          {tab === 'all' ? (
            <Section title="All players">
              <PlayerList players={tabPlayers} onOpen={onOpenPlayer} watchIds={watchIds} toggleWatch={toggleWatch} />
            </Section>
          ) : null}

          {tab === 'watchlist' && trending.length > 0 ? (
            <Section title="Watchlist roster">
              <PlayerList players={tabPlayers} onOpen={onOpenPlayer} watchIds={watchIds} toggleWatch={toggleWatch} />
            </Section>
          ) : null}
        </>
      )}
    </View>
  );
}

/* ------------------------------ PLAYER DETAIL ------------------------------ */
type Tab = 'overview' | 'performance' | 'health' | 'community';

function PlayerDetail({
  player: p,
  isSynced,
  platform,
  onBack,
  onOpenPlayer,
  watched,
  onToggleWatch,
}: {
  player: Player;
  isSynced: boolean;
  platform?: string;
  onBack: () => void;
  onOpenPlayer: (id: string) => void;
  watched: boolean;
  onToggleWatch: () => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<Tab>('overview');
  const related = PLAYERS.filter((x) => x.id !== p.id && (x.team === p.team || x.pos === p.pos)).slice(0, 6);

  return (
    <View style={[layout.screen, { gap: 20, paddingTop: 0 }]}>
      <View style={[layout.rowBetween, { paddingHorizontal: 4, paddingTop: 8 }]}>
        <Pressable onPress={onBack} style={[layout.row, { gap: 4, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 6 }]}>
          <ChevronLeft size={16} color={c.mutedForeground} />
          <Text variant="link" muted>Players</Text>
        </Pressable>
        <View style={[layout.row, { gap: 4 }]}>
          <Pressable onPress={onToggleWatch} style={[layout.iconButtonSm, { backgroundColor: hex.surfaceElevated, borderWidth: 0 }]}>
            <Star size={16} color={watched ? c.foreground : c.mutedForeground} fill={watched ? c.foreground : 'none'} />
          </Pressable>
          <Pressable style={[layout.iconButtonSm, { backgroundColor: hex.surfaceElevated, borderWidth: 0 }]}>
            <Share2 size={16} color={c.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <View style={[surfaces.roundedCardLg, { borderWidth: 0, padding: 20 }]}>
        <View style={[layout.row, { gap: 16 }]}>
          <HeadshotBubble player={p} large />
          <View style={[layout.flex1, { minWidth: 0 }]}>
            <Text variant="eyebrow">{p.pos} · {p.team} · Bye {p.bye}</Text>
            <Text variant="sectionTitle" style={{ fontSize: 22 }} numberOfLines={1}>{p.name}</Text>
            <View style={[layout.row, { marginTop: 4, gap: 8 }]}>
              <HealthBadge health={p.health} />
              <Text variant="bodyMuted">Rank #{p.rank}</Text>
            </View>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="scoreLG" style={{ fontSize: 26, fontVariant: ['tabular-nums'] }}>{p.proj.toFixed(1)}</Text>
            <Text variant="eyebrow">proj</Text>
            <View style={{ marginTop: 4 }}><TrendPill trend={p.trend} small /></View>
          </View>
        </View>

        <View style={[surfaces.roundedCard, { marginTop: 16, borderRadius: 18, padding: 12, backgroundColor: hex.background }]}>
          <View style={[layout.row, { gap: 6 }]}>
            <Sparkles size={12} color={c.mutedForeground} />
            <Text variant="eyebrow">AI summary</Text>
          </View>
          <Text variant="bodyMuted" style={{ marginTop: 4, fontSize: 13, lineHeight: 18 }}>{aiSummary(p)}</Text>
        </View>

        <View style={[layout.row, { marginTop: 16, gap: 8 }]}>
          <PrimaryButton>{isSynced ? `Open in ${platform}` : 'Add to waivers'}</PrimaryButton>
          <SecondaryButton onPress={onToggleWatch}>{watched ? 'Watching' : 'Watch'}</SecondaryButton>
        </View>
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'performance', label: 'Performance' },
          { key: 'health', label: 'Health' },
          { key: 'community', label: 'Community' },
        ]}
      />

      {tab === 'overview' ? <OverviewTab player={p} /> : null}
      {tab === 'performance' ? <PerformanceTab /> : null}
      {tab === 'health' ? <HealthTab player={p} /> : null}
      {tab === 'community' ? <CommunityTab player={p} /> : null}

      <Section title="Related players">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {related.map((r) => (
            <Pressable key={r.id} onPress={() => onOpenPlayer(r.id)} style={[surfaces.roundedCard, { width: 150, padding: 12 }]}>
              <HeadshotBubble player={r} />
              <Text variant="bodySm" style={{ marginTop: 8 }} numberOfLines={1}>{r.name}</Text>
              <Text variant="caption" muted>{r.pos} · {r.team}</Text>
              <View style={[layout.rowBetween, { marginTop: 4 }]}>
                <Text variant="caption" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>{r.proj.toFixed(1)}</Text>
                <TrendPill trend={r.trend} small />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Section>
    </View>
  );
}

/* ------------------------------ TABS ------------------------------ */
function OverviewTab({ player: p }: { player: Player }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const startSit = p.proj >= 14 ? 'Start' : p.proj >= 10 ? 'Flex' : 'Sit';
  const toneKey = startSit === 'Start' ? 'success' : startSit === 'Sit' ? 'danger' : 'neutral';
  return (
    <>
      <Section title="Matchup">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <View style={layout.rowBetween}>
            <View>
              <Text variant="eyebrow">Week 10</Text>
              <Text variant="titleMd">{p.team} {p.opp}</Text>
              <Text variant="bodyMuted" style={{ marginTop: 2 }}>Strength of schedule · Favorable</Text>
            </View>
            <View style={layout.alignEnd}>
              <Text variant="scoreLG" style={{ fontSize: 22, fontVariant: ['tabular-nums'] }}>{p.proj.toFixed(1)}</Text>
              <Text variant="eyebrow">proj pts</Text>
            </View>
          </View>
          <View style={[layout.row, { marginTop: 12, gap: 8 }]}>
            <View style={[surfaces.pill, { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: toneBg[toneKey] }]}>
              <Text variant="caption" style={{ color: toneFg[toneKey] }}>{startSit}</Text>
            </View>
            <Text variant="bodyMuted">Recommendation</Text>
          </View>
        </View>
      </Section>

      <Section title="Usage">
        <View style={[layout.rowWrap, { gap: 8 }]}>
          <StatBlock label="Snap %" value="78%" />
          <StatBlock label="Target share" value="24%" />
          <StatBlock label="Red zone" value="6 touches" />
          <StatBlock label="Role" value="Workhorse" />
        </View>
      </Section>

      <Section title="Fantasy outlook">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <Text variant="bodySm" style={{ lineHeight: 20 }}>
            High-floor producer with consistent volume regardless of game script. Schedule turns favorable through the playoff stretch — hold and start with confidence in most weeks.
          </Text>
        </View>
      </Section>
    </>
  );
}

function PerformanceTab() {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const avg = GAME_LOG.reduce((s, g) => s + g.pts, 0) / GAME_LOG.length;
  const n = GAME_LOG.length;
  const sumX = GAME_LOG.reduce((s, g) => s + g.wk, 0);
  const sumY = GAME_LOG.reduce((s, g) => s + g.pts, 0);
  const sumXY = GAME_LOG.reduce((s, g) => s + g.wk * g.pts, 0);
  const sumXX = GAME_LOG.reduce((s, g) => s + g.wk * g.wk, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const W = 320, H = 160, padL = 28, padR = 12, padT = 12, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xs = GAME_LOG.map((g) => g.wk);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const yMax = Math.ceil(Math.max(...GAME_LOG.map((g) => g.pts), avg) / 5) * 5;
  const xFor = (wk: number) => padL + ((wk - minX) / Math.max(1, maxX - minX)) * innerW;
  const yFor = (pts: number) => padT + innerH - (pts / yMax) * innerH;
  const trendDir = slope >= 0 ? 'up' : 'down';
  const yTicks = [0, yMax / 2, yMax];

  return (
    <>
      <Section title="Weekly trend">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <View style={[layout.rowBetween, { marginBottom: 12 }]}>
            <View>
              <Text variant="eyebrow">Points per week</Text>
              <Text variant="bodySm" style={{ marginTop: 2 }}>
                Trend <Text variant="bodySm" style={{ color: trendDir === 'up' ? hex.success : hex.danger }}>{trendDir === 'up' ? '▲' : '▼'} {Math.abs(slope).toFixed(2)} pts/wk</Text>
              </Text>
            </View>
            <View style={layout.alignEnd}>
              <Text variant="titleLg" style={{ fontVariant: ['tabular-nums'] }}>{avg.toFixed(1)}</Text>
              <Text variant="eyebrow" style={{ fontSize: 10 }}>season avg</Text>
            </View>
          </View>
          <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={176}>
            {yTicks.map((t) => (
              <SvgLine key={t} x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke={c.foreground} strokeOpacity={0.08} />
            ))}
            <SvgLine x1={padL} x2={W - padR} y1={yFor(avg)} y2={yFor(avg)} stroke={c.foreground} strokeOpacity={0.25} strokeDasharray="3 3" />
            {GAME_LOG.slice(1).map((g, i) => {
              const prev = GAME_LOG[i];
              const up = g.pts >= prev.pts;
              return <SvgLine key={`seg-${g.wk}`} x1={xFor(prev.wk)} y1={yFor(prev.pts)} x2={xFor(g.wk)} y2={yFor(g.pts)} stroke={up ? c.success : c.destructive} strokeWidth={2} strokeLinecap="round" />;
            })}
            {GAME_LOG.map((g, i) => {
              const prev = i > 0 ? GAME_LOG[i - 1] : null;
              const fill = prev == null ? c.foreground : g.pts >= prev.pts ? c.success : c.destructive;
              return <Circle key={g.wk} cx={xFor(g.wk)} cy={yFor(g.pts)} r={4.5} fill={fill} />;
            })}
            {GAME_LOG.map((g) => (
              <SvgText key={`l-${g.wk}`} x={xFor(g.wk)} y={H - 6} textAnchor="middle" fill={c.mutedForeground} fontSize={9}>W{g.wk}</SvgText>
            ))}
          </Svg>
          <View style={[layout.row, { marginTop: 8, gap: 16 }]}>
            <View style={[layout.row, { gap: 6 }]}>
              <View style={{ height: 2, width: 16, backgroundColor: hex.success }} />
              <Text variant="caption" muted>Progression</Text>
            </View>
            <View style={[layout.row, { gap: 6 }]}>
              <View style={{ height: 2, width: 16, backgroundColor: hex.danger }} />
              <Text variant="caption" muted>Regression</Text>
            </View>
          </View>
        </View>
      </Section>

      <Section title="Game log">
        <View style={surfaces.roundedCard}>
          <View style={[layout.row, { paddingHorizontal: 16, paddingTop: 12 }]}>
            <Text variant="eyebrow" style={{ width: 36, fontSize: 10 }}>Wk</Text>
            <Text variant="eyebrow" style={{ width: 56, fontSize: 10 }}>Opp</Text>
            <Text variant="eyebrow" style={[layout.flex1, { fontSize: 10 }]} />
            <Text variant="eyebrow" style={{ width: 40, textAlign: 'right', fontSize: 10 }}>Tch</Text>
            <Text variant="eyebrow" style={{ width: 40, textAlign: 'right', fontSize: 10 }}>Tgt</Text>
            <Text variant="eyebrow" style={{ width: 48, textAlign: 'right', fontSize: 10 }}>Pts</Text>
          </View>
          <View style={{ marginTop: 4 }}>
            {GAME_LOG.map((g, i) => (
              <View key={g.wk} style={[layout.row, { paddingHorizontal: 16, paddingVertical: 10 }, i > 0 && layout.listRowBorder]}>
                <Text variant="bodyMuted" style={{ width: 36, fontVariant: ['tabular-nums'] }}>{g.wk}</Text>
                <Text variant="bodyMuted" style={{ width: 56, fontVariant: ['tabular-nums'] }}>{g.opp}</Text>
                <Text variant="bodyMuted" style={layout.flex1}>{g.yds} yds</Text>
                <Text variant="bodyMuted" style={{ width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{g.tch}</Text>
                <Text variant="bodyMuted" style={{ width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{g.tgt}</Text>
                <Text variant="bodySm" style={{ width: 48, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{g.pts.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>
    </>
  );
}

function HealthTab({ player: p }: { player: Player }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const isInjured = p.health && p.health !== 'healthy';
  return (
    <>
      <Section title="Fantasy doctor">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <View style={layout.rowBetween}>
            <HealthBadge health={p.health} large />
            <View style={layout.alignEnd}>
              <Text variant="scoreLG" style={{ fontSize: 24, fontVariant: ['tabular-nums'] }}>{isInjured ? '72%' : '97%'}</Text>
              <Text variant="eyebrow">to play</Text>
            </View>
          </View>
          <View style={[layout.rowWrap, { marginTop: 12, gap: 8 }]}>
            <StatBlock label="Body part" value={isInjured ? 'Calf' : '—'} />
            <StatBlock label="Severity" value={isInjured ? 'Mild' : 'None'} />
            <StatBlock label="Practice" value={isInjured ? 'Limited (Th)' : 'Full'} />
            <StatBlock label="Reinjury risk" value={isInjured ? 'Moderate' : 'Low'} />
          </View>
        </View>
      </Section>

      <Section title="AI summary">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <Text variant="bodySm" style={{ lineHeight: 20 }}>
            {isInjured
              ? `${p.name} is trending toward playing this week but may have a reduced workload. The backup remains a valuable insurance option for managers worried about a late scratch.`
              : `${p.name} is fully healthy with no practice limitations entering this week. Workload expected to remain at season norms.`}
          </Text>
        </View>
      </Section>

      <Section title="Recovery timeline">
        <View style={surfaces.roundedCard}>
          {[
            { t: 'Today', what: 'Limited practice — expected to play' },
            { t: 'Last week', what: 'Aggravated calf in 2nd quarter' },
            { t: 'Comparable', what: 'Similar injuries return in 1 week (74% of cases)' },
          ].map((row, i) => (
            <View key={i} style={[layout.rowStart, { paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
              <Text variant="eyebrow" style={{ width: 80, flexShrink: 0 }}>{row.t}</Text>
              <Text variant="bodyMuted" style={[layout.flex1, { fontSize: 13 }]}>{row.what}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Backup beneficiary">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <Text variant="bodyMuted" style={{ fontSize: 13 }}>
            <Text variant="bodySm">Jordan Mason</Text> projects to absorb 60% of touches if {p.name.split(' ')[1]} is limited. Strong handcuff value.
          </Text>
        </View>
      </Section>
    </>
  );
}

function CommunityTab({ player: p }: { player: Player }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const [sort, setSort] = useState<'trending' | 'newest' | 'helpful'>('trending');
  const [draft, setDraft] = useState('');
  const [extra, setExtra] = useState<Post[]>([]);

  const posts = useMemo(() => {
    const base = [...(POSTS_BY_PLAYER[p.id] ?? DEFAULT_POSTS), ...extra];
    return base.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (b.pinned && !a.pinned) return 1;
      if (sort === 'trending') return b.reactions.likes - a.reactions.likes;
      if (sort === 'helpful') return b.comments - a.comments;
      return 0;
    });
  }, [p.id, sort, extra]);

  const submit = () => {
    if (!draft.trim()) return;
    setExtra((prev) => [{ id: `me-${Date.now()}`, user: 'you', when: 'now', body: draft.trim(), reactions: { likes: 0, cheers: 0, laughs: 0 }, comments: 0 }, ...prev]);
    setDraft('');
  };

  return (
    <>
      <Section title="Community">
        <View style={{ gap: 8 }}>
          <View style={[surfaces.roundedCard, { padding: 12 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Share your take on ${p.name}…`}
              placeholderTextColor={c.mutedForeground}
              multiline
              style={[typeStyles.bodySm, { minHeight: 60, padding: 0, color: hex.foreground }]}
            />
            <View style={layout.rowBetween}>
              <Text variant="caption" muted>Public · visible to all Commissioner users</Text>
              <Pressable
                onPress={submit}
                disabled={!draft.trim()}
                style={[surfaces.pill, { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: hex.foreground, opacity: !draft.trim() ? 0.4 : 1 }]}
              >
                <Text variant="button" style={{ color: hex.background }}>Post</Text>
              </Pressable>
            </View>
          </View>

          <Segmented
            value={sort}
            onChange={setSort}
            tabs={[
              { key: 'trending', label: 'Trending' },
              { key: 'newest', label: 'Newest' },
              { key: 'helpful', label: 'Helpful' },
            ]}
          />

          {posts.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No posts yet" body="Be the first to share your take on this player." />
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </View>
      </Section>

      <Section title="Guidelines">
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <Text variant="bodyMuted" style={{ lineHeight: 18 }}>Be respectful. No spam, no leaks, no harassment. Report or mute users from any post menu.</Text>
        </View>
      </Section>
    </>
  );
}

function PostCard({ post }: { post: Post }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const c = useColors();
  return (
    <View style={[surfaces.roundedCard, { padding: 16 }, post.pinned && { borderWidth: StyleSheet.hairlineWidth, borderColor: `rgba(${ink},0.1)` }]}>
      <View style={layout.rowBetween}>
        <View style={[layout.row, { gap: 8 }]}>
          <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: toneBg.neutral }]}>
            <Text variant="pill" style={{ fontSize: 10 }}>{post.user[0]?.toUpperCase()}</Text>
          </View>
          <Text variant="eyebrow">{post.user}</Text>
          <Text variant="caption" muted>·</Text>
          <Text variant="eyebrow">{post.when}</Text>
          {post.pinned ? (
            <View style={[surfaces.pillMuted, { paddingHorizontal: 8, paddingVertical: 2 }]}>
              <Text variant="pill" muted>Pinned</Text>
            </View>
          ) : null}
        </View>
        <Pressable style={{ borderRadius: 9999, padding: 6 }}>
          <MoreHorizontal size={16} color={c.mutedForeground} />
        </Pressable>
      </View>
      <Text variant="bodySm" style={{ marginTop: 8, lineHeight: 20 }}>{post.body}</Text>
      <View style={[layout.row, { marginTop: 8, gap: 4 }]}>
        <ReactBtn icon={ThumbsUp} count={post.reactions.likes} />
        <ReactBtn icon={Heart} count={post.reactions.cheers} />
        <ReactBtn icon={Laugh} count={post.reactions.laughs} />
        <Pressable style={[layout.row, { marginLeft: 'auto', gap: 6, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }]}>
          <MessageCircle size={14} color={c.mutedForeground} />
          <Text variant="caption">{post.comments}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------ ATOMS ------------------------------ */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  return (
    <View style={layout.sectionBlock}>
      <Text variant="eyebrow" style={{ paddingHorizontal: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</Text>
      {children}
    </View>
  );
}

function HeadshotBubble({ player, large }: { player: Player; large?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const size = large ? 64 : 40;
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Image source={{ uri: playerAvatar(player.name + player.team) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `rgba(${ink},0.05)` }} />
      <View style={{ position: 'absolute', bottom: -4, right: -4, borderRadius: 9999, backgroundColor: hex.foreground, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text variant="pill" style={{ fontSize: 9, fontWeight: '600', letterSpacing: 1, color: hex.background }}>{player.pos}</Text>
      </View>
    </View>
  );
}

function HealthDot({ health }: { health?: Health }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const color = !health || health === 'healthy' ? hex.success : health === 'questionable' || health === 'doubtful' ? hex.warning : hex.danger;
  return <View style={{ height: 8, width: 8, borderRadius: 9999, backgroundColor: color }} />;
}

function HealthBadge({ health, large }: { health?: Health; large?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const label = !health || health === 'healthy' ? 'Healthy' : health === 'questionable' ? 'Questionable' : health === 'doubtful' ? 'Doubtful' : health === 'out' ? 'Out' : 'IR';
  const toneKey = !health || health === 'healthy' ? 'success' : health === 'questionable' ? 'warning' : 'danger';
  const iconColor = !health || health === 'healthy' ? c.success : health === 'questionable' ? c.warning : c.destructive;
  return (
    <View style={[layout.row, { gap: 4, alignSelf: 'flex-start', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: toneBg[toneKey] }]}>
      <HeartPulse size={12} color={iconColor} />
      <Text variant={large ? 'caption' : 'eyebrow'} style={{ color: toneFg[toneKey], textTransform: large ? 'none' : 'uppercase' }}>{label}</Text>
    </View>
  );
}

function TrendPill({ trend, small }: { trend: number; small?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const up = trend >= 0;
  return (
    <View style={[layout.row, { gap: 2 }]}>
      {up ? <TrendingUp size={12} color={c.success} /> : <TrendingDown size={12} color={c.destructive} />}
      <Text variant="caption" style={{ fontWeight: '600', fontVariant: ['tabular-nums'], color: up ? hex.success : hex.danger, fontSize: small ? 11 : 12 }}>
        {Math.abs(trend).toFixed(1)}
      </Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  return (
    <View style={{ width: '48%', borderRadius: 18, backgroundColor: hex.background, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text variant="eyebrow" style={{ fontSize: 10 }}>{label}</Text>
      <Text variant="bodySm" style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  return (
    <Pressable onPress={onPress} style={[layout.flex1, surfaces.pill, { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: hex.foreground }]}>
      <Text variant="button" style={{ color: hex.background }}>{children}</Text>
    </Pressable>
  );
}

function SecondaryButton({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  return (
    <Pressable onPress={onPress} style={[surfaces.pill, { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: hex.background }]}>
      <Text variant="button">{children}</Text>
    </Pressable>
  );
}

function PlayerList({ players, onOpen, watchIds, toggleWatch }: { players: Player[]; onOpen: (id: string) => void; watchIds: Set<string>; toggleWatch: (id: string) => void }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  if (players.length === 0) return <EmptyState icon={Search} title="No matches" body="Try a different filter or search term." />;
  return (
    <View style={surfaces.roundedCard}>
      {players.map((p, i) => (
        <View key={p.id} style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
          <Pressable onPress={() => onOpen(p.id)} style={[layout.flex1, layout.row, { gap: 12, minWidth: 0 }]}>
            <HeadshotBubble player={p} />
            <View style={[layout.flex1, { minWidth: 0 }]}>
              <Text variant="body" numberOfLines={1}>{p.name}</Text>
              <Text variant="bodyMuted" numberOfLines={1}>{p.team} {p.opp} · #{p.rank}</Text>
            </View>
            <View style={layout.alignEnd}>
              <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{p.proj.toFixed(1)}</Text>
              <TrendPill trend={p.trend} small />
            </View>
          </Pressable>
          <Pressable onPress={() => toggleWatch(p.id)} style={[layout.iconButtonSm, { width: 36, height: 36, borderWidth: 0, backgroundColor: 'transparent' }]}>
            <Star size={16} color={watchIds.has(p.id) ? c.foreground : c.mutedForeground} fill={watchIds.has(p.id) ? c.foreground : 'none'} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function CompactList({ players, metric, metricNegative, onOpen }: { players: Player[]; metric: (p: Player) => string; metricNegative?: boolean; onOpen: (id: string) => void }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  if (players.length === 0) return <EmptyState icon={Activity} title="Nothing yet" body="Check back later." />;
  return (
    <View style={surfaces.roundedCard}>
      {players.map((p, i) => (
        <Pressable key={p.id} onPress={() => onOpen(p.id)}>
          <View style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
            <HeadshotBubble player={p} />
            <View style={[layout.flex1, { minWidth: 0 }]}>
              <Text variant="bodySm" numberOfLines={1}>{p.name}</Text>
              <Text variant="bodyMuted">{p.pos} · {p.team}</Text>
            </View>
            <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'], color: metricNegative ? hex.danger : hex.success }}>{metric(p)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: ComponentType<{ size?: number; color?: string }>; title: string; body: string }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  return (
    <View style={surfaces.emptyState}>
      <Icon size={24} color={c.mutedForeground} />
      <Text variant="bodySm" style={{ marginTop: 12 }}>{title}</Text>
      <Text variant="bodyMuted" style={{ marginTop: 4 }}>{body}</Text>
    </View>
  );
}

function ReactBtn({ icon: Icon, count }: { icon: LucideIcon; count: number }) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  return (
    <Pressable style={[layout.row, { gap: 6, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }]}>
      <Icon size={14} color={c.mutedForeground} />
      {count > 0 ? <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{count}</Text> : null}
    </Pressable>
  );
}

function aiSummary(p: Player): string {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  if (p.health && p.health !== 'healthy') return `${p.name} is trending toward playing this week but may have a reduced workload. The backup remains a valuable insurance option.`;
  if (p.trend > 3) return `${p.name} is one of the hottest players in fantasy right now. Role and opportunity are both expanding heading into a favorable matchup.`;
  if (p.trend < -2) return `${p.name}'s usage has dipped over the last three weeks. Monitor practice reports and the depth chart before locking in lineups.`;
  return `${p.name} remains a steady fantasy producer with a stable role. Start with confidence in standard lineups this week.`;
}
