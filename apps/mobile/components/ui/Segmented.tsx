import { Pressable, Text, View } from './primitives';
import { useHex, useThemeStyles } from '@/lib/theme';

export type SegmentedTab<K extends string> = { key: K; label: string };

/** Shared label styling for segmented tabs (component + inline usages). */
export function SegmentedTabLabel({
  active,
  children,
  center,
}: {
  active: boolean;
  children: string;
  center?: boolean;
}) {
  const hex = useHex();
  return (
    <Text
      variant="tab"
      style={{
        color: active ? hex.foreground : hex.mutedForeground,
        fontWeight: active ? '600' : '500',
        textAlign: center ? 'center' : undefined,
      }}
    >
      {children}
    </Text>
  );
}

export function Segmented<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: SegmentedTab<K>[];
  value: K;
  onChange: (k: K) => void;
}) {
  const { surfaces } = useThemeStyles();
  return (
    <View style={surfaces.segmented}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={active ? surfaces.segmentedTabActive : surfaces.segmentedTab}
          >
            <SegmentedTabLabel active={active}>{t.label}</SegmentedTabLabel>
          </Pressable>
        );
      })}
    </View>
  );
}
