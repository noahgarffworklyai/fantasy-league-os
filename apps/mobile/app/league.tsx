import { Fragment, useRef, useState, useEffect, type ReactNode, useMemo } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, ScrollView, StyleSheet, TextInput, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line as SvgLine, Rect, Text as SvgText } from 'react-native-svg';
import {
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
  MessageCircle,
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
import {
  computeLeagueAwards,
  useLeagueTabData,
  type Matchup,
  type TeamRow,
  type LineupRow,
} from '@/lib/league-tab-data';
import { formatRelativeTime, useLeagueFeed, type LeagueFeedItem } from '@/lib/feed-api';
import { personAvatar, playerAvatar } from '@/lib/avatars';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';

/* ------------------------------ PAGE ------------------------------ */
type DetailView = { kind: 'league' } | { kind: 'matchup'; id: string } | { kind: 'team'; name: string };

export default function LeaguePage() {
  const { active } = useLeague();
  const { data, isLoading, isError, refetch } = useLeagueTabData(active?.id, active?.type === 'synced');
  const [view, setView] = useState<DetailView>({ kind: 'league' });
  const teams = data?.teams ?? [];
  const matchups = data?.matchups ?? [];
  const week = data?.week ?? active?.week ?? 1;

  if (!active) return null;

  if (view.kind === 'matchup') {
    const m = matchups.find((x) => x.id === view.id);
    if (!m) {
      return (
        <Screen>
          <View style={{ flex: 1, padding: 24 }}>
            <Pressable onPress={() => setView({ kind: 'league' })}>
              <Text variant="link">← Back to league</Text>
            </Pressable>
            <Text variant="bodyMuted" style={{ marginTop: 16 }}>Matchup not found.</Text>
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <MatchupDetail matchup={m} onBack={() => setView({ kind: 'league' })} />
      </Screen>
    );
  }
  if (view.kind === 'team') {
    const t = teams.find((x) => x.name === view.name);
    if (!t) {
      return (
        <Screen>
          <View style={{ flex: 1, padding: 24 }}>
            <Pressable onPress={() => setView({ kind: 'league' })}>
              <Text variant="link">← Back to league</Text>
            </Pressable>
          </View>
        </Screen>
      );
    }
    return (
      <Screen>
        <TeamOverview team={t} onBack={() => setView({ kind: 'league' })} />
      </Screen>
    );
  }

  return (
    <Screen>
      <LeagueHome
        active={active}
        week={week}
        teams={teams}
        matchups={matchups}
        isLoading={isLoading}
        isError={isError}
        hasSnapshot={data?.hasSnapshot ?? false}
        onRetry={() => refetch()}
        onOpenMatchup={(id) => setView({ kind: 'matchup', id })}
        onOpenTeam={(name) => setView({ kind: 'team', name })}
      />
    </Screen>
  );
}

type LeagueTab = 'standings' | 'live' | 'analytics';

function LeagueHome({
  active,
  week,
  teams,
  matchups,
  isLoading,
  isError,
  hasSnapshot,
  onRetry,
  onOpenMatchup,
  onOpenTeam,
}: {
  active: League;
  week: number;
  teams: TeamRow[];
  matchups: Matchup[];
  isLoading: boolean;
  isError: boolean;
  hasSnapshot: boolean;
  onRetry: () => void;
  onOpenMatchup: (id: string) => void;
  onOpenTeam: (name: string) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<LeagueTab>('standings');
  const [feedOpen, setFeedOpen] = useState(false);
  const feed = useLeagueFeed(hasSnapshot ? active.id : undefined);
  const totalW = teams.reduce((s, t) => s + t.wins, 0);
  const totalL = teams.reduce((s, t) => s + t.losses, 0);
  const teamCount = teams.length || active.members;

  return (
    <View style={layout.screen}>
      <PageIntro
        eyebrow={`Week ${week}`}
        title={active.name}
        subtitle={`${teamCount} teams · ${teams.length ? `${totalW}-${totalL} combined` : 'Loading stats…'} · ${active.type === 'synced' ? `Synced from ${active.platform}` : 'Hosted'}`}
      />

      {isLoading ? (
        <View style={[layout.centered, { paddingVertical: 48 }]}>
          <ActivityIndicator color={hex.primary} />
          <Text variant="bodyMuted" style={{ marginTop: 12 }}>
            {active.type === 'synced' ? `Loading league from ${active.platform}…` : 'Loading league…'}
          </Text>
        </View>
      ) : isError ? (
        <View style={{ gap: 12, paddingVertical: 24 }}>
          <Text variant="bodyMuted">Could not load league data.</Text>
          <Pressable onPress={onRetry} style={surfaces.primaryButton}>
            <Text variant="button" style={{ color: hex.primaryForeground }}>Retry</Text>
          </Pressable>
        </View>
      ) : !hasSnapshot ? (
        <View style={{ paddingVertical: 24, paddingHorizontal: 8 }}>
          <Text variant="bodyMuted">
            {active.type === 'synced'
              ? 'No standings synced yet. If you just connected, wait a moment and pull to refresh, or re-sync from Commissioner → Settings.'
              : 'No teams in this league yet. Invite members from Commissioner → Invite Members, then standings will appear here.'}
          </Text>
          <Pressable onPress={onRetry} style={[surfaces.secondaryButton, { marginTop: 16, height: 44 }]}>
            <Text variant="body">Refresh</Text>
          </Pressable>
        </View>
      ) : (
        <>
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
                  {feed.items.length}
                </Text>
              </View>
            </Pressable>
          </View>

          {tab === 'standings' ? <StandingsPane teams={teams} onOpenTeam={onOpenTeam} /> : null}
          {tab === 'live' ? <LivePane matchups={matchups} onOpenMatchup={onOpenMatchup} /> : null}
          {tab === 'analytics' ? <AnalyticsPane active={active} teams={teams} week={week} /> : null}
        </>
      )}

      <FeedSheet
        open={feedOpen}
        onClose={() => setFeedOpen(false)}
        items={feed.items}
        isLoading={feed.isLoading}
        isError={feed.isError}
        posting={feed.posting}
        onPost={feed.post}
        onReact={feed.react}
        onVote={feed.vote}
        onRetry={() => feed.refetch()}
      />
    </View>
  );
}

/* ------------------------------ STANDINGS ------------------------------ */
function playoffOdds(rank: number, teamCount: number) {
  const cutoff = teamCount <= 10 ? 4 : 6;
  if (rank <= cutoff - 2) return 95;
  if (rank <= cutoff) return 75;
  if (rank === cutoff + 1) return 35;
  if (rank === cutoff + 2) return 15;
  return 5;
}

function StandingsPane({ teams, onOpenTeam }: { teams: TeamRow[]; onOpenTeam: (name: string) => void }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const playoffCutoff = teams.length <= 10 ? 4 : 6;
  const clinching = teams.filter((t) => t.rank <= Math.min(2, playoffCutoff)).length;
  const bubble = teams.filter((t) => t.rank > playoffCutoff - 2 && t.rank <= playoffCutoff + 1).length;

  return (
    <Section title="Standings & playoff odds">
      <View style={styles.standingsBanner}>
        <Text variant="eyebrow">Top {playoffCutoff} make playoffs</Text>
        <Text variant="caption">
          <Text variant="caption" style={{ color: toneFg.success, fontWeight: '600' }}>{clinching}</Text>
          {' clinching · '}
          <Text variant="caption" style={{ color: hex.warning, fontWeight: '600' }}>{bubble}</Text>
          {' bubble'}
        </Text>
      </View>
      <View style={surfaces.roundedCard}>
        {teams.map((t, i) => {
          const odds = playoffOdds(t.rank, teams.length);
          const oddsColor =
            odds >= 90 ? toneFg.success : odds >= 50 ? hex.foreground : odds >= 20 ? hex.warning : toneFg.danger;
          const barColor =
            odds >= 90 ? hex.success : odds >= 50 ? `rgba(${ink},0.8)` : odds >= 20 ? hex.warning : 'rgba(238,55,52,0.7)';
          return (
            <Pressable key={t.name} onPress={() => onOpenTeam(t.name)}>
              <View style={[styles.standingsRow, i > 0 ? layout.listRowBorder : null]}>
                <Text variant="bodyMuted" style={{ width: 20, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{t.rank}</Text>
                <AvatarImage src={personAvatar(t.owner + t.name, t.ownerAvatarUrl)} name={t.owner} size={36} />
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
function LivePane({ matchups, onOpenMatchup }: { matchups: Matchup[]; onOpenMatchup: (id: string) => void }) {
  const { hex, layout } = useThemeTokens();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<ScrollView | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (idx !== active) setActive(idx);
  };

  if (!matchups.length) {
    return (
      <View style={{ paddingVertical: 24, paddingHorizontal: 8 }}>
        <Text variant="bodyMuted">No matchups for this week yet.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={[layout.rowBetween, { paddingHorizontal: 4 }]}>
        <Text variant="eyebrow">Matchup {active + 1} of {matchups.length}</Text>
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
        {matchups.map((m) => (
          <View key={m.id} style={{ width: cardW }}>
            <LiveMatchupCard
              matchup={m}
              homeLineup={m.homeLineup}
              awayLineup={m.awayLineup}
              onOpen={() => onOpenMatchup(m.id)}
            />
          </View>
        ))}
      </ScrollView>
      <View style={[layout.row, layout.centered, { gap: 6, paddingTop: 4 }]}>
        {matchups.map((_, i) => (
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

function LiveMatchupCard({ matchup: m, homeLineup, awayLineup, onOpen }: { matchup: Matchup; homeLineup: LineupRow[]; awayLineup: LineupRow[]; onOpen: () => void }) {
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
              <AvatarImage src={personAvatar(m.home.owner + m.home.name, m.home.ownerAvatarUrl)} name={m.home.owner} size={32} />
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
              <AvatarImage src={personAvatar(m.away.owner + m.away.name, m.away.ownerAvatarUrl)} name={m.away.owner} size={32} />
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

function LiveLineupCol({ team, rows }: { team: string; rows: LineupRow[] }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View>
      <Text variant="eyebrow" style={{ paddingHorizontal: 12, paddingTop: 12 }} numberOfLines={1}>{team}</Text>
      <View style={{ marginTop: 4 }}>
        {(rows.length ? rows : [{ slot: '—', name: 'No lineup synced', pts: 0, rem: '—' }]).map((r, i) => (
          <View key={r.slot + i} style={[styles.lineupRow, i > 0 ? layout.listRowBorder : null]}>
            <Text variant="pill" muted style={{ width: 32, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{r.slot}</Text>
            {r.playerId || r.imageUrl ? (
              <AvatarImage
                src={playerAvatar({ playerId: r.playerId, name: r.name, imageUrl: r.imageUrl })}
                name={r.name}
                size={28}
              />
            ) : null}
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
function AnalyticsPane({ active, teams, week }: { active: League; teams: TeamRow[]; week: number }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces } = useThemeTokens();
  const [awardFilter, setAwardFilter] = useState<'season' | number>('season');
  const awards = teams.length ? computeLeagueAwards(teams) : [];
  const weeks = Array.from({ length: Math.min(week, 8) }, (_, i) => i + 1);

  return (
    <View style={{ gap: 24 }}>
      <Section title="Team comparison">
        <MetricScatter teams={teams} />
      </Section>

      <Section title="League awards">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <FilterChip active={awardFilter === 'season'} onPress={() => setAwardFilter('season')} label="Season" />
          {weeks.map((w) => (
            <FilterChip key={w} active={awardFilter === w} onPress={() => setAwardFilter(w)} label={`Wk ${w}`} />
          ))}
        </ScrollView>
        <View style={[layout.rowWrap, { gap: 8 }]}>
          {awards.map((a) => (
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

function MetricScatter({ teams }: { teams: TeamRow[] }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [metric, setMetric] = useState<MetricKey>('pf');
  const [hover, setHover] = useState<number | null>(null);
  const cfg = METRICS.find((m) => m.key === metric)!;

  if (!teams.length) {
    return (
      <View style={[surfaces.roundedCard, { padding: 16 }]}>
        <Text variant="bodyMuted">No team data to compare yet.</Text>
      </View>
    );
  }

  const values = teams.map((t) => teamMetric(t, metric));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const pad = (max - min) * 0.12 || 1;
  const yMin = min - pad;
  const yMax = max + pad;
  const W = 320, H = 200, padL = 8, padR = 8, padT = 14, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xFor = (i: number) => padL + (innerW * (i + 0.5)) / teams.length;
  const yFor = (v: number) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const avgY = yFor(avg);
  const sorted = [...teams].map((t, i) => ({ t, v: values[i] })).sort((a, b) => b.v - a.v);

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
          {teams.map((t, i) => {
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
function FeedSheet({
  open,
  onClose,
  items,
  isLoading,
  isError,
  posting,
  onPost,
  onReact,
  onVote,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  items: LeagueFeedItem[];
  isLoading: boolean;
  isError: boolean;
  posting: boolean;
  onPost: (content: string) => Promise<unknown>;
  onReact: (postId: string) => Promise<unknown>;
  onVote: (input: { pollId: string; optionId: string }) => Promise<unknown>;
  onRetry: () => void;
}) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const submit = async () => {
    const content = draft.trim();
    if (!content || posting) return;
    try {
      await onPost(content);
      setDraft('');
    } catch {
      // keep draft on failure
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.feedSheet,
            {
              height: '82%',
              paddingBottom: Math.max(insets.bottom, 8) + keyboardHeight,
            },
          ]}
        >
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
            keyboardShouldPersistTaps="handled"
          >
            {isLoading ? (
              <View style={[layout.centered, { paddingVertical: 32 }]}>
                <ActivityIndicator color={hex.primary} />
              </View>
            ) : isError ? (
              <View style={{ gap: 12, paddingVertical: 16 }}>
                <Text variant="bodyMuted">Could not load feed.</Text>
                <Pressable onPress={onRetry} style={surfaces.primaryButton}>
                  <Text variant="button" style={{ color: hex.primaryForeground }}>Retry</Text>
                </Pressable>
              </View>
            ) : items.length === 0 ? (
              <View style={{ paddingVertical: 24 }}>
                <Text variant="bodyMuted">No posts yet. Start the conversation below.</Text>
              </View>
            ) : (
              items.map((f) => (
                <FeedCard key={f.id} item={f} onReact={onReact} onVote={onVote} />
              ))
            )}
          </ScrollView>
          <View style={[layout.row, { gap: 8, alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, padding: 12 }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Post to the league…"
              placeholderTextColor={c.mutedForeground}
              style={styles.feedInput}
              editable={!posting}
              multiline
              maxLength={500}
            />
            <Pressable onPress={submit} disabled={posting || !draft.trim()} style={[styles.feedPostBtn, posting ? { opacity: 0.6 } : null]}>
              {posting ? (
                <ActivityIndicator color={hex.primaryForeground} size="small" />
              ) : (
                <Text variant="button" style={{ color: hex.primaryForeground }}>Post</Text>
              )}
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

const FEED_ICONS: Record<LeagueFeedItem['kind'], LucideIcon> = {
  post: MessageCircle,
  announcement: Pin,
  award: Trophy,
  recap: Trophy,
  poll: MessageCircle,
};

function FeedCard({
  item,
  onReact,
  onVote,
}: {
  item: LeagueFeedItem;
  onReact: (postId: string) => Promise<unknown>;
  onVote: (input: { pollId: string; optionId: string }) => Promise<unknown>;
}) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const c = useColors();
  const Icon = FEED_ICONS[item.kind] ?? MessageCircle;
  const poll = item.poll;
  const totalVotes = poll ? poll.options.reduce((s, o) => s + o.voteCount, 0) : 0;
  const votedOptionId = poll?.userVoteOptionId ?? null;

  return (
    <View style={surfaces.roundedCard}>
      <View style={{ gap: 8, padding: 16 }}>
        <View style={[layout.row, { gap: 8 }]}>
          <Icon size={14} color={c.mutedForeground} />
          <Text variant="eyebrow">{item.authorName}</Text>
          <Text variant="caption" style={{ opacity: 0.6 }}>·</Text>
          <Text variant="eyebrow">{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text variant="body">{item.headline}</Text>
        {item.body ? <Text variant="subtitle">{item.body}</Text> : null}

        {poll ? (
          <View style={{ gap: 6, paddingTop: 4 }}>
            {poll.options.map((o) => {
              const pct = totalVotes ? Math.round((o.voteCount / totalVotes) * 100) : 0;
              const selected = votedOptionId === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => onVote({ pollId: poll.pollId, optionId: o.id })}
                  style={styles.pollOption}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      backgroundColor: selected ? `rgba(${ink},0.15)` : `rgba(${ink},0.05)`,
                      width: votedOptionId ? `${pct}%` : 0,
                    }}
                  />
                  <View style={layout.rowBetween}>
                    <Text variant="bodySm" style={{ fontSize: 13 }}>{o.text}</Text>
                    {votedOptionId ? <Text variant="bodyMuted" style={{ fontVariant: ['tabular-nums'] }}>{pct}%</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            <Text variant="caption" style={{ paddingTop: 2 }}>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </Text>
          </View>
        ) : null}
      </View>

      {item.kind !== 'poll' ? (
        <View style={[layout.row, { gap: 4, paddingHorizontal: 8, paddingBottom: 8 }]}>
          <Pressable
            onPress={() => onReact(item.id)}
            style={[layout.row, { gap: 6, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }]}
          >
            <ThumbsUp size={14} color={c.mutedForeground} />
            {item.reactionCount > 0 ? (
              <Text variant="bodyMuted" style={{ fontWeight: '500', fontVariant: ['tabular-nums'] }}>
                {item.reactionCount}
              </Text>
            ) : null}
          </Pressable>
        </View>
      ) : null}
    </View>
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
  const homeLineup = m.homeLineup.length ? m.homeLineup : [{ slot: '—', name: 'No starters synced', pts: 0, rem: '—' }];
  const awayLineup = m.awayLineup.length ? m.awayLineup : [{ slot: '—', name: 'No starters synced', pts: 0, rem: '—' }];

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
              <AvatarImage src={personAvatar(m.home.owner + m.home.name, m.home.ownerAvatarUrl)} name={m.home.owner} size={36} />
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
              <AvatarImage src={personAvatar(m.away.owner + m.away.name, m.away.ownerAvatarUrl)} name={m.away.owner} size={36} />
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

function LineupCol({ team, rows }: { team: string; rows: LineupRow[] }) {
  const styles = useLeagueStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: hex.surfaceElevated }}>
      <Text variant="bodySm" style={{ fontSize: 12, paddingHorizontal: 12, paddingTop: 12 }} numberOfLines={1}>{team}</Text>
      <View style={{ marginTop: 8 }}>
        {rows.map((r, i) => (
          <View key={r.slot + i} style={[styles.lineupRowLg, i > 0 ? layout.listRowBorder : null]}>
            <Text variant="pill" muted style={{ width: 32, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>{r.slot}</Text>
            {r.playerId || r.imageUrl ? (
              <AvatarImage
                src={playerAvatar({ playerId: r.playerId, name: r.name, imageUrl: r.imageUrl })}
                name={r.name}
                size={32}
              />
            ) : null}
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
          <AvatarImage src={personAvatar(team.owner + team.name, team.ownerAvatarUrl)} name={team.owner} size={56} />
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
    minHeight: 44,
    maxHeight: 96,
    flex: 1,
    borderRadius: 22,
    backgroundColor: hex.muted,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
