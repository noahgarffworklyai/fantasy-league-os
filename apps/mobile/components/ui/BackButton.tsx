import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useColors, useHex, useThemeTokens } from '@/lib/theme';

export function BackButton({
  onPress,
  variant = 'success',
}: {
  onPress: () => void;
  variant?: 'success' | 'muted';
}) {
  const hex = useHex();
  const c = useColors();
  const { layout } = useThemeTokens();
  const color = variant === 'success' ? hex.success : c.mutedForeground;

  return (
    <Pressable
      onPress={onPress}
      style={[layout.row, { gap: 4, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'flex-start' }]}
    >
      <ChevronLeft size={16} color={color} />
      <Text variant="bodySm" style={{ color }}>
        Back
      </Text>
    </Pressable>
  );
}
