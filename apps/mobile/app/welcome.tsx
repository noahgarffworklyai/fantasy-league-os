import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

export default function WelcomePage() {
  const insets = useSafeAreaInsets();
  const nav = useNav();
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
      <View style={[layout.fill, { justifyContent: 'center', alignItems: 'flex-start' }]}>
        <View
          style={{
            height: 56,
            width: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 22,
            backgroundColor: hex.primary,
          }}
        >
          <Trophy size={28} color={hex.background} strokeWidth={2.25} />
        </View>
        <Text variant="hero" style={{ marginTop: 40, fontSize: 40, lineHeight: 42 }}>
          Run your fantasy league in one place.
        </Text>
        <Text variant="subtitle" style={{ marginTop: 20, fontSize: 17, lineHeight: 24, maxWidth: 280 }}>
          Draft, manage your team, collect dues, follow players, and keep your league active all
          season.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Pressable onPress={() => nav.push('/auth?mode=signup')} style={surfaces.primaryButton}>
          <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
            Get Started
          </Text>
        </Pressable>
        <Pressable onPress={() => nav.push('/auth?mode=signin')} style={surfaces.secondaryButton}>
          <Text variant="button" style={{ fontSize: 17 }}>
            Sign In
          </Text>
        </Pressable>
        <Text variant="bodyMuted" style={{ paddingTop: 8, textAlign: 'center' }}>
          By continuing you agree to our Terms & Privacy.
        </Text>
      </View>
    </View>
  );
}
