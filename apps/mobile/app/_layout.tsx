import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomBar, TopChrome } from '@/components/AppChrome';
import { CommissionerSheet } from '@/components/CommissionerSheet';
import { CommissionerSheetProvider } from '@/lib/commissioner-sheet-context';
import { LeagueProvider, useLeague } from '@/lib/league-context';
import { ThemeProvider, useTheme } from '@/lib/theme';

const queryClient = new QueryClient();

const ONBOARDING_PATHS = ['/welcome', '/auth', '/onboarding'];
function isOnboardingPath(p: string) {
  return ONBOARDING_PATHS.some((x) => p === x || p.startsWith(x + '/'));
}

function Shell() {
  const pathname = usePathname();
  const { user, leagues } = useLeague();
  const { scheme } = useTheme();
  const showChrome = !!user && leagues.length > 0 && !isOnboardingPath(pathname);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {showChrome ? <TopChrome /> : null}
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'slide_from_right',
          }}
        />
      </View>
      {showChrome ? <BottomBar /> : null}
      <CommissionerSheet />
    </View>
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
