import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/primitives';
import { useColors, useThemeTokens } from '@/lib/theme';
import type { TradeMachineVerdict } from '@/lib/trade-machine-evaluation';

function markerColor(verdict: TradeMachineVerdict, hex: { success: string; danger: string; warning: string }) {
  if (verdict === 'strong_win' || verdict === 'slight_win') return hex.success;
  if (verdict === 'strong_lose' || verdict === 'slight_lose') return hex.danger;
  return hex.warning;
}

export function TradeOutcomeScale({
  score,
  verdict,
  verdictLabel,
}: {
  score: number;
  verdict: TradeMachineVerdict;
  verdictLabel: string;
}) {
  const { hex, layout } = useThemeTokens();
  const c = useColors();
  const markerLeft = `${((score + 100) / 200) * 100}%` as `${number}%`;
  const color = markerColor(verdict, hex);
  const scoreLabel = `${score > 0 ? '+' : ''}${score}`;

  return (
    <View style={{ gap: 14 }}>
      <View style={[layout.rowBetween, { alignItems: 'flex-end' }]}>
        <Text variant="eyebrow" muted style={{ fontSize: 10 }}>
          You lose
        </Text>
        <Text variant="bodySm" style={{ color, fontWeight: '600' }}>
          {verdictLabel}
        </Text>
        <Text variant="eyebrow" muted style={{ fontSize: 10 }}>
          You win
        </Text>
      </View>

      <View style={{ height: 28, justifyContent: 'center' }}>
        <View style={{ height: 10, borderRadius: 999, overflow: 'hidden' }}>
          <Svg width="100%" height={10} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="tradeOutcomeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={hex.danger} stopOpacity={0.9} />
                <Stop offset="50%" stopColor={hex.warning} stopOpacity={0.95} />
                <Stop offset="100%" stopColor={hex.success} stopOpacity={0.9} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height={10} rx={5} fill="url(#tradeOutcomeGradient)" />
          </Svg>
        </View>

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: markerLeft,
            marginLeft: -18,
            minWidth: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: hex.background,
            borderWidth: 3,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
            shadowColor: c.foreground,
            shadowOpacity: 0.18,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Text variant="caption" style={{ color, fontWeight: '700', fontSize: 11, fontVariant: ['tabular-nums'] }}>
            {scoreLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
