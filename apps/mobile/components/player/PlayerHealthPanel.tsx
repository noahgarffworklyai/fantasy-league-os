import { ActivityIndicator, View } from 'react-native';
import { Newspaper } from 'lucide-react-native';
import { Text } from '@/components/ui/primitives';
import { CommissionerInsightsCard } from '@/components/player/CommissionerInsightsCard';
import type { PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { usePlayerProfileData } from '@/lib/use-player-sleeper-stats';
import { useColors, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

function SheetStat({ label, value, half }: { label: string; value: string; half?: boolean }) {
  const { surfaces } = useThemeTokens();
  return (
    <View
      style={[
        surfaces.roundedCard,
        {
          flex: half ? undefined : 1,
          width: half ? '48%' : undefined,
          padding: 14,
          alignItems: 'center',
        },
      ]}
    >
      <Text variant="titleLg">{value}</Text>
      <Text variant="caption" muted style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

export function PlayerHealthPanel({ player }: { player: PlayerProfileContext }) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const { data, isLoading, isError, isFetching } = usePlayerProfileData();

  const health = data?.health;

  if (isLoading || isFetching) {
    return (
      <View style={[layout.centered, { paddingVertical: 40 }]}>
        <ActivityIndicator />
        <Text variant="bodyMuted" style={{ marginTop: 12 }}>
          Loading Sleeper injury report…
        </Text>
      </View>
    );
  }

  if (isError || !health) {
    return (
      <View style={[layout.centered, { paddingVertical: 40 }]}>
        <Text variant="bodyMuted">Could not load Sleeper health data for this player.</Text>
      </View>
    );
  }

  const injured = health.injuryStatus === 'q' || health.injuryStatus === 'o';

  return (
    <View style={{ gap: spacing.section }}>
      {health.articles.length > 0 ? (
        <View style={{ gap: spacing.tight }}>
          <Text variant="eyebrow" style={{ paddingHorizontal: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Related news
          </Text>
          {health.articles.map((article) => (
            <View key={article.id} style={[surfaces.roundedCard, { padding: 16 }]}>
              <View style={[layout.row, layout.tight, { alignItems: 'center' }]}>
                <Newspaper size={14} color={c.mutedForeground} />
                <Text variant="caption" muted>
                  {article.source} · {article.when}
                </Text>
              </View>
              <Text variant="bodySm" style={{ marginTop: 8, lineHeight: 20 }}>
                {article.title}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[surfaces.roundedCard, { padding: 16 }]}>
        <View style={layout.rowBetween}>
          <View>
            <Text variant="eyebrow">Fantasy doctor</Text>
            <Text variant="body" style={{ marginTop: 2 }}>
              {injured ? 'Monitor closely' : 'Cleared to play'}
            </Text>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="statValue">{health.playProbability}%</Text>
            <Text variant="caption">chance to play</Text>
          </View>
        </View>
        <View style={[layout.rowWrap, layout.tight, { marginTop: 12 }]}>
          <SheetStat label="Practice" value={health.practiceStatus} half />
          <SheetStat label="Body part" value={health.bodyPart} half />
        </View>
        {health.injuryNotes ? (
          <Text variant="bodyMuted" style={{ marginTop: 12, lineHeight: 20 }}>
            {health.injuryNotes}
          </Text>
        ) : null}
      </View>

      {injured && health.similarCases.length > 0 ? (
        <View style={{ gap: spacing.tight }}>
          <Text variant="eyebrow" style={{ paddingHorizontal: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Similar injury comps
          </Text>
          <View style={[surfaces.roundedCard, { padding: 16, gap: spacing.section }]}>
            {health.similarCases.map((item, i) => (
              <View key={`${item.player}-${i}`}>
                {i > 0 ? (
                  <View style={{ height: 1, backgroundColor: hex.hairline, marginBottom: spacing.section }} />
                ) : null}
                <View style={layout.rowBetween}>
                  <Text variant="bodySm">
                    {item.player} · {item.pos}
                  </Text>
                  <Text variant="caption" style={{ color: hex.success }}>
                    {item.returnTimeline}
                  </Text>
                </View>
                <Text variant="caption" muted style={{ marginTop: 4 }}>
                  {item.injury}
                </Text>
                <Text variant="bodyMuted" style={{ marginTop: 6, lineHeight: 20 }}>
                  {item.note}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : !injured ? (
        <CommissionerInsightsCard
          paragraphs={[
            `${player.name} is healthy with no injury designation on Sleeper. Practice participation and game status look normal heading into the week.`,
            'No comparable injury timeline is needed — workload and matchup are the primary drivers for lineup decisions.',
          ]}
          bullets={['Sleeper status: active', 'Practice: full participation expected']}
        />
      ) : null}
    </View>
  );
}
