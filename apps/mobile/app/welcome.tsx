import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';

export default function WelcomePage() {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const c = useColors();
  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View className="flex-1 items-start justify-center">
        <View className="h-14 w-14 items-center justify-center rounded-[22px] bg-foreground">
          <Trophy size={28} color={c.background} strokeWidth={2.25} />
        </View>
        <Text className="mt-10 text-[40px] font-semibold leading-[42px] tracking-tighter2">
          Run your fantasy league in one place.
        </Text>
        <Text className="mt-5 max-w-[28ch] text-[17px] leading-snug text-muted-foreground">
          Draft, manage your team, collect dues, follow players, and keep your league active all
          season.
        </Text>
      </View>

      <View className="gap-3">
        <Pressable
          onPress={() => nav.push('/auth?mode=signup')}
          className="h-14 w-full items-center justify-center rounded-full bg-foreground"
        >
          <Text className="text-[17px] font-semibold tracking-tightish text-background">
            Get Started
          </Text>
        </Pressable>
        <Pressable
          onPress={() => nav.push('/auth?mode=signin')}
          className="h-14 w-full items-center justify-center rounded-full bg-surface-elevated"
        >
          <Text className="text-[17px] font-semibold tracking-tightish text-foreground">
            Sign In
          </Text>
        </Pressable>
        <Text className="pt-2 text-center text-[12px] text-muted-foreground">
          By continuing you agree to our Terms & Privacy.
        </Text>
      </View>
    </View>
  );
}
