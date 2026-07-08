import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/ui/primitives';
import { CommissionerInsightsCard } from '@/components/player/CommissionerInsightsCard';
import { usePlayerProfileData } from '@/lib/use-player-sleeper-stats';
import { useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

export type PlayerProfileContext = {
  id?: string;
  name: string;
  pos: string;
  team: string;
  imageUrl?: string;
  opp?: string;
  status?: 'ok' | 'q' | 'o';
  note?: string;
  ownership?: string;
  proj?: number;
  avg?: number;
  seasonPts?: number;
  value?: number;
};

function StatTile({ label, value }: { label: string; value: string }) {
  const { layout, surfaces } = useThemeTokens();
  return (
    <View style={[surfaces.roundedCard, layout.flex1, { padding: 14, alignItems: 'center' }]}>
      <Text variant="titleLg" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" muted style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

export function PlayerOverviewPanel({ player }: { player: PlayerProfileContext }) {
  const { layout } = useThemeTokens();
  const { data, isLoading, isError, isFetching } = usePlayerProfileData();

  const avgPpg = data?.avgPpg ?? null;
  const weekProj = data?.weekProj ?? null;
  const projLabel = data?.week ? `Week ${data.week} proj` : data?.seasonKey === 'previous' ? 'Season complete' : 'This week';

  return (
    <View style={{ gap: spacing.section }}>
      <View style={[layout.row, layout.tight]}>
        <StatTile label="Avg PPG" value={avgPpg != null ? avgPpg.toFixed(1) : isLoading ? '…' : '—'} />
        <StatTile
          label={projLabel}
          value={weekProj != null ? weekProj.toFixed(1) : isLoading ? '…' : '—'}
        />
      </View>

      {player.ownership ? (
        <View style={[layout.rowBetween, { paddingHorizontal: 8 }]}>
          <Text variant="bodyMuted">Rostered</Text>
          <Text variant="bodySm">{player.ownership}</Text>
        </View>
      ) : null}

      {isLoading || isFetching ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator />
          <Text variant="caption" muted style={{ marginTop: 8 }}>
            Loading Sleeper data…
          </Text>
        </View>
      ) : isError ? (
        <View style={[layout.centered, { paddingVertical: 20 }]}>
          <Text variant="bodyMuted">Could not load Sleeper data for this player.</Text>
        </View>
      ) : data?.insights ? (
        <CommissionerInsightsCard
          paragraphs={data.insights.paragraphs}
          bullets={data.insights.bullets}
        />
      ) : (
        <View style={[layout.centered, { paddingVertical: 20 }]}>
          <Text variant="bodyMuted">No Sleeper data for {data?.statsSeason ?? 'this season'} yet.</Text>
        </View>
      )}
    </View>
  );
}
