import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Card, Divider } from '@/components/ui/Card';
import { playerAvatar } from '@/lib/avatars';
import { leagueMateAvatar } from '@/lib/league-mates-api';
import type { TradeAsset } from '@/lib/trade-players-api';
import { useColors, useHex, useTheme, useThemeTokens } from '@/lib/theme';

type TradeMate = {
  id: string;
  name: string;
  username?: string;
  team: string;
  avatarUrl?: string;
};

function ValueSummaryBar({
  giveTotal,
  receiveTotal,
}: {
  giveTotal: number;
  receiveTotal: number;
}) {
  const { hex, layout } = useThemeTokens();
  const c = useColors();
  const delta = receiveTotal - giveTotal;
  const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <View
      style={[
        layout.row,
        {
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: hex.surfaceElevated,
        },
      ]}
    >
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text variant="eyebrow" muted style={{ letterSpacing: 1.2 }}>
          You give
        </Text>
        <Text variant="scoreLG" style={{ fontSize: 22, fontVariant: ['tabular-nums'], marginTop: 4 }}>
          {giveTotal}
        </Text>
      </View>

      <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
        <Text variant="eyebrow" muted>
          →
        </Text>
        <Text
          variant="caption"
          style={{
            marginTop: 4,
            color: delta >= 0 ? hex.success : hex.danger,
            fontVariant: ['tabular-nums'],
          }}
        >
          {deltaLabel}
        </Text>
      </View>

      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text variant="eyebrow" style={{ color: hex.success, letterSpacing: 1.2 }}>
          You get
        </Text>
        <Text variant="scoreLG" style={{ fontSize: 22, fontVariant: ['tabular-nums'], marginTop: 4 }}>
          {receiveTotal}
        </Text>
      </View>
    </View>
  );
}

function RosterPlayerRow({
  player,
  side,
  selected,
  onToggle,
}: {
  player: TradeAsset;
  side: 'give' | 'receive';
  selected: boolean;
  onToggle: () => void;
}) {
  const { hex, layout } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const accent = side === 'give' ? hex.danger : hex.success;

  return (
    <Pressable onPress={onToggle}>
      <View
        style={[
          layout.listRow,
          {
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderRadius: 14,
            backgroundColor: selected ? `rgba(${side === 'give' ? '255,80,80' : '40,189,95'},0.12)` : 'transparent',
            borderWidth: selected ? StyleSheet.hairlineWidth : 0,
            borderColor: selected ? accent : 'transparent',
          },
        ]}
      >
        <AvatarImage
          src={playerAvatar({
            playerId: player.id,
            name: player.name,
            team: player.team,
            imageUrl: player.imageUrl,
          })}
          name={player.name}
          size={36}
        />
        <View style={[layout.flex1, { minWidth: 0, marginLeft: 8 }]}>
          <Text variant="bodySm" numberOfLines={1}>
            {player.name}
          </Text>
          <Text variant="caption" muted numberOfLines={1}>
            {player.posRankLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>
            {player.tradeValue > 0 ? player.tradeValue : '—'}
          </Text>
          <Text variant="eyebrow" muted style={{ fontSize: 8, marginTop: 2 }}>
            value
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function TradeMachinePane({
  myPlayers,
  managerPools,
  managers,
  onBack,
  onPropose,
}: {
  myPlayers: TradeAsset[];
  managerPools: Record<string, TradeAsset[]>;
  managers: TradeMate[];
  onBack: () => void;
  onPropose: (mgrId: string, give: string[], receive: string[]) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const c = useColors();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const [selectedMateId, setSelectedMateId] = useState(managers[0]?.id ?? '');
  const [give, setGive] = useState<string[]>([]);
  const [receive, setReceive] = useState<string[]>([]);

  const activeMate = managers.find((m) => m.id === selectedMateId) ?? managers[0];
  const theirPlayers = useMemo(
    () => managerPools[activeMate?.id ?? ''] ?? [],
    [managerPools, activeMate?.id],
  );

  const giveTotal = myPlayers
    .filter((p) => give.includes(p.id))
    .reduce((sum, p) => sum + p.tradeValue, 0);
  const receiveTotal = theirPlayers
    .filter((p) => receive.includes(p.id))
    .reduce((sum, p) => sum + p.tradeValue, 0);

  const toggleGive = (id: string) =>
    setGive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleReceive = (id: string) =>
    setReceive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const maxRows = Math.max(myPlayers.length, theirPlayers.length);

  return (
    <View style={layout.sectionBlock}>
      <View style={[layout.rowBetween, { alignItems: 'center', marginBottom: 16 }]}>
        <Pressable onPress={onBack}>
          <Text variant="bodySm" style={{ color: hex.success }}>
            ← Trade
          </Text>
        </Pressable>
        <Text variant="body">Mock trade machine</Text>
        <View style={{ width: 56 }} />
      </View>

      <ValueSummaryBar giveTotal={giveTotal} receiveTotal={receiveTotal} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 16 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
      >
        {managers.map((mate) => {
          const active = mate.id === activeMate?.id;
          return (
            <Pressable
              key={mate.id}
              onPress={() => {
                setSelectedMateId(mate.id);
                setReceive([]);
              }}
              style={[
                surfaces.pill,
                layout.row,
                {
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: active ? hex.foreground : hex.surfaceElevated,
                },
              ]}
            >
              <AvatarImage
                src={
                  mate.avatarUrl
                    ? leagueMateAvatar({ userId: mate.id, name: mate.name, avatarUrl: mate.avatarUrl })
                    : playerAvatar({ playerId: mate.id, name: mate.name, team: mate.team })
                }
                name={mate.name}
                size={24}
              />
              <Text
                variant="caption"
                numberOfLines={1}
                style={{ color: active ? hex.background : hex.mutedForeground, maxWidth: 120 }}
              >
                {mate.username ?? mate.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ marginTop: 16 }}>
        <Card>
          <View style={[layout.row, { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8 }]}>
          <Text variant="eyebrow" style={{ flex: 1, letterSpacing: 1.2 }}>
            Your roster
          </Text>
          <Text variant="eyebrow" style={{ flex: 1, letterSpacing: 1.2, textAlign: 'right' }}>
            {activeMate?.username ?? activeMate?.name ?? 'League mate'}
          </Text>
        </View>
        <Divider />
        <View style={{ paddingHorizontal: 6, paddingBottom: 8 }}>
          {maxRows === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text variant="bodyMuted">No roster players to compare.</Text>
            </View>
          ) : (
            Array.from({ length: maxRows }).map((_, i) => {
              const mine = myPlayers[i];
              const theirs = theirPlayers[i];
              return (
                <View key={i} style={[layout.row, { gap: 6 }]}>
                  <View style={{ flex: 1 }}>
                    {mine ? (
                      <RosterPlayerRow
                        player={mine}
                        side="give"
                        selected={give.includes(mine.id)}
                        onToggle={() => toggleGive(mine.id)}
                      />
                    ) : (
                      <View style={{ height: 56 }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    {theirs ? (
                      <RosterPlayerRow
                        player={theirs}
                        side="receive"
                        selected={receive.includes(theirs.id)}
                        onToggle={() => toggleReceive(theirs.id)}
                      />
                    ) : (
                      <View style={{ height: 56 }} />
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Card>
      </View>

      <Text variant="caption" muted style={{ marginTop: 12, paddingHorizontal: 4, textAlign: 'center' }}>
        Tap players on each side to build a trade. Values update above as you select.
      </Text>

      <Pressable
        onPress={() => {
          if (!activeMate || (give.length === 0 && receive.length === 0)) return;
          onPropose(activeMate.id, give, receive);
        }}
        disabled={!activeMate || (give.length === 0 && receive.length === 0)}
        style={[
          surfaces.aiButton,
          surfaces.aiButtonSecondary,
          {
            marginTop: 16,
            opacity: !activeMate || (give.length === 0 && receive.length === 0) ? 0.45 : 1,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: `rgba(${ink},0.12)`,
          },
        ]}
      >
        <Text variant="button">Propose in Sleeper</Text>
        <ArrowUpRight size={14} color={c.foreground} />
      </Pressable>
    </View>
  );
}
