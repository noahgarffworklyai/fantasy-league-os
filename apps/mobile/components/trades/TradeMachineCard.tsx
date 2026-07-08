import { StyleSheet, View } from 'react-native';
import { ArrowLeftRight, ChevronRight } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useColors, useThemeTokens } from '@/lib/theme';

export function TradeMachineCard({ onOpen }: { onOpen?: () => void }) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();

  const content = (
    <View
      style={[
        surfaces.cardBorder,
        layout.row,
        {
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 16,
        },
      ]}
    >
      <View
        style={[
          surfaces.iconBoxDark,
          {
            width: 52,
            height: 52,
            borderRadius: 9999,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hex.border,
          },
        ]}
      >
        <ArrowLeftRight size={20} color={hex.primaryForeground} strokeWidth={2.25} />
      </View>

      <View style={[layout.flex1, { minWidth: 0, gap: 2 }]}>
        <Text variant="body" style={{ fontSize: 16 }}>
          Trade machine
        </Text>
        <Text variant="bodyMuted" numberOfLines={1}>
          Compare rosters and propose trades
        </Text>
      </View>

      <ChevronRight size={18} color={c.mutedForeground} />
    </View>
  );

  if (!onOpen) return content;

  return (
    <Pressable onPress={onOpen} style={{ width: '100%' }}>
      {content}
    </Pressable>
  );
}
