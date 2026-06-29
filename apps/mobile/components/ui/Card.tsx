import { type ReactNode } from 'react';
import { View } from './primitives';
import { useThemeStyles } from '@/lib/theme';

/** Rounded elevated surface card (mirrors the wireframe `Card`). */
export function Card({ children }: { children: ReactNode; className?: string }) {
  const { surfaces } = useThemeStyles();
  return <View style={surfaces.card}>{children}</View>;
}

/** A horizontal hairline divider (mirrors `hairline-t`). */
export function Divider() {
  const { surfaces } = useThemeStyles();
  return <View style={surfaces.hairline} />;
}
