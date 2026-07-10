import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Card } from '@/components/ui/Card';
import { CommissionerInsightsCard } from '@/components/player/CommissionerInsightsCard';
import { BackButton } from '@/components/ui/BackButton';
import { TradeMachineMyPlayersCarousel } from '@/components/trades/TradeMachineMyPlayersCarousel';
import { TradeMachineReceivePicker } from '@/components/trades/TradeMachineReceivePicker';
import { TradeOutcomeScale } from '@/components/trades/TradeOutcomeScale';
import { playerAvatar } from '@/lib/avatars';
import { evaluateTradeMachine } from '@/lib/trade-machine-evaluation';
import type { TradeAsset } from '@/lib/trade-players-api';
import { useTheme, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

function TradeSideColumn({
  title,
  players,
  accent,
  emptyLabel,
}: {
  title: string;
  players: TradeAsset[];
  accent: string;
  emptyLabel: string;
}) {
  const { hex, layout } = useThemeTokens();

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text variant="eyebrow" style={{ color: accent, letterSpacing: 1.1 }}>
        {title}
      </Text>
      {players.length === 0 ? (
        <Text variant="bodyMuted" style={{ fontSize: 12 }}>
          {emptyLabel}
        </Text>
      ) : (
        players.map((player) => (
          <View key={player.id} style={[layout.row, { gap: 8, alignItems: 'center' }]}>
            <AvatarImage
              src={playerAvatar({
                playerId: player.id,
                name: player.name,
                team: player.team,
                imageUrl: player.imageUrl,
              })}
              name={player.name}
              size={34}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodySm" numberOfLines={1}>
                {player.name}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {player.pos} · {player.posRankLabel}
              </Text>
            </View>
            <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
              {player.tradeValue || 0}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function TradeMachinePane({
  leagueId,
  myPlayers,
  onBack,
  onSearchFocusChange,
}: {
  leagueId?: string;
  myPlayers: TradeAsset[];
  onBack: () => void;
  onSearchFocusChange?: (focused: boolean) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const [give, setGive] = useState<string[]>([]);
  const [receiveAssets, setReceiveAssets] = useState<Map<string, TradeAsset>>(new Map());
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [pickerSearchActive, setPickerSearchActive] = useState(false);

  const myPlayerIds = useMemo(() => new Set(myPlayers.map((p) => p.id)), [myPlayers]);

  const givePlayers = useMemo(
    () => myPlayers.filter((p) => give.includes(p.id)),
    [myPlayers, give],
  );
  const receivePlayers = useMemo(() => Array.from(receiveAssets.values()), [receiveAssets]);
  const receive = useMemo(() => receivePlayers.map((p) => p.id), [receivePlayers]);

  const evaluation = useMemo(
    () =>
      evaluateTradeMachine({
        give: givePlayers,
        receive: receivePlayers,
        myRoster: myPlayers,
      }),
    [givePlayers, receivePlayers, myPlayers],
  );

  const mockTradeReady = give.length > 0 && receive.length > 0;

  const toggleGive = (id: string) => {
    setScoreSubmitted(false);
    setGive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleReceive = (player: TradeAsset) => {
    setScoreSubmitted(false);
    setReceiveAssets((prev) => {
      const next = new Map(prev);
      if (next.has(player.id)) next.delete(player.id);
      else next.set(player.id, player);
      return next;
    });
  };

  const handlePickerSearchFocus = (focused: boolean) => {
    setPickerSearchActive(focused);
    onSearchFocusChange?.(focused);
  };

  return (
    <View style={[layout.sectionBlock, pickerSearchActive && { flex: 1 }]}>
      <BackButton onPress={onBack} />

      {pickerSearchActive ? null : (
        <View style={{ gap: spacing.section }}>
          <Card>
            <View style={{ padding: 16, gap: 14 }}>
              <TradeOutcomeScale
                score={evaluation.score}
                verdict={evaluation.verdict}
                verdictLabel={evaluation.verdictLabel}
              />
            </View>
          </Card>

          <Card>
            <View style={{ padding: 16 }}>
              <Text variant="eyebrow" style={{ marginBottom: 12, letterSpacing: 1.2 }}>
                Trade breakdown
              </Text>
              <View style={[layout.row, { gap: 16, alignItems: 'flex-start' }]}>
                <TradeSideColumn
                  title="You send"
                  players={givePlayers}
                  accent={hex.danger}
                  emptyLabel="Swipe your roster and tap to trade away."
                />
                <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: hex.hairline }} />
                <TradeSideColumn
                  title="You receive"
                  players={receivePlayers}
                  accent={hex.success}
                  emptyLabel="Search the pool below to trade for players."
                />
              </View>

              {mockTradeReady && !scoreSubmitted ? (
                <Pressable
                  onPress={() => setScoreSubmitted(true)}
                  style={[
                    surfaces.aiButton,
                    surfaces.aiButtonSecondary,
                    {
                      marginTop: 16,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: `rgba(${ink},0.12)`,
                    },
                  ]}
                >
                  <Text variant="button">Score trade</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>

          {scoreSubmitted && mockTradeReady ? (
            <CommissionerInsightsCard paragraphs={evaluation.paragraphs} bullets={evaluation.bullets} />
          ) : null}

          <View style={{ gap: 10 }}>
            <Text variant="eyebrow" style={{ paddingHorizontal: 4, letterSpacing: 1.2 }}>
              Trade away
            </Text>
            <TradeMachineMyPlayersCarousel
              players={myPlayers}
              selectedIds={give}
              onToggle={toggleGive}
            />
          </View>
        </View>
      )}

      {leagueId ? (
        <TradeMachineReceivePicker
          leagueId={leagueId}
          excludeIds={myPlayerIds}
          selectedIds={receive}
          selectedAssets={receiveAssets}
          onToggle={toggleReceive}
          searchMode={pickerSearchActive}
          onSearchFocusChange={handlePickerSearchFocus}
        />
      ) : (
        <Card>
          <View style={{ padding: 16 }}>
            <Text variant="bodyMuted">Connect a league to search the Sleeper player pool.</Text>
          </View>
        </Card>
      )}
    </View>
  );
}
