import { useState } from 'react';
import { Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { NewsFeed } from '@/components/home/NewsFeed';
import { StartSitCarousel } from '@/components/home/StartSitCarousel';
import { useLeague, type League } from '@/lib/league-context';
import { useAuthStore } from '@/lib/auth-store';
import { useHomeLeagueStats } from '@/lib/league-snapshot-api';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

type TabKey = 'priorities' | 'news';

export default function HomePage() {
  const { active, user } = useLeague();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [tab, setTab] = useState<TabKey>('priorities');
  const { hex, layout } = useThemeTokens();
  const isSynced = active?.type === 'synced';
  const { data: stats, isFetching } = useHomeLeagueStats(
    active?.id,
    user?.name ?? '',
    active?.teamName,
    isSynced,
    currentUserId,
  );

  if (!active) return null;

  const firstName = (user?.name ?? 'Marc').split(/\s+/)[0];
  const week = stats?.week || active.week || 1;

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
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'priorities' ? (
          <PrioritiesPane active={active} isSynced={isSynced} week={week} />
        ) : (
          <NewsFeed />
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
