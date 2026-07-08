import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import {
  Activity,
  Flame,
  HeartPulse,
  type LucideIcon,
  Newspaper,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { PlayerProfilePanelContent } from '@/components/player/PlayerProfilePanels';
import { PlayerHeaderProjection } from '@/components/player/PlayerHeaderProjection';
import type { PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { PlayerProfileDataProvider } from '@/lib/use-player-sleeper-stats';
import type { PlayerProfileTab } from '@/components/player/PlayerProfileTabs';
import { BackButton } from '@/components/ui/BackButton';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { SearchInput } from '@/components/ui/Input';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { useLeague } from '@/lib/league-context';
import {
  formatAddedMetric,
  formatDroppedMetric,
  formatProj,
  mapDetailToPlayer,
  mapSearchRowToPlayer,
  usePlayerDetail,
  usePlayerSearch,
  useWatchlistPlayers,
} from '@/lib/players-api';
import { useAddPlayerToRoster } from '@/lib/team-roster-api';
import { playerAvatar } from '@/lib/avatars';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

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
  rostered?: boolean;
  watch?: boolean;
  avail?: number;
  added?: number;
  dropped?: number;
  imageUrl?: string;
}

interface DoctorAlert { playerId: string; status: string; detail: string; prob: number }

interface NewsItem { id: string; playerId: string; headline: string; source: string; when: string; tag: 'injury' | 'role' | 'depth' | 'coach' | 'trade' }

const FILTERS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;

function pickupLabel(isSynced: boolean, platform: string | undefined, player: Player) {
  if (isSynced) return `Open waivers in ${platform}`;
  if (player.mine) return 'On your roster';
  if (player.rostered || (player.avail ?? 100) === 0) return 'Rostered';
  return 'Add to team';
}

function canPickup(isSynced: boolean, player: Player) {
  return !isSynced && !player.mine && !player.rostered && (player.avail ?? 100) > 0;
}

/* ------------------------------ PAGE ------------------------------ */
type DetailView = { kind: 'home' } | { kind: 'player'; id: string };

export default function PlayersPage() {
  const { active } = useLeague();
  const [view, setView] = useState<DetailView>({ kind: 'home' });
  const [watchIds, setWatchIds] = useState<Set<string>>(() => new Set());

  const toggleWatch = (id: string) =>
    setWatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const playerId = view.kind === 'player' ? view.id : undefined;
  const { data: playerData, isLoading: playerLoading } = usePlayerDetail(playerId, active?.id);
  const { data: relatedData } = usePlayerSearch(active?.id, { search: '', position: 'All', tab: 'all' });
  const { addPlayer, isPending: pickupPending } = useAddPlayerToRoster(active?.id);

  const handlePickup = async (player: Player) => {
    if (!active || active.type === 'synced') return;
    try {
      await addPlayer(player.id);
      Alert.alert('Added to team', `${player.name} was added to your bench.`);
    } catch (e) {
      Alert.alert('Could not add player', e instanceof Error ? e.message : 'Try again.');
    }
  };

  if (!active) return null;

  if (view.kind === 'player') {
    const player = playerData?.player ? mapDetailToPlayer(playerData.player) : null;
    const related = (relatedData?.players ?? [])
      .map(mapSearchRowToPlayer)
      .filter((r) => r.id !== playerId && player && (r.team === player.team || r.pos === player.pos))
      .slice(0, 6);

    if (playerLoading && !player) {
      return (
        <Screen>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        </Screen>
      );
    }

    if (!player) {
      return (
        <Screen>
          <EmptyState icon={Search} title="Player not found" body="Try searching again from the player list." />
        </Screen>
      );
    }

    return (
      <Screen>
        <PlayerDetail
          player={player}
          related={related}
          isSynced={active.type === 'synced'}
          platform={active.platform}
          onBack={() => setView({ kind: 'home' })}
          onOpenPlayer={(id) => setView({ kind: 'player', id })}
          watched={watchIds.has(player.id)}
          onToggleWatch={() => toggleWatch(player.id)}
          onPickup={() => handlePickup(player)}
          pickupPending={pickupPending}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PlayersHome
        leagueId={active.id}
        isSynced={active.type === 'synced'}
        platform={active.platform}
        onOpenPlayer={(id) => setView({ kind: 'player', id })}
        watchIds={watchIds}
        toggleWatch={toggleWatch}
        onPickup={handlePickup}
        pickupPending={pickupPending}
      />
    </Screen>
  );
}

/* ------------------------------ HOME ------------------------------ */
type HomeTab = 'all' | 'available' | 'injured' | 'watchlist';

function PlayersHome({
  leagueId,
  isSynced,
  platform,
  onOpenPlayer,
  watchIds,
  toggleWatch,
  onPickup,
  pickupPending,
}: {
  leagueId: string;
  isSynced: boolean;
  platform?: string;
  onOpenPlayer: (id: string) => void;
  watchIds: Set<string>;
  toggleWatch: (id: string) => void;
  onPickup: (player: Player) => void;
  pickupPending: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<(typeof FILTERS)[number]>('All');
  const [tab, setTab] = useState<HomeTab>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const searching = q.trim().length > 0;

  const { data, isLoading, isError } = usePlayerSearch(leagueId, { search: q, position: pos, tab });
  const { data: trendingData } = usePlayerSearch(
    leagueId,
    { search: '', position: pos, tab: 'all' },
    { enabled: tab === 'available' && !searching },
  );
  const { players: watchlistRaw, isLoading: watchlistLoading } = useWatchlistPlayers(
    leagueId,
    tab === 'watchlist' ? [...watchIds] : [],
  );

  const matchesPos = (p: Player) => pos === 'All' || p.pos === pos;
  const isInjured = (p: Player) => p.health === 'questionable' || p.health === 'doubtful' || p.health === 'out' || p.health === 'ir';
  const isAvailable = (p: Player) => (p.avail ?? 100 - p.ownership) >= 20;

  const apiPlayers = useMemo(() => (data?.players ?? []).map(mapSearchRowToPlayer), [data?.players]);
  const trendingPool = useMemo(() => (trendingData?.players ?? []).map(mapSearchRowToPlayer), [trendingData?.players]);

  const searchResults = useMemo(() => apiPlayers.filter(matchesPos), [apiPlayers, pos]);
  const tabPlayers = useMemo(() => {
    if (tab === 'watchlist') {
      return watchlistRaw.map(mapDetailToPlayer).filter(matchesPos);
    }
    const base = apiPlayers.filter(matchesPos);
    if (tab === 'all') return base;
    if (tab === 'available') return base.filter(isAvailable);
    if (tab === 'injured') return base.filter(isInjured);
    return base;
  }, [tab, apiPlayers, pos, watchlistRaw]);

  const trending = useMemo(() => [...tabPlayers].sort((a, b) => b.trend - a.trend), [tabPlayers]);

  const waivers = tabPlayers.filter((p) => (p.avail ?? 0) > 0).sort((a, b) => (b.avail ?? 0) - (a.avail ?? 0));
  const mostAdded = trendingPool.filter((p) => (p.added ?? 0) > 0).sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
  const mostDropped = trendingPool.filter((p) => (p.dropped ?? 0) > 0).sort((a, b) => (b.dropped ?? 0) - (a.dropped ?? 0));

  const injuryAlerts = useMemo<DoctorAlert[]>(() => {
    return tabPlayers
      .filter(isInjured)
      .slice(0, 6)
      .map((p) => ({
        playerId: p.id,
        status: p.health === 'out' || p.health === 'ir' ? 'Likely inactive' : 'Monitoring',
        detail:
          p.health === 'out' || p.health === 'ir'
            ? 'Listed on injury report — check practice participation before locking lineups.'
            : 'Injury designation updated from Sleeper roster data.',
        prob: p.health === 'out' || p.health === 'ir' ? 18 : p.health === 'doubtful' ? 42 : 72,
      }));
  }, [tabPlayers]);

  const injuryNews = useMemo<NewsItem[]>(() => {
    return tabPlayers
      .filter(isInjured)
      .slice(0, 5)
      .map((p, i) => ({
        id: `inj-${p.id}`,
        playerId: p.id,
        headline: `${p.name} — ${p.health ?? 'injury'} designation`,
        source: 'Sleeper',
        when: 'today',
        tag: 'injury' as const,
      }));
  }, [tabPlayers]);

  const loading = tab === 'watchlist' ? watchlistLoading : isLoading;

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

      <View style={layout.tight}>
        <View style={[layout.row, layout.tight]}>
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
          <View style={[surfaces.roundedCard, { marginTop: spacing.tight, padding: 12 }]}>
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

      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={hex.primary} />
        </View>
      ) : isError ? (
        <EmptyState icon={Search} title="Could not load players" body="Pull to refresh or try again in a moment." />
      ) : searching ? (
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
                    <Text variant="caption" muted>{p.pos} · {p.team}{p.rank > 0 ? ` · #${p.rank}` : ''}</Text>
                    <View style={[layout.rowEnd, { marginTop: 8 }]}>
                      <Text variant="titleLg" style={{ fontVariant: ['tabular-nums'] }}>{formatProj(p.proj)}</Text>
                      <TrendPill trend={p.trend} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Section>

          {tab === 'available' ? (
            <>
              <Section title="Top free agents">
                <View style={{ gap: 8 }}>
                  {waivers.filter(matchesPos).map((p) => (
                    <View key={p.id} style={[surfaces.roundedCard, { padding: 16 }]}>
                      <Pressable onPress={() => onOpenPlayer(p.id)} style={[layout.row, { gap: 12 }]}>
                        <HeadshotBubble player={p} />
                        <View style={[layout.flex1, { minWidth: 0 }]}>
                          <Text variant="body" numberOfLines={1}>{p.name}</Text>
                          <Text variant="bodyMuted">{p.pos} · {p.team} · {p.avail ?? 0}% available</Text>
                        </View>
                        <View style={layout.alignEnd}>
                          <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{formatProj(p.proj)}</Text>
                          <TrendPill trend={p.trend} small />
                        </View>
                      </Pressable>
                      <View style={{ marginTop: 12 }}>
                        <PrimaryButton
                          disabled={pickupPending || !canPickup(isSynced, p)}
                          onPress={() => onPickup(p)}
                        >
                          {pickupPending ? 'Adding…' : pickupLabel(isSynced, platform, p)}
                        </PrimaryButton>
                      </View>
                    </View>
                  ))}
                </View>
              </Section>

              <Section title="Most added">
                <CompactList players={mostAdded.filter(matchesPos)} metric={(p) => formatAddedMetric(p.added)} onOpen={onOpenPlayer} />
              </Section>
              <Section title="Most dropped">
                <CompactList players={mostDropped.filter(matchesPos)} metric={(p) => formatDroppedMetric(p.dropped)} metricNegative onOpen={onOpenPlayer} />
              </Section>
            </>
          ) : null}

          {tab === 'injured' ? (
            <>
              <Section title="Fantasy doctor alerts">
                <View style={{ gap: 8 }}>
                  {injuryAlerts.map((a) => {
                    const p = tabPlayers.find((x) => x.id === a.playerId);
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
                  {injuryNews.length === 0 ? (
                    <View style={{ padding: 16 }}>
                      <Text variant="bodyMuted">No injury updates right now.</Text>
                    </View>
                  ) : injuryNews.map((n, i) => {
                    const p = tabPlayers.find((x) => x.id === n.playerId);
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
              <PlayerList
                players={tabPlayers}
                onOpen={onOpenPlayer}
                watchIds={watchIds}
                toggleWatch={toggleWatch}
                isSynced={isSynced}
                onPickup={onPickup}
                pickupPending={pickupPending}
              />
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
type Tab = PlayerProfileTab;

function toProfileContext(player: Player): PlayerProfileContext {
  return {
    id: player.id,
    name: player.name,
    pos: player.pos,
    team: player.team,
    imageUrl: player.imageUrl,
    opp: player.opp,
    ownership: player.ownership > 0 ? `${player.ownership}%` : undefined,
    proj: player.proj,
    status:
      player.health === 'questionable' || player.health === 'doubtful'
        ? 'q'
        : player.health === 'out' || player.health === 'ir'
          ? 'o'
          : 'ok',
  };
}

function PlayerDetail({
  player: p,
  related,
  isSynced,
  platform,
  onBack,
  onOpenPlayer,
  watched,
  onToggleWatch,
  onPickup,
  pickupPending,
}: {
  player: Player;
  related: Player[];
  isSynced: boolean;
  platform?: string;
  onBack: () => void;
  onOpenPlayer: (id: string) => void;
  watched: boolean;
  onToggleWatch: () => void;
  onPickup: () => void;
  pickupPending: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<Tab>('overview');
  const profile = toProfileContext(p);

  return (
    <PlayerProfileDataProvider
      playerId={p.id}
      context={{
        name: p.name,
        pos: p.pos,
        team: p.team,
        opp: p.opp,
        status: profile.status,
      }}
    >
    <View style={[layout.screen, { paddingTop: 0 }]}>
      <View style={[layout.rowBetween, { paddingHorizontal: 4, paddingTop: 8 }]}>
        <BackButton onPress={onBack} variant="muted" />
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
            <Text variant="eyebrow">{p.pos} · {p.team}{p.bye > 0 ? ` · Bye ${p.bye}` : ''}</Text>
            <Text variant="sectionTitle" style={{ fontSize: 22 }} numberOfLines={1}>{p.name}</Text>
            <View style={[layout.row, { marginTop: 4, gap: 8 }]}>
              <HealthBadge health={p.health} />
              {p.rank > 0 ? <Text variant="bodyMuted">Rank #{p.rank}</Text> : null}
            </View>
          </View>
          <View style={layout.alignEnd}>
            <PlayerHeaderProjection fallback={p.proj} />
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
          <PrimaryButton
            disabled={pickupPending || !canPickup(isSynced, p)}
            onPress={onPickup}
          >
            {pickupPending ? 'Adding…' : pickupLabel(isSynced, platform, p)}
          </PrimaryButton>
          <SecondaryButton onPress={onToggleWatch}>{watched ? 'Watching' : 'Watch'}</SecondaryButton>
        </View>
      </View>

      <PlayerProfilePanelContent player={profile} tab={tab} onTabChange={setTab} />

      <Section title="Related players">
        {related.length === 0 ? (
          <Text variant="bodyMuted" style={{ paddingHorizontal: 4 }}>No related players loaded yet.</Text>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {related.map((r) => (
            <Pressable key={r.id} onPress={() => onOpenPlayer(r.id)} style={[surfaces.roundedCard, { width: 150, padding: 12 }]}>
              <HeadshotBubble player={r} />
              <Text variant="bodySm" style={{ marginTop: 8 }} numberOfLines={1}>{r.name}</Text>
              <Text variant="caption" muted>{r.pos} · {r.team}</Text>
              <View style={[layout.rowBetween, { marginTop: 4 }]}>
                <Text variant="caption" style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>{formatProj(r.proj)}</Text>
                <TrendPill trend={r.trend} small />
              </View>
            </Pressable>
          ))}
        </ScrollView>
        )}
      </Section>
    </View>
    </PlayerProfileDataProvider>
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
  const size = large ? 64 : 40;
  const src = playerAvatar({ playerId: player.id, name: player.name, team: player.team, imageUrl: player.imageUrl });
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <AvatarImage src={src} name={player.name} size={size} />
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

function PrimaryButton({
  children,
  onPress,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg, type: typeStyles } = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        layout.flex1,
        surfaces.pill,
        {
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: hex.foreground,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
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

function PlayerList({
  players,
  onOpen,
  watchIds,
  toggleWatch,
  isSynced,
  onPickup,
  pickupPending,
}: {
  players: Player[];
  onOpen: (id: string) => void;
  watchIds: Set<string>;
  toggleWatch: (id: string) => void;
  isSynced?: boolean;
  onPickup?: (player: Player) => void;
  pickupPending?: boolean;
}) {
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
              <Text variant="bodyMuted" numberOfLines={1}>{p.team} {p.opp}{p.rank > 0 ? ` · #${p.rank}` : ''}</Text>
            </View>
            <View style={layout.alignEnd}>
              <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{formatProj(p.proj)}</Text>
              <TrendPill trend={p.trend} small />
            </View>
          </Pressable>
          {!isSynced && onPickup && canPickup(false, p) ? (
            <Pressable
              onPress={() => onPickup(p)}
              disabled={pickupPending}
              style={[layout.iconButtonSm, { width: 36, height: 36, borderWidth: 0, backgroundColor: hex.foreground, opacity: pickupPending ? 0.45 : 1 }]}
            >
              <Plus size={16} color={c.background} />
            </Pressable>
          ) : null}
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

function aiSummary(p: Player): string {
  if (p.health && p.health !== 'healthy') return `${p.name} is trending toward playing this week but may have a reduced workload. The backup remains a valuable insurance option.`;
  if (p.trend > 3) return `${p.name} is one of the hottest players in fantasy right now. Role and opportunity are both expanding heading into a favorable matchup.`;
  if (p.trend < -2) return `${p.name}'s usage has dipped over the last three weeks. Monitor practice reports and the depth chart before locking in lineups.`;
  return `${p.name} remains a steady fantasy producer with a stable role. Start with confidence in standard lineups this week.`;
}
