import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Image, ScrollView, TextInput, View } from 'react-native';
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
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { useLeague } from '@/lib/league-context';
import { playerAvatar } from '@/lib/avatars';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

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
    <View className="gap-6 px-4 pb-6 pt-1">
      <View className="px-1">
        <Text className="text-[34px] font-semibold leading-[36px] tracking-tighter2">Player Search</Text>
        <Text className="mt-2 text-[13px] text-muted-foreground">Trending, injuries, and waiver targets across the league.</Text>
      </View>

      <View>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-2xl bg-surface-elevated px-4 py-3">
            <Search size={16} color={c.mutedForeground} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search players" placeholderTextColor={c.mutedForeground} className="flex-1 text-[15px] tracking-tightish text-foreground" />
            {q ? (
              <Pressable onPress={() => setQ('')}>
                <X size={16} color={c.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => setFilterOpen((s) => !s)} className={cn('relative h-12 w-12 shrink-0 items-center justify-center rounded-2xl', pos !== 'All' || filterOpen ? 'bg-foreground' : 'bg-surface-elevated')}>
            <SlidersHorizontal size={16} color={pos !== 'All' || filterOpen ? c.background : c.foreground} />
            {pos !== 'All' ? (
              <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-success px-1">
                <Text className="text-[9px] font-semibold text-background">{pos}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {filterOpen ? (
          <View className="mt-2 overflow-hidden rounded-[20px] bg-surface-elevated p-3">
            <Text className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Position</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Pressable key={f} onPress={() => { setPos(f); setFilterOpen(false); }} className={cn('rounded-full px-3 py-1.5', f === pos ? 'bg-foreground' : 'bg-background')}>
                  <Text className={cn('text-[12px] font-semibold tracking-tightish', f === pos ? 'text-background' : 'text-muted-foreground')}>{f}</Text>
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
                  <Pressable key={p.id} onPress={() => onOpenPlayer(p.id)} className="w-[170px] rounded-[22px] bg-surface-elevated p-4">
                    <View className="flex-row items-center justify-between">
                      <HeadshotBubble player={p} />
                      <HealthDot health={p.health} />
                    </View>
                    <Text className="mt-3 text-[14px] font-semibold tracking-tightish" numberOfLines={1}>{p.name}</Text>
                    <Text className="text-[11px] text-muted-foreground">{p.pos} · {p.team} · #{p.rank}</Text>
                    <View className="mt-2 flex-row items-end justify-between">
                      <Text className="text-[18px] font-semibold tabular-nums">{p.proj.toFixed(1)}</Text>
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
                <View className="gap-2">
                  {waivers.filter(matchesPos).map((p) => (
                    <View key={p.id} className="rounded-[22px] bg-surface-elevated p-4">
                      <Pressable onPress={() => onOpenPlayer(p.id)} className="flex-row items-center gap-3">
                        <HeadshotBubble player={p} />
                        <View className="min-w-0 flex-1">
                          <Text className="text-[15px] font-semibold tracking-tightish" numberOfLines={1}>{p.name}</Text>
                          <Text className="text-[12px] text-muted-foreground">{p.pos} · {p.team} · {p.avail}% available</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[14px] font-semibold tabular-nums">{p.proj.toFixed(1)}</Text>
                          <TrendPill trend={p.trend} small />
                        </View>
                      </Pressable>
                      <Text className="mt-2 text-[12px] leading-snug text-muted-foreground">Opportunity score 87 · projected role expanding through bye.</Text>
                      <View className="mt-3">
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
                <View className="gap-2">
                  {ALERTS.map((a) => {
                    const p = PLAYERS.find((x) => x.id === a.playerId);
                    if (!p || !matchesPos(p)) return null;
                    return (
                      <Pressable key={a.playerId} onPress={() => onOpenPlayer(p.id)} className="rounded-[22px] bg-surface-elevated p-4">
                        <View className="flex-row items-center gap-3">
                          <HeadshotBubble player={p} />
                          <View className="min-w-0 flex-1">
                            <View className="flex-row items-center gap-1">
                              <HeartPulse size={12} color={c.mutedForeground} />
                              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fantasy doctor</Text>
                            </View>
                            <Text className="text-[15px] font-semibold tracking-tightish" numberOfLines={1}>{p.name}</Text>
                          </View>
                          <View className="items-end">
                            <Text className="text-[16px] font-semibold tabular-nums">{a.prob}%</Text>
                            <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">to play</Text>
                          </View>
                        </View>
                        <Text className="mt-2 text-[13px] leading-snug text-muted-foreground"><Text className="font-medium text-foreground">{a.status}.</Text> {a.detail}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>

              <Section title="Injury news">
                <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
                  {NEWS.filter((n) => n.tag === 'injury').map((n, i) => {
                    const p = PLAYERS.find((x) => x.id === n.playerId);
                    return (
                      <Pressable key={n.id} onPress={() => p && onOpenPlayer(p.id)}>
                        <View className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
                          <View className="mt-0.5 h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background">
                            <Newspaper size={14} color={c.mutedForeground} />
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-[14px] leading-snug tracking-tightish" numberOfLines={2}>{n.headline}</Text>
                            <Text className="mt-0.5 text-[11px] text-muted-foreground">{p?.name} · {n.source} · {n.when}</Text>
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
  const c = useColors();
  const [tab, setTab] = useState<Tab>('overview');
  const related = PLAYERS.filter((x) => x.id !== p.id && (x.team === p.team || x.pos === p.pos)).slice(0, 6);

  return (
    <View className="gap-5 px-4 pb-6">
      <View className="flex-row items-center justify-between px-1 pt-2">
        <Pressable onPress={onBack} className="flex-row items-center gap-1 rounded-full px-2 py-1.5">
          <ChevronLeft size={16} color={c.mutedForeground} />
          <Text className="text-[14px] text-muted-foreground">Players</Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={onToggleWatch} className="h-9 w-9 items-center justify-center rounded-full bg-surface-elevated">
            <Star size={16} color={watched ? c.foreground : c.mutedForeground} fill={watched ? c.foreground : 'none'} />
          </Pressable>
          <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-surface-elevated">
            <Share2 size={16} color={c.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <View className="rounded-[28px] bg-surface-elevated p-5">
        <View className="flex-row items-center gap-4">
          <HeadshotBubble player={p} large />
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{p.pos} · {p.team} · Bye {p.bye}</Text>
            <Text className="text-[22px] font-semibold tracking-tighter2" numberOfLines={1}>{p.name}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <HealthBadge health={p.health} />
              <Text className="text-[12px] text-muted-foreground">Rank #{p.rank}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[26px] font-semibold tabular-nums">{p.proj.toFixed(1)}</Text>
            <Text className="text-[11px] uppercase tracking-widest text-muted-foreground">proj</Text>
            <View className="mt-1"><TrendPill trend={p.trend} small /></View>
          </View>
        </View>

        <View className="mt-4 rounded-[18px] bg-background p-3">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={12} color={c.mutedForeground} />
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">AI summary</Text>
          </View>
          <Text className="mt-1 text-[13px] leading-snug tracking-tightish">{aiSummary(p)}</Text>
        </View>

        <View className="mt-4 flex-row gap-2">
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
            <Pressable key={r.id} onPress={() => onOpenPlayer(r.id)} className="w-[150px] rounded-[20px] bg-surface-elevated p-3">
              <HeadshotBubble player={r} />
              <Text className="mt-2 text-[13px] font-semibold tracking-tightish" numberOfLines={1}>{r.name}</Text>
              <Text className="text-[11px] text-muted-foreground">{r.pos} · {r.team}</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-[12px] font-semibold tabular-nums">{r.proj.toFixed(1)}</Text>
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
  const startSit = p.proj >= 14 ? 'Start' : p.proj >= 10 ? 'Flex' : 'Sit';
  const tone = startSit === 'Start' ? 'bg-success/15' : startSit === 'Sit' ? 'bg-destructive/15' : 'bg-foreground/10';
  const toneText = startSit === 'Start' ? 'text-success' : startSit === 'Sit' ? 'text-destructive' : 'text-foreground';
  return (
    <>
      <Section title="Matchup">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Week 10</Text>
              <Text className="text-[16px] font-semibold tracking-tightish">{p.team} {p.opp}</Text>
              <Text className="mt-0.5 text-[12px] text-muted-foreground">Strength of schedule · Favorable</Text>
            </View>
            <View className="items-end">
              <Text className="text-[22px] font-semibold tabular-nums">{p.proj.toFixed(1)}</Text>
              <Text className="text-[11px] uppercase tracking-widest text-muted-foreground">proj pts</Text>
            </View>
          </View>
          <View className="mt-3 flex-row items-center gap-2">
            <View className={cn('rounded-full px-3 py-1', tone)}>
              <Text className={cn('text-[12px] font-semibold tracking-tightish', toneText)}>{startSit}</Text>
            </View>
            <Text className="text-[12px] text-muted-foreground">Recommendation</Text>
          </View>
        </View>
      </Section>

      <Section title="Usage">
        <View className="flex-row flex-wrap gap-2">
          <StatBlock label="Snap %" value="78%" />
          <StatBlock label="Target share" value="24%" />
          <StatBlock label="Red zone" value="6 touches" />
          <StatBlock label="Role" value="Workhorse" />
        </View>
      </Section>

      <Section title="Fantasy outlook">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <Text className="text-[14px] leading-snug tracking-tightish">
            High-floor producer with consistent volume regardless of game script. Schedule turns favorable through the playoff stretch — hold and start with confidence in most weeks.
          </Text>
        </View>
      </Section>
    </>
  );
}

function PerformanceTab() {
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
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Points per week</Text>
              <Text className="mt-0.5 text-[13px] tracking-tightish">
                Trend <Text className={trendDir === 'up' ? 'text-success' : 'text-destructive'}>{trendDir === 'up' ? '▲' : '▼'} {Math.abs(slope).toFixed(2)} pts/wk</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[18px] font-semibold tabular-nums">{avg.toFixed(1)}</Text>
              <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">season avg</Text>
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
          <View className="mt-2 flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5"><View className="h-0.5 w-4 bg-success" /><Text className="text-[11px] text-muted-foreground">Progression</Text></View>
            <View className="flex-row items-center gap-1.5"><View className="h-0.5 w-4 bg-destructive" /><Text className="text-[11px] text-muted-foreground">Regression</Text></View>
          </View>
        </View>
      </Section>

      <Section title="Game log">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          <View className="flex-row px-4 pt-3">
            <Text className="w-9 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Wk</Text>
            <Text className="w-14 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Opp</Text>
            <Text className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" />
            <Text className="w-10 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tch</Text>
            <Text className="w-10 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tgt</Text>
            <Text className="w-12 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Pts</Text>
          </View>
          <View className="mt-1">
            {GAME_LOG.map((g, i) => (
              <View key={g.wk} className={cn('flex-row items-center px-4 py-2.5', i > 0 ? 'border-t border-hairline' : '')}>
                <Text className="w-9 text-[13px] tabular-nums text-muted-foreground">{g.wk}</Text>
                <Text className="w-14 text-[13px] tabular-nums text-muted-foreground">{g.opp}</Text>
                <Text className="flex-1 text-[12px] text-muted-foreground">{g.yds} yds</Text>
                <Text className="w-10 text-right text-[13px] tabular-nums">{g.tch}</Text>
                <Text className="w-10 text-right text-[13px] tabular-nums">{g.tgt}</Text>
                <Text className="w-12 text-right text-[13px] font-semibold tabular-nums">{g.pts.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>
    </>
  );
}

function HealthTab({ player: p }: { player: Player }) {
  const isInjured = p.health && p.health !== 'healthy';
  return (
    <>
      <Section title="Fantasy doctor">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <View className="flex-row items-center justify-between">
            <HealthBadge health={p.health} large />
            <View className="items-end">
              <Text className="text-[24px] font-semibold tabular-nums">{isInjured ? '72%' : '97%'}</Text>
              <Text className="text-[11px] uppercase tracking-widest text-muted-foreground">to play</Text>
            </View>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <StatBlock label="Body part" value={isInjured ? 'Calf' : '—'} />
            <StatBlock label="Severity" value={isInjured ? 'Mild' : 'None'} />
            <StatBlock label="Practice" value={isInjured ? 'Limited (Th)' : 'Full'} />
            <StatBlock label="Reinjury risk" value={isInjured ? 'Moderate' : 'Low'} />
          </View>
        </View>
      </Section>

      <Section title="AI summary">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <Text className="text-[14px] leading-snug tracking-tightish">
            {isInjured
              ? `${p.name} is trending toward playing this week but may have a reduced workload. The backup remains a valuable insurance option for managers worried about a late scratch.`
              : `${p.name} is fully healthy with no practice limitations entering this week. Workload expected to remain at season norms.`}
          </Text>
        </View>
      </Section>

      <Section title="Recovery timeline">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {[
            { t: 'Today', what: 'Limited practice — expected to play' },
            { t: 'Last week', what: 'Aggravated calf in 2nd quarter' },
            { t: 'Comparable', what: 'Similar injuries return in 1 week (74% of cases)' },
          ].map((row, i) => (
            <View key={i} className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <Text className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{row.t}</Text>
              <Text className="flex-1 text-[13px] tracking-tightish">{row.what}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Backup beneficiary">
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <Text className="text-[13px] tracking-tightish">
            <Text className="font-semibold">Jordan Mason</Text> projects to absorb 60% of touches if {p.name.split(' ')[1]} is limited. Strong handcuff value.
          </Text>
        </View>
      </Section>
    </>
  );
}

function CommunityTab({ player: p }: { player: Player }) {
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
        <View className="gap-2">
          <View className="rounded-[24px] bg-surface-elevated p-3">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Share your take on ${p.name}…`}
              placeholderTextColor={c.mutedForeground}
              multiline
              className="min-h-[60px] text-[14px] tracking-tightish text-foreground"
            />
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-muted-foreground">Public · visible to all Commissioner users</Text>
              <Pressable onPress={submit} disabled={!draft.trim()} className={cn('rounded-full bg-foreground px-4 py-1.5', !draft.trim() ? 'opacity-40' : '')}>
                <Text className="text-[12px] font-semibold text-background">Post</Text>
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
        <View className="rounded-[24px] bg-surface-elevated p-4">
          <Text className="text-[12px] leading-snug text-muted-foreground">Be respectful. No spam, no leaks, no harassment. Report or mute users from any post menu.</Text>
        </View>
      </Section>
    </>
  );
}

function PostCard({ post }: { post: Post }) {
  const c = useColors();
  return (
    <View className={cn('rounded-[22px] bg-surface-elevated p-4', post.pinned ? 'border border-foreground/10' : '')}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded-full bg-foreground/10">
            <Text className="text-[10px] text-foreground">{post.user[0]?.toUpperCase()}</Text>
          </View>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{post.user}</Text>
          <Text className="text-[11px] text-muted-foreground">·</Text>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{post.when}</Text>
          {post.pinned ? <View className="rounded-full bg-foreground/10 px-2 py-0.5"><Text className="text-[10px] text-muted-foreground">Pinned</Text></View> : null}
        </View>
        <Pressable className="rounded-full p-1.5">
          <MoreHorizontal size={16} color={c.mutedForeground} />
        </Pressable>
      </View>
      <Text className="mt-2 text-[14px] leading-snug tracking-tightish">{post.body}</Text>
      <View className="mt-2 flex-row items-center gap-1">
        <ReactBtn icon={ThumbsUp} count={post.reactions.likes} />
        <ReactBtn icon={Heart} count={post.reactions.cheers} />
        <ReactBtn icon={Laugh} count={post.reactions.laughs} />
        <Pressable className="ml-auto flex-row items-center gap-1.5 rounded-full px-3 py-1.5">
          <MessageCircle size={14} color={c.mutedForeground} />
          <Text className="text-[12px] font-medium text-muted-foreground">{post.comments}</Text>
        </Pressable>
      </View>
    </View>
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

function HeadshotBubble({ player, large }: { player: Player; large?: boolean }) {
  const size = large ? 64 : 40;
  return (
    <View style={{ width: size, height: size }} className="relative shrink-0">
      <Image source={{ uri: playerAvatar(player.name + player.team) }} style={{ width: size, height: size, borderRadius: size / 2 }} className="bg-foreground/5" />
      <View className="absolute -bottom-1 -right-1 rounded-full bg-foreground px-1.5 py-0.5">
        <Text className="text-[9px] font-semibold tracking-widest text-background">{player.pos}</Text>
      </View>
    </View>
  );
}

function HealthDot({ health }: { health?: Health }) {
  if (!health || health === 'healthy') return <View className="h-2 w-2 rounded-full bg-success" />;
  const color = health === 'questionable' ? 'bg-warning' : health === 'doubtful' ? 'bg-warning' : 'bg-destructive';
  return <View className={cn('h-2 w-2 rounded-full', color)} />;
}

function HealthBadge({ health, large }: { health?: Health; large?: boolean }) {
  const c = useColors();
  const label = !health || health === 'healthy' ? 'Healthy' : health === 'questionable' ? 'Questionable' : health === 'doubtful' ? 'Doubtful' : health === 'out' ? 'Out' : 'IR';
  const tone = !health || health === 'healthy' ? 'bg-success/15' : health === 'questionable' ? 'bg-warning/15' : 'bg-destructive/15';
  const toneText = !health || health === 'healthy' ? 'text-success' : health === 'questionable' ? 'text-warning' : 'text-destructive';
  const iconColor = !health || health === 'healthy' ? c.success : health === 'questionable' ? c.warning : c.destructive;
  return (
    <View className={cn('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', tone)}>
      <HeartPulse size={12} color={iconColor} />
      <Text className={cn('font-semibold tracking-widest', toneText, large ? 'text-[12px]' : 'text-[10px] uppercase')}>{label}</Text>
    </View>
  );
}

function TrendPill({ trend, small }: { trend: number; small?: boolean }) {
  const c = useColors();
  const up = trend >= 0;
  return (
    <View className="flex-row items-center gap-0.5">
      {up ? <TrendingUp size={12} color={c.success} /> : <TrendingDown size={12} color={c.destructive} />}
      <Text className={cn('font-semibold tabular-nums', up ? 'text-success' : 'text-destructive', small ? 'text-[11px]' : 'text-[12px]')}>{Math.abs(trend).toFixed(1)}</Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[48%] rounded-[18px] bg-background px-3 py-2.5">
      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-[14px] font-semibold tracking-tightish">{value}</Text>
    </View>
  );
}

function PrimaryButton({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center rounded-full bg-foreground px-4 py-2.5">
      <Text className="text-[13px] font-semibold tracking-tightish text-background">{children}</Text>
    </Pressable>
  );
}

function SecondaryButton({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center rounded-full bg-background px-4 py-2.5">
      <Text className="text-[13px] font-semibold tracking-tightish text-foreground">{children}</Text>
    </Pressable>
  );
}

function PlayerList({ players, onOpen, watchIds, toggleWatch }: { players: Player[]; onOpen: (id: string) => void; watchIds: Set<string>; toggleWatch: (id: string) => void }) {
  const c = useColors();
  if (players.length === 0) return <EmptyState icon={Search} title="No matches" body="Try a different filter or search term." />;
  return (
    <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
      {players.map((p, i) => (
        <View key={p.id} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
          <Pressable onPress={() => onOpen(p.id)} className="min-w-0 flex-1 flex-row items-center gap-3">
            <HeadshotBubble player={p} />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{p.team} {p.opp} · #{p.rank}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[14px] font-semibold tabular-nums">{p.proj.toFixed(1)}</Text>
              <TrendPill trend={p.trend} small />
            </View>
          </Pressable>
          <Pressable onPress={() => toggleWatch(p.id)} className="h-9 w-9 items-center justify-center rounded-full">
            <Star size={16} color={watchIds.has(p.id) ? c.foreground : c.mutedForeground} fill={watchIds.has(p.id) ? c.foreground : 'none'} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function CompactList({ players, metric, metricNegative, onOpen }: { players: Player[]; metric: (p: Player) => string; metricNegative?: boolean; onOpen: (id: string) => void }) {
  if (players.length === 0) return <EmptyState icon={Activity} title="Nothing yet" body="Check back later." />;
  return (
    <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
      {players.map((p, i) => (
        <Pressable key={p.id} onPress={() => onOpen(p.id)}>
          <View className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
            <HeadshotBubble player={p} />
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold tracking-tightish" numberOfLines={1}>{p.name}</Text>
              <Text className="text-[12px] text-muted-foreground">{p.pos} · {p.team}</Text>
            </View>
            <Text className={cn('text-[14px] font-semibold tabular-nums', metricNegative ? 'text-destructive' : 'text-success')}>{metric(p)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: ComponentType<{ size?: number; color?: string }>; title: string; body: string }) {
  const c = useColors();
  return (
    <View className="items-center rounded-[24px] bg-surface-elevated p-8">
      <Icon size={24} color={c.mutedForeground} />
      <Text className="mt-3 text-[14px] font-semibold tracking-tightish">{title}</Text>
      <Text className="mt-1 text-[12px] text-muted-foreground">{body}</Text>
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

function aiSummary(p: Player): string {
  if (p.health && p.health !== 'healthy') return `${p.name} is trending toward playing this week but may have a reduced workload. The backup remains a valuable insurance option.`;
  if (p.trend > 3) return `${p.name} is one of the hottest players in fantasy right now. Role and opportunity are both expanding heading into a favorable matchup.`;
  if (p.trend < -2) return `${p.name}'s usage has dipped over the last three weeks. Monitor practice reports and the depth chart before locking in lineups.`;
  return `${p.name} remains a steady fantasy producer with a stable role. Start with confidence in standard lineups this week.`;
}
