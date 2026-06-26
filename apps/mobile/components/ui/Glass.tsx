import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';

type Props = ViewProps & {
  className?: string;
  intensity?: number;
  children?: ReactNode;
};

/** Liquid-glass surface: translucent blurred background (mirrors `.glass`). */
export function Glass({ className, intensity = 40, children, style, ...rest }: Props) {
  const { scheme } = useTheme();
  return (
    <BlurView
      intensity={intensity}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      experimentalBlurMethod="dimezisBlurView"
      style={style}
      {...rest}
    >
      <View className={cn('bg-background/60', className)}>{children}</View>
    </BlurView>
  );
}
