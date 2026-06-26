import { View } from 'react-native';
import { Pressable } from './primitives';
import { cn } from '@/lib/cn';

/** iOS-style switch (mirrors the wireframe toggle). */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} className={cn('h-7 w-12 rounded-full', on ? 'bg-success' : 'bg-foreground/15')}>
      <View
        className="absolute top-0.5 h-6 w-6 rounded-full bg-background"
        style={{ left: on ? 22 : 2 }}
      />
    </Pressable>
  );
}
