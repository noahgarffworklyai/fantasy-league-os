import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@flos/shared';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

export default function AuthPage() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isSignup = mode !== 'signin';
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();
  const { login, register, loading } = useAuthStore();
  const { refreshLeagues } = useLeague();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const submit = async () => {
    try {
      if (isSignup) {
        await register(email.trim(), password, displayName.trim() || 'Commissioner');
      } else {
        await login(email.trim(), password);
      }
      const leagues = await refreshLeagues();
      nav.replace(leagues.length === 0 ? '/onboarding' : '/');
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Something went wrong. Check your connection and try again.';
      Alert.alert(isSignup ? 'Sign up failed' : 'Sign in failed', message);
    }
  };

  const canSubmit =
    email.trim().includes('@') &&
    password.length >= 8 &&
    (!isSignup || displayName.trim().length > 0);

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
      <Pressable
        onPress={() => nav.push('/welcome')}
        style={[layout.row, { marginLeft: -8, gap: 2, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 4 }]}
      >
        <ChevronLeft size={20} color={hex.foreground} />
        <Text variant="body">Back</Text>
      </Pressable>

      <View style={{ marginTop: 32 }}>
        <Text variant="hero">{isSignup ? 'Create your account' : 'Welcome back'}</Text>
        <Text variant="bodyMuted" style={{ marginTop: 12, fontSize: 15 }}>
          {isSignup
            ? 'Use email and password to get started.'
            : 'Sign in with the account you created.'}
        </Text>
      </View>

      <View style={{ marginTop: 32, gap: 12 }}>
        {isSignup ? (
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            autoCapitalize="words"
          />
        ) : null}
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password (8+ characters)"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <Pressable
        disabled={!canSubmit || loading}
        onPress={submit}
        style={[
          surfaces.primaryButton,
          { marginTop: 24 },
          !canSubmit || loading ? { opacity: 0.5 } : null,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={hex.primaryForeground} />
        ) : (
          <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
            {isSignup ? 'Create Account' : 'Sign In'}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => nav.replace(isSignup ? '/auth?mode=signin' : '/auth?mode=signup')}
        style={{ marginTop: 16, alignItems: 'center' }}
      >
        <Text variant="link" muted>
          {isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </Text>
      </Pressable>

      <View style={layout.fill} />
      <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
        Apple and Google sign-in coming soon.
      </Text>
    </View>
  );
}
