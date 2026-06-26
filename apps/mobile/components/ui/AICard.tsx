import { ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable, Text } from './primitives';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';
import type { Confidence, Recommendation } from '@/lib/ai-intelligence';

export function AICard({
  rec,
  onAction,
  compact,
}: {
  rec: Recommendation;
  onAction?: () => void;
  compact?: boolean;
}) {
  const c = useColors();
  const toneBorder =
    rec.tone === 'warning'
      ? 'border-warning/40'
      : rec.tone === 'danger'
        ? 'border-destructive/40'
        : rec.tone === 'success'
          ? 'border-success/40'
          : 'border-foreground/10';

  const primary = rec.action?.kind === 'primary';
  const external = rec.action?.label.startsWith('Open in');

  return (
    <View className={cn('rounded-[30px] border bg-surface-elevated p-4', toneBorder)}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-foreground">
          <Sparkles size={16} color={c.background} strokeWidth={2.25} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            {rec.category ? (
              <Text className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {rec.category}
              </Text>
            ) : null}
            <ConfidencePill confidence={rec.confidence} />
          </View>
          <Text
            className={cn(
              'mt-1 font-semibold tracking-tightish text-foreground',
              compact ? 'text-[14px]' : 'text-[15px]',
            )}
          >
            {rec.title}
          </Text>
          {!compact ? (
            <Text className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {rec.why}
            </Text>
          ) : null}
        </View>
      </View>
      {rec.action ? (
        <Pressable
          onPress={onAction}
          className={cn(
            'mt-3 w-full flex-row items-center justify-center gap-1 rounded-full py-2.5',
            primary ? 'bg-foreground' : 'bg-foreground/5',
          )}
        >
          <Text
            className={cn(
              'text-[13px] font-semibold',
              primary ? 'text-background' : 'text-foreground',
            )}
          >
            {rec.action.label}
          </Text>
          {external ? (
            <ArrowUpRight size={14} color={primary ? c.background : c.foreground} />
          ) : (
            <ChevronRight size={14} color={primary ? c.background : c.foreground} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export function ConfidencePill({ confidence }: { confidence: Confidence }) {
  const map = {
    high: { label: 'High confidence', cls: 'bg-success/15', text: 'text-success' },
    moderate: { label: 'Moderate', cls: 'bg-foreground/10', text: 'text-foreground' },
    low: { label: 'Low confidence', cls: 'bg-muted', text: 'text-muted-foreground' },
  } as const;
  const m = map[confidence];
  return (
    <View className={cn('rounded-full px-2 py-0.5', m.cls)}>
      <Text className={cn('text-[10px] font-medium tracking-wide', m.text)}>{m.label}</Text>
    </View>
  );
}

export function AISection({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between px-2">
        <View className="flex-row items-center gap-1.5">
          <Sparkles size={14} color={c.mutedForeground} />
          <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {title}
          </Text>
        </View>
        {caption ? (
          <Text className="text-[11px] text-muted-foreground">{caption}</Text>
        ) : null}
      </View>
      <View className="gap-2.5">{children}</View>
    </View>
  );
}
