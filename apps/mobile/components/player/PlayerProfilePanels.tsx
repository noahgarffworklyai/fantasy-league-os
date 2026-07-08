import { View } from 'react-native';
import { PlayerHealthPanel } from '@/components/player/PlayerHealthPanel';
import { PlayerOverviewPanel, type PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { PlayerPerformancePanel } from '@/components/player/PlayerPerformancePanel';
import { PlayerProfileTabs, type PlayerProfileTab } from '@/components/player/PlayerProfileTabs';
import { PlayerSeasonPicker } from '@/components/player/PlayerSeasonPicker';
import { PlayerProfileDataProvider } from '@/lib/use-player-sleeper-stats';
import { spacing } from '@/lib/tokens';

export function PlayerProfilePanelContent({
  player,
  tab,
  onTabChange,
}: {
  player: PlayerProfileContext;
  tab: PlayerProfileTab;
  onTabChange: (tab: PlayerProfileTab) => void;
}) {
  return (
    <>
      <View style={{ marginTop: 16 }}>
        <PlayerProfileTabs value={tab} onChange={onTabChange} />
      </View>

      <View style={{ marginTop: spacing.section }}>
        <PlayerSeasonPicker />
      </View>

      <View style={{ marginTop: spacing.section }}>
        {tab === 'overview' ? <PlayerOverviewPanel player={player} /> : null}
        {tab === 'performance' ? <PlayerPerformancePanel player={player} /> : null}
        {tab === 'health' ? <PlayerHealthPanel player={player} /> : null}
      </View>
    </>
  );
}

export function PlayerProfilePanels({
  player,
  tab,
  onTabChange,
}: {
  player: PlayerProfileContext;
  tab: PlayerProfileTab;
  onTabChange: (tab: PlayerProfileTab) => void;
}) {
  return (
    <PlayerProfileDataProvider
      playerId={player.id}
      context={{
        name: player.name,
        pos: player.pos,
        team: player.team,
        opp: player.opp,
        status: player.status,
        note: player.note,
      }}
    >
      <PlayerProfilePanelContent player={player} tab={tab} onTabChange={onTabChange} />
    </PlayerProfileDataProvider>
  );
}
