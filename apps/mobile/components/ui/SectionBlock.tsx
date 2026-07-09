import { type ReactNode } from 'react';
import { Text, View } from './primitives';
import { useThemeStyles } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

/** Section with uppercase label + elevated card body (WorkflowShell style). */
export function SectionBlock({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { layout, surfaces } = useThemeStyles();
  return (
    <View style={{ marginBottom: spacing.screen }}>
      <View style={[layout.rowBetween, { marginBottom: spacing.section, paddingHorizontal: 8 }]}>
        <Text variant="eyebrow" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {title}
        </Text>
        {action}
      </View>
      <View style={surfaces.roundedCard}>{children}</View>
    </View>
  );
}

/** In-page section with large title (team lineup sections, etc.). */
export function SectionHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  const { layout } = useThemeStyles();
  return (
    <View style={layout.sectionHeader}>
      <Text variant="sectionTitle">{title}</Text>
      {caption ? <Text variant="bodyMuted">{caption}</Text> : null}
      {action}
    </View>
  );
}
