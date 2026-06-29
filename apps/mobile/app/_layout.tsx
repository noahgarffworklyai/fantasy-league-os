import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomBar, TopChrome } from '@/components/AppChrome';
import { AuthGate } from '@/components/AuthGate';
import { CommissionerSheet } from '@/components/CommissionerSheet';
import { CommissionerSheetProvider } from '@/lib/commissioner-sheet-context';
import { LeagueProvider, useLeague } from '@/lib/league-context';
import { ThemeProvider, useTheme, useHex } from '@/lib/theme';

const queryClient = new QueryClient();

const ONBOARDING_PATHS = ['/welcome', '/auth', '/onboarding'];
function isOnboardingPath(p: string) {
  return ONBOARDING_PATHS.some((x) => p === x || p.startsWith(x + '/'));
}

/** Main bottom-bar destinations — instant switch, no stack slide. */
const TAB_SCREEN_OPTIONS = { animation: 'none' as const };

function Shell() {
  const pathname = usePathname();
  const { user, leagues, authInitialized, leaguesLoading } = useLeague();
  const { scheme } = useTheme();
  const hex = useHex();
  const showChrome =
    authInitialized &&
    !leaguesLoading &&
    !!user &&
    leagues.length > 0 &&
    !isOnboardingPath(pathname);

  return (
    <AuthGate>
      <View style={{ flex: 1, backgroundColor: hex.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {showChrome ? <TopChrome /> : null}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={TAB_SCREEN_OPTIONS} />
          <Stack.Screen name="team" options={TAB_SCREEN_OPTIONS} />
          <Stack.Screen name="league" options={TAB_SCREEN_OPTIONS} />
          <Stack.Screen name="players" options={TAB_SCREEN_OPTIONS} />
        </Stack>
      </View>
      {showChrome ? <BottomBar /> : null}
      <CommissionerSheet />
      </View>
    </AuthGate>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LeagueProvider>
            <CommissionerSheetProvider>
              <Shell />
            </CommissionerSheetProvider>
          </LeagueProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
