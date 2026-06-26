import type { LucideIcon } from 'lucide-react-native';
import { useColors } from '@/lib/theme';

type Props = {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Renders a lucide icon defaulting to the themed foreground color. */
export function Icon({ icon: LucideComp, size = 20, color, strokeWidth = 2 }: Props) {
  const c = useColors();
  return <LucideComp size={size} color={color ?? c.foreground} strokeWidth={strokeWidth} />;
}
