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
import { CommissionerInsightsCard as CommissionerInsightsPanel } from '@/components/player/CommissionerInsightsCard';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { playerAvatar } from '@/lib/avatars';
import { formatProj } from '@/lib/players-api';
import type { PriorityInsight, PriorityPlayer } from '@/lib/start-sit';
import { useStartSitRecommendations } from '@/lib/use-start-sit';
import { useColors, useHex, useTheme, useThemeTokens } from '@/lib/theme';

const INSIGHT_CARD_HEIGHT = 380;

function borderForTone(tone: PriorityInsight['tone'], ink: string) {
  switch (tone) {
    case 'success':
      return 'rgba(40,189,95,0.35)';
    case 'warning':
      return 'rgba(242,177,13,0.4)';
    case 'danger':
      return 'rgba(238,55,52,0.4)';
    default:
      return `rgba(${ink},0.1)`;
  }
}

function InsightCardShell({
  insight,
  onAction,
  children,
}: {
  insight: PriorityInsight;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const c = useColors();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';

  return (
    <View
      style={[
        surfaces.aiCard,
        {
          height: INSIGHT_CARD_HEIGHT,
          borderColor: borderForTone(insight.tone, ink),
          paddingVertical: 20,
          paddingBottom: 54,
          paddingHorizontal: 18,
        },
      ]}
    >
      <Text variant="pill" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
        {insight.title}
      </Text>

      <View style={{ flex: 1, justifyContent: 'center', marginVertical: 12 }}>{children}</View>

      <View style={{ gap: 14 }}>
        <Text variant="bodySm" style={{ lineHeight: 22, textAlign: 'center' }}>
          {insight.headline}
        </Text>

        {onAction ? (
          <Pressable
            onPress={onAction}
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
            <Text variant="button">Open in Sleeper</Text>
            <ArrowUpRight size={14} color={c.foreground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PlayerCompareBlock({
  left,
  right,
  leftLabel,
  rightLabel,
  leftAccent,
  rightAccent,
}: {
  left: PriorityPlayer;
  right: PriorityPlayer;
  leftLabel: string;
  rightLabel: string;
  leftAccent: string;
  rightAccent: string;
}) {
  const { layout } = useThemeTokens();
  const avatarSize = 72;

  const renderStats = (player: PriorityPlayer, align: 'left' | 'right') => {
    if (player.statLabel && player.statValue) {
      return (
        <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 2 }}>
          <Text variant="scoreLG" style={{ fontSize: 20, fontVariant: ['tabular-nums'] }}>
            {player.statValue}
          </Text>
          <Text variant="eyebrow" muted>
            {player.statLabel}
          </Text>
        </View>
      );
    }
    if (player.projectedPoints != null) {
      return (
        <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 2 }}>
          <Text variant="scoreLG" style={{ fontSize: 22, fontVariant: ['tabular-nums'] }}>
            {formatProj(player.projectedPoints)}
          </Text>
          <Text variant="eyebrow" muted>
            proj pts
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={layout.rowBetween}>
        <Text variant="pill" style={{ color: leftAccent, letterSpacing: 1.5 }}>
          {leftLabel}
        </Text>
        <Text variant="pill" style={{ color: rightAccent, letterSpacing: 1.5 }}>
          {rightLabel}
        </Text>
      </View>

      <View style={[layout.row, { alignItems: 'center' }]}>
        <View style={[layout.flex1, { alignItems: 'flex-start' }]}>
          <AvatarImage
            src={playerAvatar({
              playerId: left.id,
              name: left.name,
              team: left.team,
              imageUrl: left.imageUrl,
            })}
            name={left.name}
            size={avatarSize}
          />
        </View>
        <Text variant="eyebrow" muted style={{ paddingHorizontal: 6 }}>
          vs
        </Text>
        <View style={[layout.flex1, { alignItems: 'flex-end' }]}>
          <AvatarImage
            src={playerAvatar({
              playerId: right.id,
              name: right.name,
              team: right.team,
              imageUrl: right.imageUrl,
            })}
            name={right.name}
            size={avatarSize}
          />
        </View>
      </View>

      <View style={layout.rowBetween}>
        <Text variant="bodySm" numberOfLines={1} style={{ maxWidth: 120 }}>
          {left.name.split(' ').slice(-1)[0]}
        </Text>
        <Text variant="bodySm" numberOfLines={1} style={{ maxWidth: 120, textAlign: 'right' }}>
          {right.name.split(' ').slice(-1)[0]}
        </Text>
      </View>

      <View style={layout.rowBetween}>
        {renderStats(left, 'left')}
        {renderStats(right, 'right')}
      </View>
    </View>
  );
}

function StartSitInsightCard({
  insight,
  onAction,
}: {
  insight: PriorityInsight;
  onAction?: () => void;
}) {
  const { hex } = useThemeTokens();
  if (!insight.start || !insight.sit) return null;

  return (
    <InsightCardShell insight={insight} onAction={onAction}>
      <PlayerCompareBlock
        left={insight.start}
        right={insight.sit}
        leftLabel="Start"
        rightLabel="Sit"
        leftAccent={hex.success}
        rightAccent={hex.mutedForeground}
      />
    </InsightCardShell>
  );
}

function InjuryInsightCard({
  insight,
  onAction,
}: {
  insight: PriorityInsight;
  onAction?: () => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const subject = insight.subject;
  const alternatives = insight.alternatives ?? [];
  if (!subject) return null;

  const subjectLast = subject.name.split(' ').slice(-1)[0];
  const columnW = 80;
  const avatarSize = 64;
  const altBlockW = alternatives.length * columnW + Math.max(0, alternatives.length - 1) * 10;

  const renderPlayerColumn = (
    player: PriorityPlayer,
    opts?: { badge?: string; sublabel?: string },
  ) => (
    <View style={{ width: columnW, alignItems: 'center', gap: 4 }}>
      <View style={{ position: 'relative' }}>
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
        {opts?.badge ? (
          <View
            style={[
              surfaces.pill,
              {
                position: 'absolute',
                bottom: -4,
                alignSelf: 'center',
                backgroundColor: hex.warning,
                paddingHorizontal: 8,
                paddingVertical: 3,
              },
            ]}
          >
            <Text variant="pill" style={{ color: hex.background, fontSize: 10 }}>
              {opts.badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" numberOfLines={1} style={{ textAlign: 'center' }}>
        {player.name.split(' ').slice(-1)[0]}
      </Text>
      {opts?.sublabel ? (
        <Text variant="caption" muted numberOfLines={1} style={{ textAlign: 'center' }}>
          {opts.sublabel}
        </Text>
      ) : player.projectedPoints != null ? (
        <Text
          variant="caption"
          muted
          numberOfLines={1}
          style={{ fontVariant: ['tabular-nums'], textAlign: 'center' }}
        >
          {formatProj(player.projectedPoints)} proj
        </Text>
      ) : null}
    </View>
  );

  return (
    <InsightCardShell insight={insight} onAction={onAction}>
      <View style={{ gap: 8 }}>
        <View style={[layout.row, { gap: 10, justifyContent: 'center' }]}>
          <View style={{ width: columnW }} />
          <View style={{ width: 16 }} />
          <View style={{ width: altBlockW, alignItems: 'center' }}>
            <Text variant="eyebrow" muted style={{ textAlign: 'center' }}>
              Consider instead of {subjectLast}
            </Text>
          </View>
        </View>

        <View style={[layout.row, { gap: 10, justifyContent: 'center', alignItems: 'flex-start' }]}>
          {renderPlayerColumn(subject, {
            badge: subject.injuryStatus,
            sublabel: subject.injuryStatus ? `${subject.injuryStatus} · starter` : 'Your starter',
          })}

          <View style={{ width: 16, alignItems: 'center', paddingTop: avatarSize / 2 - 8 }}>
            <Text variant="eyebrow" muted>
              →
            </Text>
          </View>

          <View style={[layout.row, { gap: 10 }]}>
            {alternatives.map((alt) => (
              <View key={alt.id}>{renderPlayerColumn(alt)}</View>
            ))}
          </View>
        </View>
      </View>
    </InsightCardShell>
  );
}

function CompetitionInsightCard({
  insight,
  onAction,
}: {
  insight: PriorityInsight;
  onAction?: () => void;
}) {
  const { hex } = useThemeTokens();
  if (!insight.subject || !insight.competitor) return null;

  return (
    <InsightCardShell insight={insight} onAction={onAction}>
      <PlayerCompareBlock
        left={insight.subject}
        right={insight.competitor}
        leftLabel="Your player"
        rightLabel="Competition"
        leftAccent={hex.foreground}
        rightAccent={hex.mutedForeground}
      />
    </InsightCardShell>
  );
}

function MatchupInsightCard({
  insight,
  onAction,
}: {
  insight: PriorityInsight;
  onAction?: () => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const subject = insight.subject;
  if (!subject) return null;

  return (
    <InsightCardShell insight={insight} onAction={onAction}>
      <View style={[layout.centered, { gap: 12 }]}>
        <AvatarImage
          src={playerAvatar({
            playerId: subject.id,
            name: subject.name,
            team: subject.team,
            imageUrl: subject.imageUrl,
          })}
          name={subject.name}
          size={80}
        />
        <Text variant="bodySm">{subject.name}</Text>
        <View style={[layout.row, { gap: 8, flexWrap: 'wrap', justifyContent: 'center' }]}>
          {insight.matchupOpponent ? (
            <View style={[surfaces.pillMuted, { paddingHorizontal: 12, paddingVertical: 6 }]}>
              <Text variant="pill">{insight.matchupOpponent}</Text>
            </View>
          ) : null}
          {insight.matchupRank ? (
            <View
              style={[
                surfaces.pill,
                { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: toneBg.success },
              ]}
            >
              <Text variant="pill" style={{ color: toneFg.success }}>
                {insight.matchupRank}
              </Text>
            </View>
          ) : null}
        </View>
        {subject.projectedPoints != null ? (
          <View style={[layout.centered, { gap: 2 }]}>
            <Text variant="scoreLG" style={{ fontSize: 24, fontVariant: ['tabular-nums'] }}>
              {formatProj(subject.projectedPoints)}
            </Text>
            <Text variant="eyebrow" muted>
              proj pts
            </Text>
          </View>
        ) : null}
      </View>
    </InsightCardShell>
  );
}

function PriorityInsightCard({
  insight,
  onAction,
}: {
  insight: PriorityInsight;
  onAction?: () => void;
}) {
  switch (insight.kind) {
    case 'start_sit':
      return <StartSitInsightCard insight={insight} onAction={onAction} />;
    case 'injury':
      return <InjuryInsightCard insight={insight} onAction={onAction} />;
    case 'competition':
      return <CompetitionInsightCard insight={insight} onAction={onAction} />;
    case 'matchup':
      return <MatchupInsightCard insight={insight} onAction={onAction} />;
    default:
      return null;
  }
}

function CommissionerInsightsCard({ insight }: { insight: PriorityInsight }) {
  return (
    <CommissionerInsightsPanel
      paragraphs={insight.insightParagraphs}
      bullets={insight.insightBullets}
    />
  );
}

export function StartSitCarousel({
  leagueId,
  isSynced,
  week,
  onAction,
}: {
  leagueId: string | undefined;
  isSynced: boolean;
  week: number;
  onAction?: () => void;
}) {
  const hex = useHex();
  const { layout } = useThemeTokens();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<ScrollView | null>(null);
  const { data, isLoading, isError } = useStartSitRecommendations(leagueId, isSynced, week);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (idx !== active) setActive(idx);
  };

  const cards = data ?? [];
  const activeInsight = cards[active];

  return (
    <View>
      {isLoading ? (
        <View
          style={[
            layout.centered,
            {
              height: INSIGHT_CARD_HEIGHT,
              borderRadius: 30,
              backgroundColor: hex.surfaceElevated,
            },
          ]}
        >
          <ActivityIndicator color={hex.mutedForeground} />
        </View>
      ) : isError || cards.length === 0 ? (
        <View
          style={{
            height: INSIGHT_CARD_HEIGHT,
            borderRadius: 30,
            backgroundColor: hex.surfaceElevated,
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="bodyMuted">No lineup insights right now.</Text>
        </View>
      ) : (
        <>
          <View style={{ position: 'relative' }}>
            <ScrollView
              ref={scrollerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardW}
              decelerationRate="fast"
              onMomentumScrollEnd={onScroll}
              style={{ height: INSIGHT_CARD_HEIGHT }}
            >
              {cards.map((rec) => (
                <View key={rec.id} style={{ width: cardW, height: INSIGHT_CARD_HEIGHT }}>
                  <PriorityInsightCard insight={rec} onAction={onAction} />
                </View>
              ))}
            </ScrollView>

          {cards.length > 1 ? (
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
              {cards.map((rec, i) => (
                <Pressable
                  key={rec.id}
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

          {activeInsight ? (
            <View style={{ marginTop: 12 }}>
              <CommissionerInsightsCard insight={activeInsight} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
