import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Plus, RefreshCw, UserPlus } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';

export default function OnboardingHome() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <Text className="text-[34px] font-semibold leading-[36px] tracking-tighter2">
        How do you want to start?
      </Text>
      <Text className="mt-2 text-[15px] text-muted-foreground">
        You can add more leagues later.
      </Text>

      <View className="mt-8 gap-3">
        <PathCard
          to="/onboarding/create"
          icon={<Plus size={20} color={c.background} />}
          title="Create a League"
          sub="Start a new league inside Commissioner."
        />
        <PathCard
          to="/onboarding/join"
          icon={<UserPlus size={20} color={c.background} />}
          title="Join a League"
          sub="Enter an invite from your commissioner."
        />
        <PathCard
          to="/onboarding/sync"
          icon={<RefreshCw size={20} color={c.background} />}
          title="Sync Existing League"
          sub="Connect ESPN, Sleeper, or Yahoo."
        />
      </View>
    </View>
  );
}

function PathCard({
  to,
  icon,
  title,
  sub,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  const nav = useNav();
  const c = useColors();
  return (
    <Pressable
      onPress={() => nav.push(to)}
      className="flex-row items-center gap-4 rounded-[28px] bg-surface-elevated p-5"
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-foreground">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-[19px] font-semibold tracking-tightish">{title}</Text>
        <Text className="text-[14px] text-muted-foreground">{sub}</Text>
      </View>
      <ChevronRight size={20} color={c.mutedForeground} />
    </Pressable>
  );
}
