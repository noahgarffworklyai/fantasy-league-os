import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line as SvgLine } from 'react-native-svg';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text } from '@/components/ui/primitives';
import { usePlayerProfileData } from '@/lib/use-player-sleeper-stats';
import type { PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { useColors, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

function formatOpponent(opponent?: string) {
  if (!opponent) return '—';
  return opponent;
}

type WeeklyTrend = 'up' | 'down' | 'steady';

function weeklyTrendFromDelta(delta: number): WeeklyTrend {
  if (delta >= 3) return 'up';
  if (delta <= -3) return 'down';
  return 'steady';
}

function WeeklyTrendIcon({ trend }: { trend: WeeklyTrend | null }) {
  const c = useColors();
  if (!trend) return <View style={{ width: 20, height: 20 }} />;

  if (trend === 'up') {
    return <TrendingUp size={16} color={c.success} strokeWidth={2.5} />;
  }
  if (trend === 'down') {
    return <TrendingDown size={16} color={c.destructive} strokeWidth={2.5} />;
  }
  return <Minus size={16} color={c.warning} strokeWidth={2.5} />;
}

export function PlayerPerformancePanel({ player }: { player: PlayerProfileContext }) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const { data, isLoading, isError, isFetching } = usePlayerProfileData();

  const log = data?.weekLogs ?? [];
  const seasonLabel = data?.statsSeason ? `${data.statsSeason} season` : 'Season';

  if (isLoading || isFetching) {
    return (
      <View style={[layout.centered, { paddingVertical: 40 }]}>
        <ActivityIndicator />
        <Text variant="bodyMuted" style={{ marginTop: 12 }}>
          Loading Sleeper game logs…
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[layout.centered, { paddingVertical: 40 }]}>
        <Text variant="bodyMuted">Could not load Sleeper performance data.</Text>
      </View>
    );
  }

  if (log.length === 0) {
    return (
      <View style={[layout.centered, { paddingVertical: 40 }]}>
        <Text variant="bodyMuted">
          No Sleeper game logs for {data?.statsSeason ?? 'this season'} yet.
        </Text>
      </View>
    );
  }

  const avg = log.reduce((s, g) => s + g.pts, 0) / log.length;
  const n = log.length;
  const sumX = log.reduce((s, g) => s + g.week, 0);
  const sumY = log.reduce((s, g) => s + g.pts, 0);
  const sumXY = log.reduce((s, g) => s + g.week * g.pts, 0);
  const sumXX = log.reduce((s, g) => s + g.week * g.week, 0);
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const W = 320;
  const H = 160;
  const padL = 16;
  const padR = 16;
  const padT = 12;
  const padB = 8;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yMax = Math.ceil(Math.max(...log.map((g) => g.pts), avg, 1) / 5) * 5;
  const xForIndex = (index: number) => {
    if (n === 1) return padL + innerW / 2;
    return padL + (index / (n - 1)) * innerW;
  };
  const yFor = (pts: number) => padT + innerH - (pts / yMax) * innerH;
  const trendDir = slope >= 0 ? 'up' : 'down';
  const yTicks = [0, yMax / 2, yMax];
  const showVolume = player.pos !== 'K' && player.pos !== 'DEF';

  const tableColumns = showVolume
    ? ([
        { key: 'wk', flex: 1, label: 'Wk', align: 'left' as const },
        { key: 'opp', flex: 2.2, label: 'Opp', align: 'left' as const },
        { key: 'tch', flex: 1, label: 'Tch', align: 'right' as const },
        { key: 'tgt', flex: 1, label: 'Tgt', align: 'right' as const },
        { key: 'pts', flex: 1, label: 'Pts', align: 'right' as const },
        { key: 'trend', flex: 1, label: '', align: 'center' as const },
      ] as const)
    : ([
        { key: 'wk', flex: 1, label: 'Wk', align: 'left' as const },
        { key: 'opp', flex: 2.8, label: 'Opp', align: 'left' as const },
        { key: 'pts', flex: 1.2, label: 'Pts', align: 'right' as const },
        { key: 'trend', flex: 1, label: '', align: 'center' as const },
      ] as const);

  const renderCell = (
    key: (typeof tableColumns)[number]['key'],
    g: (typeof log)[number],
    weeklyTrend: WeeklyTrend | null,
  ) => {
    switch (key) {
      case 'wk':
        return (
          <Text variant="bodySm" style={{ color: hex.mutedForeground, fontVariant: ['tabular-nums'] }}>
            {g.week}
          </Text>
        );
      case 'opp':
        return (
          <Text variant="bodySm" style={{ color: hex.mutedForeground }} numberOfLines={1}>
            {formatOpponent(g.opponent)}
          </Text>
        );
      case 'tch':
        return (
          <Text variant="bodySm" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {g.touches ?? '—'}
          </Text>
        );
      case 'tgt':
        return (
          <Text variant="bodySm" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {g.recTgt ?? '—'}
          </Text>
        );
      case 'pts':
        return (
          <Text variant="bodySm" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {g.pts.toFixed(1)}
          </Text>
        );
      case 'trend':
        return <WeeklyTrendIcon trend={weeklyTrend} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ gap: spacing.section }}>
      <View style={[surfaces.roundedCard, { padding: 16 }]}>
        <View style={[layout.rowBetween, { marginBottom: 12 }]}>
          <View>
            <Text variant="eyebrow">{seasonLabel}</Text>
            <Text variant="bodySm" style={{ marginTop: 2 }}>
              Trend{' '}
              <Text variant="bodySm" style={{ color: trendDir === 'up' ? hex.success : hex.danger }}>
                {trendDir === 'up' ? '▲' : '▼'} {Math.abs(slope).toFixed(2)} pts/wk
              </Text>
            </Text>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="titleLg">{avg.toFixed(1)}</Text>
            <Text variant="caption">avg PPG</Text>
          </View>
        </View>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={176}>
          {yTicks.map((t) => (
            <SvgLine key={t} x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke={c.foreground} strokeOpacity={0.08} />
          ))}
          <SvgLine x1={padL} x2={W - padR} y1={yFor(avg)} y2={yFor(avg)} stroke={c.foreground} strokeOpacity={0.25} strokeDasharray="3 3" />
          {log.slice(1).map((g, i) => {
            const prev = log[i];
            const up = g.pts >= prev.pts;
            return (
              <SvgLine
                key={`seg-${g.week}`}
                x1={xForIndex(i)}
                y1={yFor(prev.pts)}
                x2={xForIndex(i + 1)}
                y2={yFor(g.pts)}
                stroke={up ? c.success : c.destructive}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
          {log.map((g, i) => {
            const prev = i > 0 ? log[i - 1] : null;
            const fill = prev == null ? c.foreground : g.pts >= prev.pts ? c.success : c.destructive;
            return <Circle key={g.week} cx={xForIndex(i)} cy={yFor(g.pts)} r={4.5} fill={fill} />;
          })}
        </Svg>
      </View>

      <View style={surfaces.roundedCard}>
        <View
          style={[
            layout.row,
            {
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 8,
              gap: 6,
              alignItems: 'center',
            },
          ]}
        >
          {tableColumns.map((col) => (
            <View key={col.key} style={{ flex: col.flex, alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
              {col.key === 'trend' ? (
                <TrendingUp size={12} color={hex.mutedForeground} strokeWidth={2.25} />
              ) : (
                <Text
                  variant="eyebrow"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={{ fontSize: 9, letterSpacing: 0.8 }}
                >
                  {col.label}
                </Text>
              )}
            </View>
          ))}
        </View>
        {log.map((g, i) => {
          const prev = i > 0 ? log[i - 1] : null;
          const weeklyTrend = prev ? weeklyTrendFromDelta(g.pts - prev.pts) : null;

          return (
            <View key={g.week}>
              {i > 0 ? (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: hex.hairline, marginHorizontal: 12 }} />
              ) : null}
              <View
                style={[
                  layout.row,
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    gap: 6,
                  },
                ]}
              >
                {tableColumns.map((col) => (
                  <View
                    key={col.key}
                    style={{
                      flex: col.flex,
                      alignItems: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      minWidth: 0,
                    }}
                  >
                    {renderCell(col.key, g, weeklyTrend)}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
