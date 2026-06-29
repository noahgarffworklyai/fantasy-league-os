import { Pressable, Text, View } from './primitives';
import { useHex, useThemeStyles } from '@/lib/theme';

export type SegmentedTab<K extends string> = { key: K; label: string };

export function Segmented<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: SegmentedTab<K>[];
  value: K;
  onChange: (k: K) => void;
}) {
  const hex = useHex();
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
            <Text
              variant="tab"
              style={{
                color: active ? hex.primaryForeground : hex.mutedForeground,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
