import { Segmented } from '@/components/ui/Segmented';
import { usePlayerProfileData } from '@/lib/use-player-sleeper-stats';
import type { PlayerSeasonKey } from '@/lib/player-season';

export function PlayerSeasonPicker() {
  const { seasonKey, setSeasonKey, seasonOptions } = usePlayerProfileData();

  if (seasonOptions.length < 2) return null;

  return (
    <Segmented
      value={seasonKey}
      onChange={(value) => setSeasonKey(value as PlayerSeasonKey)}
      tabs={seasonOptions.map((option) => ({
        key: option.key,
        label: option.label,
      }))}
    />
  );
}
