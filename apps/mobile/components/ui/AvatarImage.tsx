import { useState, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import { Text } from './primitives';
import { initialsOf } from '@/lib/avatars';
import { useHex, useTheme } from '@/lib/theme';

type Props = {
  src: string;
  name: string;
  /** Diameter in px (default 40). */
  size?: number;
  badge?: ReactNode;
};

/**
 * Circular avatar image with graceful fallback to initials if the
 * remote image fails to load.
 */
export function AvatarImage({ src, name, size = 40, badge }: Props) {
  const hex = useHex();
  const { scheme } = useTheme();
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';

  return (
    <View style={[{ position: 'relative', flexShrink: 0 }, dim]}>
      {failed ? (
        <View
          style={[
            dim,
            {
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `rgba(${ink},0.1)`,
            },
          ]}
        >
          <Text variant="caption" style={{ color: `rgba(${ink},0.8)` }}>
            {initialsOf(name)}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: src }}
          onError={() => setFailed(true)}
          style={[dim, { backgroundColor: `rgba(${ink},0.05)` }]}
          resizeMode="cover"
        />
      )}
      {badge ? <View style={{ position: 'absolute', bottom: -4, right: -4 }}>{badge}</View> : null}
    </View>
  );
}
