import { type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Apple, ChevronLeft, Mail } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { useLeague, type AuthProvider } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

export default function AuthPage() {
  const { signIn } = useLeague();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();

  const handle = (provider: AuthProvider) => {
    const presets: Record<AuthProvider, { name: string; email: string }> = {
      apple: { name: 'You', email: 'you@icloud.com' },
      google: { name: 'You', email: 'you@gmail.com' },
      email: { name: 'You', email: 'you@commissioner.app' },
    };
    signIn({ ...presets[provider], provider });
    nav.push('/onboarding');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: hex.background,
        paddingHorizontal: 24,
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <View style={layout.row}>
        <Pressable
          onPress={() => nav.push('/welcome')}
          style={[layout.row, { marginLeft: -8, gap: 2, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 4 }]}
        >
          <ChevronLeft size={20} color={hex.foreground} />
          <Text variant="body">Back</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 40 }}>
        <Text variant="hero">Sign in to Commissioner</Text>
        <Text variant="bodyMuted" style={{ marginTop: 12, fontSize: 15 }}>
          Use your Apple, Google, or email to continue.
        </Text>
      </View>

      <View style={{ marginTop: 40, gap: 12 }}>
        <AuthButton onPress={() => handle('apple')} label="Continue with Apple" dark>
          <Apple size={20} color={hex.background} />
        </AuthButton>
        <AuthButton onPress={() => handle('google')} label="Continue with Google">
          <Text variant="button">G</Text>
        </AuthButton>
        <AuthButton onPress={() => handle('email')} label="Continue with Email">
          <Mail size={20} color={hex.foreground} />
        </AuthButton>
      </View>

      <View style={layout.fill} />
      <Text variant="bodyMuted" style={{ paddingTop: 24, textAlign: 'center' }}>
        We never post on your behalf.
      </Text>
    </View>
  );
}

function AuthButton({
  onPress,
  label,
  children,
  dark,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  dark?: boolean;
}) {
  const { hex, surfaces } = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[surfaces.authButton, dark ? surfaces.authButtonDark : surfaces.authButtonLight]}
    >
      {children}
      <Text variant="button" style={{ color: dark ? hex.primaryForeground : hex.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}
