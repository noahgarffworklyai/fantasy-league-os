import { Sparkles } from 'lucide-react-native';
import { View } from '@/components/ui/primitives';
import { Text } from '@/components/ui/primitives';
import { useTheme, useThemeTokens } from '@/lib/theme';

export function CommissionerInsightsCard({
  paragraphs,
  bullets,
}: {
  paragraphs: string[];
  bullets: string[];
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';

  return (
    <View
      style={[
        surfaces.aiCard,
        {
          borderColor: `rgba(${ink},0.1)`,
          padding: 16,
          gap: 14,
        },
      ]}
    >
      <View style={[layout.row, { gap: 8, alignItems: 'center' }]}>
        <View style={surfaces.iconBoxDark}>
          <Sparkles size={16} color={hex.primaryForeground} strokeWidth={2.25} />
        </View>
        <Text variant="eyebrow">The Commissioner&apos;s insights</Text>
      </View>

      <View style={{ gap: 12 }}>
        {paragraphs.map((paragraph, i) => (
          <Text key={i} variant="bodyMuted" style={{ lineHeight: 22 }}>
            {paragraph}
          </Text>
        ))}
      </View>

      {bullets.length > 0 ? (
        <View style={{ gap: 8, paddingTop: 2 }}>
          {bullets.map((bullet, i) => (
            <View key={i} style={[layout.rowStart, { gap: 10, alignItems: 'flex-start' }]}>
              <Text variant="bodyMuted" style={{ lineHeight: 22, marginTop: 1 }}>
                •
              </Text>
              <Text variant="bodyMuted" style={{ flex: 1, lineHeight: 22 }}>
                {bullet}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
