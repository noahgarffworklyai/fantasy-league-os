import { type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Plus, RefreshCw, UserPlus } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

export default function OnboardingHome() {
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: hex.background,
        paddingHorizontal: 24,
        paddingTop: Math.max(insets.top, 24),
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <Text variant="hero">How do you want to start?</Text>
      <Text variant="subtitle" style={{ marginTop: 8 }}>
        You can add more leagues later.
      </Text>

      <View style={{ marginTop: 32, gap: 12 }}>
        <PathCard
          to="/onboarding/create"
          icon={<Plus size={20} color={hex.background} />}
          title="Create a League"
          sub="Start a new league inside Commissioner."
        />
        <PathCard
          to="/onboarding/join"
          icon={<UserPlus size={20} color={hex.background} />}
          title="Join a League"
          sub="Enter an invite from your commissioner."
        />
        <PathCard
          to="/onboarding/sync"
          icon={<RefreshCw size={20} color={hex.background} />}
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
  const { hex, layout } = useThemeTokens();
  return (
    <Pressable
      onPress={() => nav.push(to)}
      style={[
        layout.row,
        {
          gap: 16,
          borderRadius: 28,
          backgroundColor: hex.surfaceElevated,
          padding: 20,
        },
      ]}
    >
      <View
        style={[
          layout.centered,
          {
            height: 48,
            width: 48,
            borderRadius: 16,
            backgroundColor: hex.primary,
          },
        ]}
      >
        {icon}
      </View>
      <View style={[layout.flex1, { minWidth: 0 }]}>
        <Text variant="titleMd" style={{ fontSize: 19 }}>
          {title}
        </Text>
        <Text variant="bodyMuted" style={{ fontSize: 14 }}>
          {sub}
        </Text>
      </View>
      <ChevronRight size={20} color={hex.mutedForeground} />
    </Pressable>
  );
}
