import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { playerAvatar } from '@/lib/avatars';
import type { TradeAsset } from '@/lib/trade-players-api';
import { useColors, useHex, useThemeTokens } from '@/lib/theme';

const CARD_WIDTH = 108;
const CARD_GAP = 10;

function MyPlayerCard({
  player,
  selected,
  onToggle,
}: {
  player: TradeAsset;
  selected: boolean;
  onToggle: () => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();

  return (
    <Pressable onPress={onToggle} style={{ width: CARD_WIDTH }}>
      <View
        style={[
          surfaces.roundedCard,
          {
            paddingHorizontal: 8,
            paddingTop: 8,
            paddingBottom: 8,
            borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
            borderColor: selected ? hex.danger : hex.hairline,
            backgroundColor: selected ? 'rgba(255,80,80,0.08)' : hex.surfaceElevated,
            alignItems: 'center',
            gap: 6,
          },
        ]}
      >
        <View style={{ position: 'relative' }}>
          <AvatarImage
            src={playerAvatar({
              playerId: player.id,
              name: player.name,
              team: player.team,
              imageUrl: player.imageUrl,
            })}
            name={player.name}
            size={44}
          />
          {selected ? (
            <View
              style={{
                position: 'absolute',
                right: -3,
                bottom: -3,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: hex.danger,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: hex.background,
              }}
            >
              <Check size={10} color={hex.background} strokeWidth={3} />
            </View>
          ) : null}
        </View>

        <View style={{ alignItems: 'center', width: '100%', gap: 2 }}>
          <Text variant="caption" numberOfLines={1} style={{ fontWeight: '600', width: '100%', textAlign: 'center' }}>
            {player.name}
          </Text>
          <Text variant="eyebrow" muted numberOfLines={1} style={{ fontSize: 8 }}>
            {player.posRank > 0 ? `${player.pos} ${player.posRank}` : player.pos}
          </Text>
          <Text variant="eyebrow" numberOfLines={1} style={{ fontSize: 8, fontVariant: ['tabular-nums'] }}>
            Val {player.tradeValue || 0}
          </Text>
        </View>

        <View
          style={[
            {
              width: 32,
              height: 32,
              marginTop: 2,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? hex.danger : hex.background,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: selected ? hex.danger : hex.hairline,
            },
          ]}
        >
          {selected ? (
            <Check size={14} color={hex.background} strokeWidth={2.5} />
          ) : (
            <Plus size={14} color={c.foreground} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function TradeMachineMyPlayersCarousel({
  players,
  selectedIds,
  onToggle,
}: {
  players: TradeAsset[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const hex = useHex();
  const { layout } = useThemeTokens();
  const { width } = useWindowDimensions();

  if (players.length === 0) {
    return (
      <View
        style={[
          layout.centered,
          {
            minHeight: 100,
            borderRadius: 20,
            backgroundColor: hex.surfaceElevated,
          },
        ]}
      >
        <Text variant="bodyMuted">No roster players available.</Text>
      </View>
    );
  }

  const fitsInRow = players.length * (CARD_WIDTH + CARD_GAP) <= width - 32;

  if (fitsInRow) {
    return (
      <View style={[layout.rowWrap, { gap: CARD_GAP }]}>
        {players.map((player) => (
          <MyPlayerCard
            key={player.id}
            player={player}
            selected={selectedIds.includes(player.id)}
            onToggle={() => onToggle(player.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: CARD_GAP, paddingRight: 4 }}
      decelerationRate="fast"
    >
      {players.map((player) => (
        <MyPlayerCard
          key={player.id}
          player={player}
          selected={selectedIds.includes(player.id)}
          onToggle={() => onToggle(player.id)}
        />
      ))}
    </ScrollView>
  );
}
