import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/ui/BackButton';
import { Pressable, ScrollView, Text, View } from './primitives';
import { useHex, useThemeStyles } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

export const BOTTOM_BAR_SPACE = 112;

/** Full-screen workflow page with a back header (mirrors WorkflowShell). */
export function WorkflowShell({
  title,
  eyebrow,
  children,
  trailing,
  onBack,
  hideTitle,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  trailing?: ReactNode;
  onBack?: () => void;
  hideTitle?: boolean;
}) {
  const router = useRouter();
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
        {hideTitle ? (
          <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
            <BackButton onPress={() => (onBack ? onBack() : router.back())} />
          </View>
        ) : (
          <View style={[L.rowBetween, { paddingHorizontal: 8, paddingBottom: 12 }]}>
            <BackButton onPress={() => (onBack ? onBack() : router.back())} />
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
        )}
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
