import { TextInput, type TextInputProps } from 'react-native';
import { useColors, useHex, useThemeStyles } from '@/lib/theme';

type Props = TextInputProps & { className?: string };

/** Themed text input matching the wireframe field style. */
export function Input({ className, style, ...props }: Props) {
  const c = useColors();
  const hex = useHex();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      className={className}
      style={[
        {
          height: 56,
          width: '100%',
          borderRadius: 16,
          backgroundColor: hex.surfaceElevated,
          paddingHorizontal: 16,
          fontSize: 17,
          letterSpacing: -0.2,
          color: hex.foreground,
        },
        style,
      ]}
      {...props}
    />
  );
}

/** Compact search input for player lists. */
export function SearchInput(props: TextInputProps) {
  const c = useColors();
  const hex = useHex();
  const { type } = useThemeStyles();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      style={[type.body, { flex: 1, padding: 0, margin: 0, color: hex.foreground }]}
      {...props}
    />
  );
}
