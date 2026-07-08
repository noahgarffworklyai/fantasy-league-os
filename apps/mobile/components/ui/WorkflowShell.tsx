import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, Text, View } from './primitives';
import { useColors, useHex, useThemeStyles } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

export const BOTTOM_BAR_SPACE = 112;

/** Full-screen workflow page with a back header (mirrors WorkflowShell). */
export function WorkflowShell({
  title,
  eyebrow,
  children,
  trailing,
  onBack,
  backLabel = 'Back',
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  trailing?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) {
  const router = useRouter();
  const c = useColors();
  const hex = useHex();
  const { layout: L } = useThemeStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[L.fill, { backgroundColor: hex.surface }]}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 14),
          borderBottomWidth: 1,
          borderBottomColor: hex.hairline,
          backgroundColor: hex.surface,
        }}
      >
        <View style={[L.rowBetween, { paddingHorizontal: 8, paddingBottom: 12 }]}>
          <Pressable
            onPress={() => (onBack ? onBack() : router.back())}
            style={[L.row, { gap: 2, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 4 }]}
          >
            <ChevronLeft size={20} color={c.success} />
            <Text variant="body" style={{ color: hex.success }}>
              {backLabel}
            </Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            {eyebrow ? (
              <Text variant="pill" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="titleMd">{title}</Text>
          </View>
          <View
            style={{
              minWidth: 64,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 8,
            }}
          >
            {trailing}
          </View>
        </View>
      </View>
      <ScrollView
        style={L.fill}
        contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { layout: L, surfaces } = useThemeStyles();
  return (
    <View style={{ marginBottom: spacing.screen }}>
      <View style={[L.rowBetween, { marginBottom: spacing.section, paddingHorizontal: 8 }]}>
        <Text variant="eyebrow" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {title}
        </Text>
        {action}
      </View>
      <View style={surfaces.roundedCard}>{children}</View>
    </View>
  );
}

export function Row({
  label,
  sub,
  value,
  onPress,
  trailing,
  first,
}: {
  label: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  first?: boolean;
}) {
  const { layout: L } = useThemeStyles();
  const inner = (
    <View style={[L.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }, !first ? L.listRowBorder : null]}>
      <View style={[L.flex1, { minWidth: 0 }]}>
        <Text variant="body">{label}</Text>
        {sub ? <Text variant="bodyMuted">{sub}</Text> : null}
      </View>
      {value ? (
        <Text variant="bodyMuted" style={{ fontSize: 14 }}>
          {value}
        </Text>
      ) : null}
      {trailing}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ width: '100%' }}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  const { surfaces } = useThemeStyles();
  return (
    <View style={surfaces.emptyState}>
      <Text variant="body">{title}</Text>
      {sub ? (
        <Text variant="subtitle" style={{ marginTop: 4 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
