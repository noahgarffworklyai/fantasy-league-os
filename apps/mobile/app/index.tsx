import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNav } from '@/lib/nav';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Card, Divider } from '@/components/ui/Card';
import { NewsFeed } from '@/components/home/NewsFeed';
import { StartSitCarousel } from '@/components/home/StartSitCarousel';
import { useLeague, type League } from '@/lib/league-context';
import { useAuthStore } from '@/lib/auth-store';
import { useHomeLeagueStats } from '@/lib/league-snapshot-api';
import { useThemeTokens } from '@/lib/theme';

type TabKey = 'priorities' | 'news' | 'league';

export default function HomePage() {
  const { active, user } = useLeague();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<TabKey>('priorities');
  const { hex, layout } = useThemeTokens();
  const isSynced = active?.type === 'synced';
  const { data: stats, isLoading, isError, isFetching } = useHomeLeagueStats(
    active?.id,
    user?.name ?? '',
    active?.teamName,
    isSynced,
    currentUserId,
  );

  if (!active) return null;

  const firstName = (user?.name ?? 'Marc').split(/\s+/)[0];
  const week = stats?.week || active.week || 1;
  const showLiveStats = !!stats?.hasSnapshot;

  return (
    <Screen>
      <View style={layout.screen}>
        <View style={layout.intro}>
          <Text variant="eyebrow">Week {week}</Text>
          <Text variant="hero" style={{ marginTop: 4 }}>
            Hi, {firstName}.
          </Text>
          {isSynced && stats?.syncStatus === 'error' ? (
            <Text variant="caption" style={{ marginTop: 8, color: hex.warning }}>
              {isFetching ? 'Sync issue — retrying now…' : 'Sync issue — will retry automatically.'}
            </Text>
          ) : null}
        </View>

        <Segmented
          tabs={[
            { key: 'priorities', label: 'Priorities' },
            { key: 'news', label: 'News' },
            { key: 'league', label: 'League' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'priorities' ? (
          <PrioritiesPane active={active} isSynced={isSynced} week={week} />
        ) : tab === 'news' ? (
          <NewsFeed />
        ) : (
          <LeaguePane
            active={active}
            stats={stats}
            isLoading={isLoading}
            isError={isError}
            showLiveStats={showLiveStats}
          />
        )}
      </View>
    </Screen>
  );
}

function PrioritiesPane({
  active,
  isSynced,
  week,
}: {
  active: League;
  isSynced: boolean;
  week: number;
}) {
  const router = useNav();
  const { layout } = useThemeTokens();
  return (
    <View style={layout.section}>
      <StartSitCarousel
        leagueId={active.id}
        isSynced={isSynced}
        week={week}
        onAction={() => router.switchTab('/team')}
      />
    </View>
  );
}

function LeaguePane({
  active,
  stats,
  isLoading,
  isError,
  showLiveStats,
}: {
  active: League;
  stats: ReturnType<typeof useHomeLeagueStats>['data'];
  isLoading: boolean;
  isError: boolean;
  showLiveStats: boolean;
}) {
  const router = useNav();
  const { hex, layout, surfaces } = useThemeTokens();
  const rank = stats?.rank || active.rank;
  const teamCount = stats?.teamCount || active.members;
  const playoffCutoff = Math.max(4, Math.ceil(teamCount / 2));

  return (
    <View style={layout.section}>
      <Card>
        <View style={[layout.rowWrap, layout.cardPad, { width: '100%' }]}>
          <View style={layout.half}>
            <Stat label="Standing" value={rank > 0 ? `#${rank}` : '—'} />
          </View>
          <View style={layout.half}>
            <Stat
              label="Playoffs"
              value={rank > 0 ? (rank <= playoffCutoff ? 'In' : 'Bubble') : '—'}
            />
          </View>
          <View style={layout.half}>
            <Stat label="Pot" value={`$${active.potUsd.toLocaleString()}`} />
          </View>
          <View style={layout.half}>
            <Stat label="Teams" value={String(teamCount)} />
          </View>
        </View>
        <Divider />
        <Pressable onPress={() => router.switchTab('/analytics')} style={layout.cardFooter}>
          <Text variant="link">Open analytics</Text>
          <ChevronRight size={16} color={hex.mutedForeground} />
        </Pressable>
      </Card>

      {isLoading ? (
        <Card>
          <View style={[layout.cardPad, layout.centered, { paddingVertical: 24 }]}>
            <ActivityIndicator color={hex.primary} />
          </View>
        </Card>
      ) : isError ? (
        <Card>
          <View style={layout.cardPad}>
            <Text variant="bodyMuted">Could not load standings.</Text>
          </View>
        </Card>
      ) : showLiveStats && stats?.topStandings.length ? (
        <Card>
          <View style={layout.cardPad}>
            <Text variant="eyebrow">Standings</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {stats.topStandings.map((row) => (
                <View key={row.rank} style={layout.rowBetween}>
                  <View style={[layout.row, { gap: 10, flex: 1 }]}>
                    <Text variant="caption" muted style={{ width: 22 }}>
                      {row.rank}
                    </Text>
                    <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                      {row.name}
                    </Text>
                  </View>
                  <Text variant="bodyMuted">
                    {row.record} · {row.pointsFor.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Divider />
          <Pressable onPress={() => router.switchTab('/analytics')} style={layout.cardFooter}>
            <Text variant="link">Full standings</Text>
            <ChevronRight size={16} color={hex.mutedForeground} />
          </Pressable>
        </Card>
      ) : null}

      <Pressable onPress={() => router.switchTab('/team')}>
        <Card>
          <View style={layout.healthRow}>
            <HealthStat label="Healthy" value="11" tone="success" first />
            <HealthStat label="Quest." value="2" tone="warning" />
            <HealthStat label="Out" value="1" tone="danger" />
            <HealthStat label="IR" value="1" tone="muted" />
          </View>
          <Divider />
          <View style={layout.cardFooter}>
            <Text variant="link">Roster health</Text>
            <ChevronRight size={16} color={hex.mutedForeground} />
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="eyebrow">{label}</Text>
      <Text variant="statValue" style={{ marginTop: 6 }}>
        {value}
      </Text>
    </View>
  );
}

function HealthStat({
  label,
  value,
  tone,
  first,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'muted';
  first?: boolean;
}) {
  const { layout, toneFg } = useThemeTokens();
  return (
    <View style={first ? layout.healthCell : layout.healthCellBorder}>
      <Text variant="scoreLG" style={{ color: toneFg[tone === 'muted' ? 'neutral' : tone] }}>
        {value}
      </Text>
      <Text variant="eyebrow" style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}
