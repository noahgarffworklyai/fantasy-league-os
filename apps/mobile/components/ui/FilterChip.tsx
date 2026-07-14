import { Pressable, Text } from './primitives';
import { useHex, useThemeStyles } from '@/lib/theme';

export function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const hex = useHex();
  const { surfaces } = useThemeStyles();

  return (
    <Pressable
      onPress={onPress}
      style={[surfaces.filterChip, active ? surfaces.filterChipActive : null]}
    >
      <Text variant="tab" style={{ color: active ? hex.primaryForeground : hex.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  );
}
