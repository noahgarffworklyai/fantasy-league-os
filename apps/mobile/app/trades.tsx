import { useState } from 'react';
import { View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { PageIntro } from '@/components/ui/PageIntro';
import { useLeague } from '@/lib/league-context';
import { useThemeTokens } from '@/lib/theme';
import { PlayerSheet, TradePane, type PlayerDetail } from './team';

export default function TradesPage() {
  const { active } = useLeague();
  const { layout } = useThemeTokens();
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const isSynced = active?.type === 'synced';

  if (!active) return null;

  return (
    <Screen>
      <View style={layout.screen}>
        <PageIntro title="Trades" />
        <TradePane synced={isSynced} platform={active.platform} leagueId={active.id} onPlayer={setPlayer} />
      </View>
      <PlayerSheet
        player={player}
        onClose={() => setPlayer(null)}
        synced={isSynced}
        platform={active.platform}
      />
    </Screen>
  );
}
