import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/ui/primitives';
import { PlayerFantasyOutlook } from '@/components/player/PlayerFantasyOutlook';
import { usePlayerSleeperStats } from '@/lib/use-player-sleeper-stats';
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
  const { hex, layout, surfaces } = useThemeTokens();
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
  const { data, isLoading } = usePlayerSleeperStats(player.id, {
    name: player.name,
    pos: player.pos,
    team: player.team,
    opp: player.opp,
    status: player.status,
    note: player.note,
    fallbackProj: player.proj,
    fallbackAvg: player.avg,
  });

  const avgPpg = data?.avgPpg ?? player.avg ?? null;
  const weekProj = data?.weekProj ?? player.proj ?? null;

  return (
    <View style={{ gap: spacing.section }}>
      <View style={[layout.row, layout.tight]}>
        <StatTile label="Avg PPG" value={avgPpg != null ? avgPpg.toFixed(1) : '—'} />
        <StatTile
          label={data?.week ? `Week ${data.week} proj` : 'This week'}
          value={weekProj != null ? weekProj.toFixed(1) : '—'}
        />
      </View>

      {player.ownership ? (
        <View style={[layout.rowBetween, { paddingHorizontal: 8 }]}>
          <Text variant="bodyMuted">Rostered</Text>
          <Text variant="bodySm">{player.ownership}</Text>
        </View>
      ) : null}

      {isLoading && !data ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : data?.outlook ? (
        <PlayerFantasyOutlook outlook={data.outlook} />
      ) : null}
    </View>
  );
}
