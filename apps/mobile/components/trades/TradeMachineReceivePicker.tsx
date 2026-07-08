import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Check, Plus, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { SearchInput } from '@/components/ui/Input';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Card, Divider } from '@/components/ui/Card';
import { Pressable, Text } from '@/components/ui/primitives';
import { playerAvatar } from '@/lib/avatars';
import { mapSearchRowToPlayer, usePlayerSearch } from '@/lib/players-api';
import {
  formatPosRankLabel,
  loadCurrentSeasonPlayerRanks,
  rankTradeValue,
} from '@/lib/sleeper-player-ranks';
import type { TradeAsset } from '@/lib/trade-players-api';
import { useColors, useThemeTokens } from '@/lib/theme';
import { useQuery } from '@tanstack/react-query';

const FILTERS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
type PositionFilter = (typeof FILTERS)[number];

function toTradeAsset(
  player: ReturnType<typeof mapSearchRowToPlayer>,
  ranks: Map<string, { posRank: number; position?: string }>,
): TradeAsset {
  const posRank = ranks.get(player.id)?.posRank ?? 0;
  const pos = player.pos || ranks.get(player.id)?.position || '—';
  return {
    id: player.id,
    name: player.name,
    pos,
    team: player.team,
    imageUrl: player.imageUrl,
    posRank,
    posRankLabel: formatPosRankLabel(pos, posRank),
    tradeValue: rankTradeValue(posRank),
  };
}

export function TradeMachineReceivePicker({
  leagueId,
  excludeIds,
  selectedIds,
  selectedAssets,
  onToggle,
}: {
  leagueId: string;
  excludeIds: Set<string>;
  selectedIds: string[];
  selectedAssets: Map<string, TradeAsset>;
  onToggle: (player: TradeAsset) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<PositionFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isLoading, isError, isFetching } = usePlayerSearch(leagueId, {
    search: q,
    position: pos,
    tab: 'pool',
  });
  const { data: ranks, isLoading: ranksLoading } = useQuery({
    queryKey: ['trade-machine-pool-ranks'],
    queryFn: loadCurrentSeasonPlayerRanks,
    staleTime: 5 * 60_000,
  });

  const players = useMemo(() => {
    const rankMap = ranks ?? new Map();
    return (data?.players ?? [])
      .map((row) => toTradeAsset(mapSearchRowToPlayer(row), rankMap))
      .filter((p) => !excludeIds.has(p.id))
      .filter((p) => pos === 'All' || p.pos === pos);
  }, [data?.players, ranks, pos, excludeIds]);

  const loading = (ranksLoading && !ranks) || (isLoading && !data);
  const refreshing = isFetching && !!data;

  return (
    <View style={layout.screenStack}>
      <Text variant="eyebrow" style={{ paddingHorizontal: 4, letterSpacing: 1.2 }}>
        Trade for
      </Text>

      <View style={[layout.row, layout.tight]}>
        <View style={layout.searchBar}>
          <Search size={16} color={c.mutedForeground} />
          <SearchInput value={q} onChangeText={setQ} placeholder="Search players" />
          {q ? (
            <Pressable onPress={() => setQ('')}>
              <X size={16} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFilterOpen((open) => !open)}
          style={[
            layout.iconButton,
            (pos !== 'All' || filterOpen) && { backgroundColor: hex.foreground },
          ]}
        >
          <SlidersHorizontal
            size={16}
            color={pos !== 'All' || filterOpen ? hex.background : c.foreground}
          />
          {pos !== 'All' ? (
            <View style={surfaces.badge}>
              <Text variant="pill" style={{ color: hex.background, fontSize: 9, fontWeight: '600' }}>
                {pos}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {filterOpen ? (
        <View style={[surfaces.roundedCard, { padding: 12 }]}>
          <Text variant="eyebrow" style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
            Position
          </Text>
          <View style={[layout.rowWrap, { gap: 6 }]}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setPos(f);
                  setFilterOpen(false);
                }}
                style={[
                  surfaces.pill,
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: f === pos ? hex.foreground : hex.background,
                  },
                ]}
              >
                <Text variant="caption" style={{ color: f === pos ? hex.background : hex.mutedForeground }}>
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={hex.primary} />
        </View>
      ) : isError ? (
        <View style={[surfaces.emptyState, { marginTop: 0 }]}>
          <Text variant="bodySm">Could not load players</Text>
        </View>
      ) : players.length === 0 ? (
        <View style={[surfaces.emptyState, { marginTop: 0 }]}>
          <Text variant="bodySm">No matching players</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4 }}>
            Try another position filter or search term.
          </Text>
        </View>
      ) : (
        <Card>
          {refreshing ? (
            <View style={{ paddingVertical: 8, alignItems: 'center' }}>
              <ActivityIndicator color={hex.primary} size="small" />
            </View>
          ) : null}
          {players.map((p, i) => {
            const selected = selectedIds.includes(p.id);
            const asset = selectedAssets.get(p.id) ?? p;
            return (
              <Pressable key={p.id} onPress={() => onToggle(asset)}>
                {i > 0 ? <Divider /> : null}
                <View style={[layout.listRow, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                  <AvatarImage
                    src={playerAvatar({
                      playerId: p.id,
                      name: p.name,
                      team: p.team,
                      imageUrl: p.imageUrl,
                    })}
                    name={p.name}
                    size={40}
                  />
                  <View style={[layout.flex1, { minWidth: 0, marginLeft: 12, marginRight: 8 }]}>
                    <Text variant="body" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text variant="bodyMuted" numberOfLines={1}>
                      {p.team} · {p.posRankLabel}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                    <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>
                      {p.tradeValue || 0}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? hex.success : hex.background,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: selected ? hex.success : hex.hairline,
                    }}
                  >
                    {selected ? (
                      <Check size={16} color={hex.background} strokeWidth={2.5} />
                    ) : (
                      <Plus size={16} color={c.foreground} />
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}
    </View>
  );
}
