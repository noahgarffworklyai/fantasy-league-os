import { AlertTriangle } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/primitives';
import type { PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { useColors, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

function SheetStat({ label, value, half }: { label: string; value: string; half?: boolean }) {
  const { hex, surfaces } = useThemeTokens();
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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const injured = player.status === 'q' || player.status === 'o';

  return (
    <View style={{ gap: spacing.section }}>
      <View style={[surfaces.roundedCard, { padding: 16 }]}>
        <View style={layout.rowBetween}>
          <View>
            <Text variant="eyebrow">Fantasy doctor</Text>
            <Text variant="body" style={{ marginTop: 2 }}>
              {injured ? 'Monitor closely' : 'Cleared to play'}
            </Text>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="statValue">{injured ? '72%' : '97%'}</Text>
            <Text variant="caption">to play</Text>
          </View>
        </View>
        <View style={[layout.rowWrap, layout.tight, { marginTop: 12 }]}>
          <SheetStat label="Body part" value={injured ? 'Lower body' : '—'} half />
          <SheetStat label="Severity" value={injured ? 'Mild' : 'None'} half />
          <SheetStat label="Practice" value={injured ? 'Limited' : 'Full'} half />
          <SheetStat label="Reinjury risk" value={injured ? 'Moderate' : 'Low'} half />
        </View>
      </View>

      {injured ? (
        <View style={[layout.row, layout.tight, { borderRadius: 16, backgroundColor: toneBg.warning, paddingHorizontal: 12, paddingVertical: 8 }]}>
          <AlertTriangle size={14} color={c.warning} />
          <Text variant="bodyMuted">{player.note ?? 'Monitor practice reports before kickoff.'}</Text>
        </View>
      ) : player.note ? (
        <View style={[surfaces.roundedCard, { padding: 16 }]}>
          <Text variant="bodySm">{player.note}</Text>
        </View>
      ) : null}
    </View>
  );
}
