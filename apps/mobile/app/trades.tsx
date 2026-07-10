import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from '@/components/ui/primitives';
import { PageIntro } from '@/components/ui/PageIntro';
import { BOTTOM_BAR_SPACE } from '@/components/ui/WorkflowShell';
import { useLeague } from '@/lib/league-context';
import { useHex, useThemeTokens } from '@/lib/theme';
import { PlayerSheet, TradePane, type PlayerDetail } from './team';

const TOP_CHROME_HEIGHT = 44;

export default function TradesPage() {
  const { active } = useLeague();
  const { layout } = useThemeTokens();
  const hex = useHex();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const savedScrollY = useRef(0);
  const [searchActive, setSearchActive] = useState(false);
  const [machineSearchActive, setMachineSearchActive] = useState(false);
  const [tradeSubView, setTradeSubView] = useState(false);
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const isSynced = active?.type === 'synced';
  const keyboardActive = searchActive || machineSearchActive;

  const topChromeOffset = Math.max(insets.top, 12) + TOP_CHROME_HEIGHT;

  const handleSearchFocusChange = useCallback((focused: boolean) => {
    if (focused) {
      savedScrollY.current = scrollY.current;
      setSearchActive(true);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
      return;
    }

    setSearchActive(false);
    const restoreY = savedScrollY.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: restoreY, animated: false });
      });
    });
  }, []);

  const handleMachineSearchFocusChange = useCallback((focused: boolean) => {
    if (focused) {
      savedScrollY.current = scrollY.current;
      setMachineSearchActive(true);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
      return;
    }

    setMachineSearchActive(false);
    const restoreY = savedScrollY.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: restoreY, animated: false });
      });
    });
  }, []);

  if (!active) return null;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: hex.background }}
        behavior={keyboardActive ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
        keyboardVerticalOffset={topChromeOffset}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: hex.background }}
          contentContainerStyle={[
            { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom },
            keyboardActive && { flexGrow: 1 },
          ]}
          scrollEnabled={!keyboardActive}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
        >
          <View style={[layout.screen, keyboardActive && { flex: 1 }]}>
            {!keyboardActive && !tradeSubView ? <PageIntro title="Trades" /> : null}
            <TradePane
              synced={isSynced}
              platform={active.platform}
              leagueId={active.id}
              onPlayer={setPlayer}
              searchActive={searchActive}
              onSearchFocusChange={handleSearchFocusChange}
              onMachineSearchFocusChange={handleMachineSearchFocusChange}
              onSubViewChange={setTradeSubView}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PlayerSheet
        player={player}
        onClose={() => setPlayer(null)}
        synced={isSynced}
        platform={active.platform}
      />
    </>
  );
}
