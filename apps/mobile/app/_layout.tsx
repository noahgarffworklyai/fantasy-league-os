import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, initialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, initialized, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-league/index" options={{ title: 'Create League' }} />
          <Stack.Screen name="invite/[token]" options={{ title: 'Join League' }} />
          <Stack.Screen name="league/[id]/index" options={{ title: 'League' }} />
          <Stack.Screen name="league/[id]/treasury" options={{ title: 'Treasury' }} />
          <Stack.Screen name="league/[id]/standings" options={{ title: 'Standings' }} />
          <Stack.Screen name="league/[id]/matchups" options={{ title: 'Matchups' }} />
          <Stack.Screen name="league/[id]/feed" options={{ title: 'League Feed' }} />
          <Stack.Screen name="league/[id]/community" options={{ title: 'Community' }} />
          <Stack.Screen name="league/[id]/settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="league/[id]/invite" options={{ title: 'Invite Members' }} />
          <Stack.Screen name="league/[id]/ai" options={{ title: 'AI Assistant' }} />
          <Stack.Screen name="payment/success" options={{ title: 'Payment', headerShown: false }} />
          <Stack.Screen name="payment/cancel" options={{ title: 'Payment Cancelled' }} />
          <Stack.Screen name="health" options={{ title: 'Health Check' }} />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}
