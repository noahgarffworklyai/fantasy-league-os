import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/primitives';
import { usePlayerSleeperStats } from '@/lib/use-player-sleeper-stats';
import type { PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { useColors, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';

const FALLBACK_LOG = [
  { wk: 5, opp: 'vs SEA', pts: 29.1 },
  { wk: 6, opp: '@ KC', pts: 14.8 },
  { wk: 7, opp: 'vs DAL', pts: 21.3 },
];

export function PlayerPerformancePanel({ player }: { player: PlayerProfileContext }) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const { data } = usePlayerSleeperStats(player.id, {
    name: player.name,
    pos: player.pos,
    team: player.team,
    fallbackAvg: player.avg,
  });

  const log =
    data?.weekLogs && data.weekLogs.length > 0
      ? data.weekLogs.map((row) => ({
          wk: row.week,
          opp: row.opponent ?? '—',
          pts: row.pts,
        }))
      : FALLBACK_LOG;

  const avg = log.reduce((s, g) => s + g.pts, 0) / log.length;
  const n = log.length;
  const sumX = log.reduce((s, g) => s + g.wk, 0);
  const sumY = log.reduce((s, g) => s + g.pts, 0);
  const sumXY = log.reduce((s, g) => s + g.wk * g.pts, 0);
  const sumXX = log.reduce((s, g) => s + g.wk * g.wk, 0);
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const W = 320;
  const H = 160;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xs = log.map((g) => g.wk);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const yMax = Math.ceil(Math.max(...log.map((g) => g.pts), avg, 1) / 5) * 5;
  const xFor = (wk: number) => padL + ((wk - minX) / Math.max(1, maxX - minX)) * innerW;
  const yFor = (pts: number) => padT + innerH - (pts / yMax) * innerH;
  const trendDir = slope >= 0 ? 'up' : 'down';
  const yTicks = [0, yMax / 2, yMax];

  return (
    <View style={{ gap: spacing.section }}>
      <View style={[surfaces.roundedCard, { padding: 16 }]}>
        <View style={[layout.rowBetween, { marginBottom: 12 }]}>
          <View>
            <Text variant="eyebrow">Points per week</Text>
            <Text variant="bodySm" style={{ marginTop: 2 }}>
              Trend{' '}
              <Text variant="bodySm" style={{ color: trendDir === 'up' ? hex.success : hex.danger }}>
                {trendDir === 'up' ? '▲' : '▼'} {Math.abs(slope).toFixed(2)} pts/wk
              </Text>
            </Text>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="titleLg">{avg.toFixed(1)}</Text>
            <Text variant="caption">avg</Text>
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
                key={`seg-${g.wk}`}
                x1={xFor(prev.wk)}
                y1={yFor(prev.pts)}
                x2={xFor(g.wk)}
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
            return <Circle key={g.wk} cx={xFor(g.wk)} cy={yFor(g.pts)} r={4.5} fill={fill} />;
          })}
          {log.map((g) => (
            <SvgText key={`l-${g.wk}`} x={xFor(g.wk)} y={H - 6} textAnchor="middle" fill={c.mutedForeground} fontSize={9}>
              W{g.wk}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={surfaces.roundedCard}>
        {log.map((g, i) => (
          <View key={g.wk}>
            {i > 0 ? (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: hex.hairline, marginHorizontal: 16 }} />
            ) : null}
            <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 12 }]}>
              <Text variant="bodySm" style={{ width: 40, color: hex.mutedForeground }}>
                W{g.wk}
              </Text>
              <Text variant="bodySm" style={[layout.flex1, { color: hex.mutedForeground }]}>
                {g.opp}
              </Text>
              <Text variant="bodySm">{g.pts.toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}