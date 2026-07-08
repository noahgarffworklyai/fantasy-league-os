import { Segmented } from '@/components/ui/Segmented';

export const PLAYER_PROFILE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'performance', label: 'Performance' },
  { key: 'health', label: 'Health' },
] as const;

export type PlayerProfileTab = (typeof PLAYER_PROFILE_TABS)[number]['key'];

export function PlayerProfileTabs({
  value,
  onChange,
}: {
  value: PlayerProfileTab;
  onChange: (tab: PlayerProfileTab) => void;
}) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      tabs={[...PLAYER_PROFILE_TABS]}
    />
  );
}
