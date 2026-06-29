import {
  Text as RNText,
  View as RNView,
  ScrollView as RNScrollView,
  type TextProps as RNTextProps,
  type ViewProps as RNViewProps,
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
} from 'react-native';
import { cn } from '@/lib/cn';
import { useHex, useThemeStyles } from '@/lib/theme';
import { type TextVariant } from '@/lib/tokens';

export type { TextVariant };

/** Text with wireframe typography variants + guaranteed color on first paint. */
export function Text({
  className,
  style,
  variant,
  muted,
  ...props
}: RNTextProps & { className?: string; variant?: TextVariant; muted?: boolean }) {
  const hex = useHex();
  const { type } = useThemeStyles();
  return (
    <RNText
      className={cn('text-foreground', className)}
      style={[
        { color: muted ? hex.mutedForeground : hex.foreground },
        variant ? type[variant] : null,
        style,
      ]}
      {...props}
    />
  );
}

export function View({ className, style, ...props }: RNViewProps & { className?: string }) {
  return <RNView className={className} style={style} {...props} />;
}

export function ScrollView({
  className,
  style,
  ...props
}: React.ComponentProps<typeof RNScrollView> & { className?: string }) {
  return <RNScrollView className={className} style={style} {...props} />;
}

type PressProps = Omit<RNPressableProps, 'className'> & {
  className?: string;
  activeClassName?: string;
};

/** Pressable with className support and a subtle pressed opacity. */
export function Pressable({ className, style, ...props }: PressProps) {
  return (
    <RNPressable
      className={className}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed ? { opacity: 0.6 } : null,
      ]}
      {...props}
    />
  );
}
