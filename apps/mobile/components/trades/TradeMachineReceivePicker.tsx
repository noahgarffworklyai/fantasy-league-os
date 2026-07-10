import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { PositionFilterPanel, SearchFilterRow } from '@/components/ui/SearchFilterRow';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Card, Divider } from '@/components/ui/Card';
import { Pressable, Text } from '@/components/ui/primitives';
import { playerAvatar } from '@/lib/avatars';
import { mapSearchRowToPlayer, usePlayerSearch, usePoolValuePreview } from '@/lib/players-api';
import {
  formatPosRankLabel,
  rankTradeValue,
  useSeasonPlayerRanks,
} from '@/lib/sleeper-player-ranks';
import type { TradeAsset } from '@/lib/trade-players-api';
import { useColors, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

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

function PlayerPickerRow({
  player,
  selected,
  onToggle,
}: {
  player: TradeAsset;
  selected: boolean;
  onToggle: (player: TradeAsset) => void;
}) {
  const { hex, layout } = useThemeTokens();
  const c = useColors();

  return (
    <Pressable onPress={() => onToggle(player)}>
      <View style={[layout.listRow, { paddingHorizontal: 16, paddingVertical: 12 }]}>
        <AvatarImage
          src={playerAvatar({
            playerId: player.id,
            name: player.name,
            team: player.team,
            imageUrl: player.imageUrl,
          })}
          name={player.name}
          size={40}
        />
        <View style={[layout.flex1, { minWidth: 0, marginLeft: 12, marginRight: 8 }]}>
          <Text variant="body" numberOfLines={1}>
            {player.name}
          </Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            {player.team} · {player.posRankLabel}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
          <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>
            {player.tradeValue || 0}
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
}

export function TradeMachineReceivePicker({
  leagueId,
  excludeIds,
  selectedIds,
  selectedAssets,
  onToggle,
  searchMode,
  onSearchFocusChange,
}: {
  leagueId: string;
  excludeIds: Set<string>;
  selectedIds: string[];
  selectedAssets: Map<string, TradeAsset>;
  onToggle: (player: TradeAsset) => void;
  searchMode?: boolean;
  onSearchFocusChange?: (focused: boolean) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<PositionFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const hasQuery = q.trim().length >= 1;

  const { data, isLoading, isError, isFetching } = usePlayerSearch(
    leagueId,
    { search: q, position: pos, tab: 'pool' },
    { enabled: hasQuery },
  );
  const {
    players: previewPlayers,
    isLoading: previewLoading,
    isError: previewError,
  } = usePoolValuePreview({ position: pos, excludeIds });
  const { data: ranks } = useSeasonPlayerRanks();

  const players = useMemo((): TradeAsset[] => {
    if (!hasQuery) {
      return previewPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        pos: p.pos,
        team: p.team,
        imageUrl: p.imageUrl,
        posRank: p.posRank,
        posRankLabel: p.posRankLabel,
        tradeValue: p.tradeValue,
      }));
    }
    const rankMap = ranks ?? new Map();
    return (data?.players ?? [])
      .map((row) => toTradeAsset(mapSearchRowToPlayer(row), rankMap))
      .filter((p) => !excludeIds.has(p.id))
      .filter((p) => pos === 'All' || p.pos === pos);
  }, [hasQuery, previewPlayers, data?.players, ranks, pos, excludeIds]);

  const loading = hasQuery ? isLoading && !data : previewLoading;
  const refreshing = hasQuery && isFetching && !!data;
  const showError = hasQuery ? isError : previewError;

  const searchRow = (
    <SearchFilterRow
      value={q}
      onChangeValue={setQ}
      onFocus={() => onSearchFocusChange?.(true)}
      onBlur={() => onSearchFocusChange?.(false)}
      filterActive={pos !== 'All'}
      filterOpen={filterOpen}
      onToggleFilter={() => setFilterOpen((open) => !open)}
      positionBadge={pos !== 'All' ? pos : null}
      filterPanel={
        filterOpen ? (
          <PositionFilterPanel
            options={FILTERS}
            value={pos}
            onChange={(f) => {
              setPos(f);
              setFilterOpen(false);
            }}
          />
        ) : null
      }
    />
  );

  const resultsBody = loading ? (
    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
      <ActivityIndicator color={hex.primary} />
    </View>
  ) : showError ? (
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
    <View style={{ gap: 8 }}>
      {!hasQuery ? (
        <Text variant="eyebrow" style={{ paddingHorizontal: 4, letterSpacing: 1.1 }}>
          Top by value
        </Text>
      ) : null}
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
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <PlayerPickerRow player={asset} selected={selected} onToggle={onToggle} />
            </View>
          );
        })}
      </Card>
    </View>
  );

  if (searchMode) {
    return (
      <View style={{ flex: 1, gap: spacing.screen }}>
        <Text variant="eyebrow" style={{ paddingHorizontal: 4, letterSpacing: 1.2 }}>
          Trade for
        </Text>
        {searchRow}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
        >
          {resultsBody}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text variant="eyebrow" style={{ paddingHorizontal: 4, letterSpacing: 1.2 }}>
        Trade for
      </Text>
      {searchRow}
      {resultsBody}
    </View>
  );
}
