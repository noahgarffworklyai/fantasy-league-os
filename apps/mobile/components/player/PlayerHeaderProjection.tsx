import { Text } from '@/components/ui/primitives';
import { usePlayerProfileData } from '@/lib/use-player-sleeper-stats';
import { formatProj } from '@/lib/players-api';

export function PlayerHeaderProjection({
  fallback,
  size = 'lg',
}: {
  fallback?: number;
  size?: 'lg' | 'md';
}) {
  const { data, isLoading } = usePlayerProfileData();
  const value = data?.weekProj ?? fallback;
  const textVariant = size === 'lg' ? 'scoreLG' : 'bodySm';

  return (
    <Text
      variant={textVariant}
      style={size === 'lg' ? { fontSize: 26, fontVariant: ['tabular-nums'] } : { fontVariant: ['tabular-nums'] }}
    >
      {isLoading && value == null ? '…' : value != null ? formatProj(value) : '—'}
    </Text>
  );
}
