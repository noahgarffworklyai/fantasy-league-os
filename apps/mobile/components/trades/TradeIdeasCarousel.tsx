import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { playerAvatar } from '@/lib/avatars';
import type { EnrichedTradeIdea, EnrichedTradeIdeaPlayer } from '@/lib/trade-ideas-api';
import { useColors, useHex, useTheme, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

const TRADE_CARD_HEIGHT = 380;
const PLAYER_SLOT_HEIGHT = 136;
const HEADER_GAP = 18;
const SECTION_GAP = 18;

function borderForTone(tone: EnrichedTradeIdea['tone'], ink: string) {
  switch (tone) {
    case 'success':
      return 'rgba(40,189,95,0.35)';
    case 'warning':
      return 'rgba(242,177,13,0.4)';
    default:
      return `rgba(${ink},0.1)`;
  }
}

function TradePlayerColumn({
  player,
  compact,
}: {
  player: EnrichedTradeIdeaPlayer;
  compact?: boolean;
}) {
  const c = useColors();
  const colWidth = compact ? 68 : 80;
  const avatarSize = compact ? 44 : 52;

  return (
    <View style={{ width: colWidth, height: PLAYER_SLOT_HEIGHT, alignItems: 'center', justifyContent: 'flex-start' }}>
      <AvatarImage
        src={playerAvatar({
          playerId: player.id,
          name: player.name,
          team: player.team,
          imageUrl: player.imageUrl,
        })}
        name={player.name}
        size={avatarSize}
      />
      <Text
        variant="caption"
        numberOfLines={1}
        style={{ textAlign: 'center', marginTop: 6, width: colWidth }}
      >
        {player.name}
      </Text>
      <Text
        variant="caption"
        muted
        numberOfLines={1}
        style={{ textAlign: 'center', marginTop: 2, width: colWidth }}
      >
        {player.posRankLabel}
      </Text>
      <View style={{ marginTop: 8, width: colWidth, alignItems: 'center' }}>
        <Text
          variant="scoreLG"
          style={{ fontSize: 17, fontVariant: ['tabular-nums'], textAlign: 'center' }}
        >
          {player.tradeValue}
        </Text>
        <Text
          variant="eyebrow"
          style={{ fontSize: 9, color: c.mutedForeground, textAlign: 'center', marginTop: 2 }}
        >
          value
        </Text>
      </View>
    </View>
  );
}

function TradeIdeaCard({
  idea,
  onPropose,
}: {
  idea: EnrichedTradeIdea;
  onPropose?: (idea: EnrichedTradeIdea) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const c = useColors();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const totalPlayers = idea.give.length + idea.receive.length;
  const compact = totalPlayers >= 4;
  const playerGap = compact ? 4 : 8;

  return (
    <View
      style={[
        surfaces.aiCard,
        {
          height: TRADE_CARD_HEIGHT,
          borderColor: borderForTone(idea.tone, ink),
          paddingVertical: 20,
          paddingBottom: 54,
          paddingHorizontal: 18,
        },
      ]}
    >
      <View style={{ marginBottom: HEADER_GAP }}>
        <View style={[layout.rowBetween, { alignItems: 'center' }]}>
          <Text
            variant="bodySm"
            numberOfLines={1}
            style={{
              flex: 1,
              paddingRight: 12,
              fontWeight: '700',
            }}
          >
            {idea.title}
          </Text>

          <Text
            variant="bodySm"
            muted
            numberOfLines={1}
            style={{ textAlign: 'right', flexShrink: 0, fontWeight: '400' }}
          >
            To: {idea.manager.username}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', marginBottom: SECTION_GAP }}>
        <View style={[layout.row, { alignItems: 'flex-end', justifyContent: 'center' }]}>
          <View style={{ alignItems: 'center' }}>
            <Text
              variant="pill"
              style={{ color: hex.mutedForeground, letterSpacing: 1.5, marginBottom: SECTION_GAP }}
            >
              You give
            </Text>
            <View style={[layout.row, { gap: playerGap }]}>
              {idea.give.map((player) => (
                <TradePlayerColumn key={player.id} player={player} compact={compact} />
              ))}
            </View>
          </View>

          <View
            style={{
              height: PLAYER_SLOT_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 6,
            }}
          >
            <Text variant="eyebrow" muted>
              →
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text
              variant="pill"
              style={{ color: hex.success, letterSpacing: 1.5, marginBottom: SECTION_GAP }}
            >
              You get
            </Text>
            <View style={[layout.row, { gap: playerGap }]}>
              {idea.receive.map((player) => (
                <TradePlayerColumn key={player.id} player={player} compact={compact} />
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={{ gap: spacing.section }}>
        <Text variant="bodySm" numberOfLines={3} style={{ lineHeight: 22, textAlign: 'center' }}>
          {idea.headline}
        </Text>

        {onPropose ? (
          <Pressable
            onPress={() => onPropose(idea)}
            style={[
              surfaces.aiButton,
              surfaces.aiButtonSecondary,
              {
                marginTop: 0,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: `rgba(${ink},0.12)`,
              },
            ]}
          >
            <Text variant="button">Propose in Sleeper</Text>
            <ArrowUpRight size={14} color={c.foreground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function TradeIdeasCarousel({
  ideas,
  isLoading,
  onPropose,
}: {
  ideas: EnrichedTradeIdea[];
  isLoading?: boolean;
  onPropose?: (idea: EnrichedTradeIdea) => void;
}) {
  const hex = useHex();
  const { layout } = useThemeTokens();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<ScrollView | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (idx !== active) setActive(idx);
  };

  if (isLoading) {
    return (
      <View
        style={[
          layout.centered,
          {
            height: TRADE_CARD_HEIGHT,
            borderRadius: 30,
            backgroundColor: hex.surfaceElevated,
          },
        ]}
      >
        <ActivityIndicator color={hex.mutedForeground} />
      </View>
    );
  }

  if (ideas.length === 0) {
    return (
      <View
        style={{
          height: TRADE_CARD_HEIGHT,
          borderRadius: 30,
          backgroundColor: hex.surfaceElevated,
          padding: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyMuted">No trade ideas right now.</Text>
      </View>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      <ScrollView
        ref={scrollerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        style={{ height: TRADE_CARD_HEIGHT }}
      >
        {ideas.map((idea) => (
          <View key={idea.id} style={{ width: cardW, height: TRADE_CARD_HEIGHT }}>
            <TradeIdeaCard idea={idea} onPropose={onPropose} />
          </View>
        ))}
      </ScrollView>

      {ideas.length > 1 ? (
        <View
          style={[
            layout.row,
            layout.centered,
            {
              position: 'absolute',
              bottom: 12,
              alignSelf: 'center',
              gap: 6,
              borderRadius: 9999,
              backgroundColor: 'rgba(0,0,0,0.12)',
              paddingHorizontal: 10,
              paddingVertical: 7,
            },
          ]}
        >
          {ideas.map((idea, i) => (
            <Pressable
              key={idea.id}
              onPress={() => {
                setActive(i);
                scrollerRef.current?.scrollTo({ x: i * cardW, animated: true });
              }}
            >
              <View
                style={{
                  height: 6,
                  borderRadius: 9999,
                  width: i === active ? 20 : 6,
                  backgroundColor: i === active ? hex.foreground : 'rgba(99,99,99,0.4)',
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
