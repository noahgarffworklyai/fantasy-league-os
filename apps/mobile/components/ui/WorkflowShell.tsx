import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text } from './primitives';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

export const BOTTOM_BAR_SPACE = 112;

/** Full-screen workflow page with a back header (mirrors WorkflowShell). */
export function WorkflowShell({
  title,
  eyebrow,
  children,
  trailing,
  onBack,
  backLabel = 'Back',
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  trailing?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}) {
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <View
        className="border-b border-hairline bg-surface"
        style={{ paddingTop: Math.max(insets.top, 14) }}
      >
        <View className="flex-row items-center justify-between px-2 pb-3">
          <Pressable
            onPress={() => (onBack ? onBack() : router.back())}
            className="flex-row items-center gap-0.5 rounded-full px-2 py-1"
          >
            <ChevronLeft size={20} color={c.success} />
            <Text className="text-[15px] text-success">{backLabel}</Text>
          </Pressable>
          <View className="items-center">
            {eyebrow ? (
              <Text className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {eyebrow}
              </Text>
            ) : null}
            <Text className="text-[16px] font-semibold tracking-tightish">{title}</Text>
          </View>
          <View className="min-w-[64px] flex-row items-center justify-end pr-2">{trailing}</View>
        </View>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center justify-between px-2">
        <Text className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </Text>
        {action}
      </View>
      <View className="overflow-hidden rounded-[24px] bg-surface-elevated">{children}</View>
    </View>
  );
}

export function Row({
  label,
  sub,
  value,
  onPress,
  trailing,
  first,
}: {
  label: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  first?: boolean;
}) {
  const inner = (
    <View
      className={cn('flex-row items-center gap-3 px-4 py-3.5', first ? '' : 'border-t border-hairline')}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[16px] font-medium tracking-tightish">{label}</Text>
        {sub ? <Text className="text-[12px] text-muted-foreground">{sub}</Text> : null}
      </View>
      {value ? <Text className="text-[14px] text-muted-foreground">{value}</Text> : null}
      {trailing}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} className="w-full">
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <View className="items-center rounded-[24px] bg-surface-elevated px-6 py-10">
      <Text className="text-[15px] font-medium">{title}</Text>
      {sub ? <Text className="mt-1 text-[13px] text-muted-foreground">{sub}</Text> : null}
    </View>
  );
}
