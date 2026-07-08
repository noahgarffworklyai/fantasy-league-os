import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, X } from 'lucide-react-native';
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
import { useColors, useThemeTokens } from '@/lib/theme';
import { useQuery } from '@tanstack/react-query';

const FILTERS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;
type PositionFilter = (typeof FILTERS)[number];
type SortKey = 'value' | 'name' | 'rank';
type SortDir = 'asc' | 'desc';

export type TradeBrowserPlayer = {
  id: string;
  name: string;
  pos: string;
  team: string;
  imageUrl?: string;
  posRank: number;
  posRankLabel: string;
  tradeValue: number;
  mine?: boolean;
};

function enrichSearchPlayer(
  player: ReturnType<typeof mapSearchRowToPlayer>,
  ranks: Map<string, { posRank: number; position?: string }>,
): TradeBrowserPlayer {
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
    mine: player.mine,
  };
}

function defaultSortDir(key: SortKey): SortDir {
  if (key === 'name') return 'asc';
  if (key === 'rank') return 'asc';
  return 'desc';
}

function sortPlayers(players: TradeBrowserPlayer[], key: SortKey, dir: SortDir) {
  const factor = dir === 'asc' ? 1 : -1;
  return [...players].sort((a, b) => {
    switch (key) {
      case 'name':
        return factor * a.name.localeCompare(b.name);
      case 'rank': {
        const ar = a.posRank > 0 ? a.posRank : 9999;
        const br = b.posRank > 0 ? b.posRank : 9999;
        return factor * (ar - br);
      }
      case 'value':
      default: {
        const av = a.tradeValue > 0 ? a.tradeValue : -1;
        const bv = b.tradeValue > 0 ? b.tradeValue : -1;
        return factor * (av - bv);
      }
    }
  });
}

function SortHeader({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const { hex, layout } = useThemeTokens();
  const c = useColors();

  const renderLabel = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => {
    const active = sortKey === key;
    const Icon = sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <Pressable
        onPress={() => onSort(key)}
        style={[
          layout.row,
          {
            alignItems: 'center',
            justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
            gap: 4,
            minWidth: key === 'value' ? 52 : key === 'rank' ? 56 : 0,
            flex: key === 'name' ? 1 : undefined,
          },
        ]}
      >
        <Text
          variant="eyebrow"
          style={{
            color: active ? hex.foreground : hex.mutedForeground,
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
        {active ? <Icon size={12} color={c.foreground} strokeWidth={2.5} /> : null}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        layout.row,
        {
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
      ]}
    >
      <View style={{ width: 40, marginRight: 12 }} />
      <View style={[layout.flex1, { minWidth: 0, marginRight: 8 }]}>
        {renderLabel('name', 'Player')}
      </View>
      <View style={{ width: 56, marginRight: 8 }}>{renderLabel('rank', 'Rank')}</View>
      <View style={{ width: 52 }}>{renderLabel('value', 'Value', 'right')}</View>
    </View>
  );
}

export function TradePlayerBrowser({
  leagueId,
  onPlayer,
}: {
  leagueId: string;
  isSynced?: boolean;
  onPlayer: (player: TradeBrowserPlayer) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<PositionFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(defaultSortDir(key));
  };

  const { data, isLoading, isError } = usePlayerSearch(leagueId, {
    search: q,
    position: pos,
    tab: 'pool',
  });
  const { data: ranks, isLoading: ranksLoading } = useQuery({
    queryKey: ['trade-browser-ranks'],
    queryFn: loadCurrentSeasonPlayerRanks,
    staleTime: 5 * 60_000,
  });

  const players = useMemo(() => {
    const rankMap = ranks ?? new Map();
    const rows = (data?.players ?? []).map((row) =>
      enrichSearchPlayer(mapSearchRowToPlayer(row), rankMap),
    );
    const filtered = rows.filter((p) => pos === 'All' || p.pos === pos);
    return sortPlayers(filtered, sortKey, sortDir);
  }, [data?.players, ranks, pos, sortKey, sortDir]);

  const loading = ranksLoading || isLoading;

  return (
    <View style={layout.screenStack}>
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
          <Text variant="bodyMuted" style={{ marginTop: 4 }}>
            Try again in a moment.
          </Text>
        </View>
      ) : players.length === 0 ? (
        <View style={[surfaces.emptyState, { marginTop: 0 }]}>
          <Text variant="bodySm">No players match</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4 }}>
            {pos !== 'All' ? `Try clearing the ${pos} filter.` : 'Adjust your search.'}
          </Text>
        </View>
      ) : (
        <Card>
          <SortHeader sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <Divider />
          {players.map((p, i) => (
            <Pressable key={p.id} onPress={() => onPlayer(p)}>
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
                    {p.team} · {p.pos}
                  </Text>
                </View>
                <View style={{ width: 56, marginRight: 8 }}>
                  <Text variant="bodySm" numberOfLines={1}>
                    {p.posRank > 0 ? p.posRankLabel : '—'}
                  </Text>
                </View>
                <View style={{ width: 52, alignItems: 'flex-end' }}>
                  <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>
                    {p.tradeValue > 0 ? p.tradeValue : '—'}
                  </Text>
                  <Text variant="eyebrow" muted style={{ fontSize: 9, marginTop: 2 }}>
                    value
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );
}
