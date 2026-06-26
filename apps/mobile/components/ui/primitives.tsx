import {
  Text as RNText,
  type TextProps as RNTextProps,
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
} from 'react-native';
import { cn } from '@/lib/cn';

export { View } from 'react-native';
export { ScrollView } from 'react-native';

/** Text that defaults to the themed foreground color + system font. */
export function Text({ className, ...props }: RNTextProps & { className?: string }) {
  return <RNText className={cn('text-foreground', className)} {...props} />;
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
