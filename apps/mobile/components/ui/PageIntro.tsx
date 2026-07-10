import { type ReactNode } from 'react';
import { Text, View } from './primitives';
import { useThemeStyles } from '@/lib/theme';

/** Page header block: optional eyebrow, hero title, optional subtitle. */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const { layout } = useThemeStyles();
  return (
    <View style={layout.intro}>
      {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
      <View style={[layout.pageTitleRow, { marginTop: eyebrow ? 4 : 0 }]}>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="hero">{title}</Text>
        </View>
        {trailing}
      </View>
      {subtitle ? (
        <Text variant="subtitle" style={{ marginTop: 8 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
