import { useState, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import { Text } from './primitives';
import { initialsOf } from '@/lib/avatars';
import { cn } from '@/lib/cn';

type Props = {
  src: string;
  name: string;
  /** Tailwind size classes for the container, e.g. "h-10 w-10". */
  className?: string;
  badge?: ReactNode;
};

/**
 * Circular avatar image with graceful fallback to initials if the
 * remote image fails to load.
 */
export function AvatarImage({ src, name, className = 'h-10 w-10', badge }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <View className={cn('relative shrink-0', className)}>
      {failed ? (
        <View className="h-full w-full items-center justify-center rounded-full bg-foreground/10">
          <Text className="text-[11px] font-semibold tracking-tightish text-foreground/80">
            {initialsOf(name)}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: src }}
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full bg-foreground/5"
          resizeMode="cover"
        />
      )}
      {badge && <View className="absolute -bottom-1 -right-1">{badge}</View>}
    </View>
  );
}
