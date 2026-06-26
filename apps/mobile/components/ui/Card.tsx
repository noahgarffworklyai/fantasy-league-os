import { type ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/cn';

/** Rounded elevated surface card (mirrors the wireframe `Card`). */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('overflow-hidden rounded-[30px] bg-surface-elevated', className)}>
      {children}
    </View>
  );
}

/** A horizontal hairline divider (mirrors `hairline-t`). */
export function Divider({ className }: { className?: string }) {
  return <View className={cn('h-px bg-hairline', className)} />;
}
