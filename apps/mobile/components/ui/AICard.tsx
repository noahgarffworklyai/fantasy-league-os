import { ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from './primitives';
import { useColors, useHex, useTheme, useThemeStyles } from '@/lib/theme';
import type { Confidence, Recommendation } from '@/lib/ai-intelligence';

export function AICard({
  rec,
  onAction,
  compact,
}: {
  rec: Recommendation;
  onAction?: () => void;
  compact?: boolean;
}) {
  const c = useColors();
  const hex = useHex();
  const { scheme } = useTheme();
  const { layout, surfaces, toneBg } = useThemeStyles();
  const primary = rec.action?.kind === 'primary';
  const external = rec.action?.label.startsWith('Open in');
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const borderColor =
    rec.tone === 'warning'
      ? 'rgba(242,177,13,0.4)'
      : rec.tone === 'danger'
        ? 'rgba(238,55,52,0.4)'
        : rec.tone === 'success'
          ? 'rgba(40,189,95,0.4)'
          : `rgba(${ink},0.1)`;

  return (
    <View style={[surfaces.aiCard, { borderColor }]}>
      <View style={layout.rowStart}>
        <View style={surfaces.iconBoxDark}>
          <Sparkles size={16} color={hex.primaryForeground} strokeWidth={2.25} />
        </View>
        <View style={layout.flex1}>
          <View style={[layout.row, { gap: 8 }]}>
            {rec.category ? (
              <Text variant="pill" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                {rec.category}
              </Text>
            ) : null}
            <ConfidencePill confidence={rec.confidence} />
          </View>
          <Text variant={compact ? 'bodySm' : 'body'} style={{ marginTop: 4 }}>
            {rec.title}
          </Text>
          {!compact ? (
            <Text variant="bodyMuted" style={{ marginTop: 4, lineHeight: 18 }}>
              {rec.why}
            </Text>
          ) : null}
        </View>
      </View>
      {rec.action ? (
        <Pressable
          onPress={onAction}
          style={[
            surfaces.aiButton,
            primary ? surfaces.aiButtonPrimary : surfaces.aiButtonSecondary,
          ]}
        >
          <Text
            variant="button"
            style={{ color: primary ? hex.primaryForeground : hex.foreground }}
          >
            {rec.action.label}
          </Text>
          {external ? (
            <ArrowUpRight size={14} color={primary ? c.background : c.foreground} />
          ) : (
            <ChevronRight size={14} color={primary ? c.background : c.foreground} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export function ConfidencePill({ confidence }: { confidence: Confidence }) {
  const hex = useHex();
  const { scheme } = useTheme();
  const { surfaces, toneBg } = useThemeStyles();
  const moderateBg = scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(13,13,13,0.1)';
  const map = {
    high: { label: 'High confidence', bg: toneBg.success, color: hex.success },
    moderate: { label: 'Moderate', bg: moderateBg, color: hex.foreground },
    low: { label: 'Low confidence', bg: hex.muted, color: hex.mutedForeground },
  } as const;
  const m = map[confidence];
  return (
    <View style={[surfaces.pill, { backgroundColor: m.bg, paddingHorizontal: 8, paddingVertical: 2 }]}>
      <Text variant="pill" style={{ color: m.color }}>
        {m.label}
      </Text>
    </View>
  );
}

export function AISection({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  const c = useColors();
  const { layout } = useThemeStyles();
  return (
    <View>
      <View style={[layout.rowBetween, { marginBottom: 8, paddingHorizontal: 8 }]}>
        <View style={[layout.row, { gap: 6 }]}>
          <Sparkles size={14} color={c.mutedForeground} />
          <Text variant="eyebrow">{title}</Text>
        </View>
        {caption ? (
          <Text variant="caption" muted>
            {caption}
          </Text>
        ) : null}
      </View>
      <View style={layout.stackSm}>{children}</View>
    </View>
  );
}
