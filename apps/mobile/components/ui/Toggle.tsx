import { View } from 'react-native';
import { Pressable } from './primitives';
import { useHex, useTheme } from '@/lib/theme';

/** iOS-style switch (mirrors the wireframe toggle). */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const hex = useHex();
  const { scheme } = useTheme();
  const trackOff = scheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(13,13,13,0.15)';
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={{
        height: 28,
        width: 48,
        borderRadius: 9999,
        backgroundColor: on ? hex.success : trackOff,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 2,
          height: 24,
          width: 24,
          borderRadius: 9999,
          backgroundColor: hex.surfaceElevated,
          left: on ? 22 : 2,
        }}
      />
    </Pressable>
  );
}
