import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './primitives';
import { initialsOf } from '@/lib/avatars';
import { useHex } from '@/lib/theme';

type Props = {
  src?: string | null;
  name: string;
  /** Diameter in px (default 40). */
  size?: number;
  badge?: ReactNode;
};

/**
 * Circular avatar image with graceful fallback to initials if no image
 * is provided or the remote image fails to load.
 */
export function AvatarImage({ src, name, size = 40, badge }: Props) {
  const hex = useHex();
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size, borderRadius: size / 2 };
  const showFallback = !src || failed;

  return (
    <View style={[{ position: 'relative', flexShrink: 0 }, dim]}>
      {showFallback ? (
        <View
          style={[
            dim,
            {
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hex.muted,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.hairline,
            },
          ]}
        >
          <Text variant="caption" style={{ color: hex.mutedForeground, fontWeight: '600' }}>
            {initialsOf(name)}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: src }}
          onError={() => setFailed(true)}
          style={[dim, { backgroundColor: hex.muted, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}
          resizeMode="cover"
        />
      )}
      {badge ? <View style={{ position: 'absolute', bottom: -4, right: -4 }}>{badge}</View> : null}
    </View>
  );
}
