import { View } from 'react-native';
import { Pressable, Text } from './primitives';
import { cn } from '@/lib/cn';

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
  return (
    <View className="flex-row rounded-full border border-border bg-surface-elevated p-1">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className={cn('flex-1 rounded-full py-2', active ? 'bg-primary' : '')}
          >
            <Text
              className={cn(
                'text-center text-[13px] font-semibold tracking-tightish',
                active ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
