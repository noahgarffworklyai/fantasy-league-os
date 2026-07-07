import { Redirect, usePathname } from 'expo-router';
import { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/primitives';
import { useAuthStore } from '@/lib/auth-store';
import { useLeague } from '@/lib/league-context';
import { useThemeTokens } from '@/lib/theme';

const PUBLIC_PREFIXES = ['/welcome', '/auth'];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}

/** Flows existing users can open to add another league. */
function isLeagueSetupPath(pathname: string) {
  return (
    pathname === '/onboarding/create' ||
    pathname === '/onboarding/join' ||
    pathname === '/onboarding/sync' ||
    pathname.startsWith('/onboarding/create/') ||
    pathname.startsWith('/onboarding/join/') ||
    pathname.startsWith('/onboarding/sync/')
  );
}

/** Declarative redirects — Stack stays mounted so navigation always works. */
function AuthRedirect() {
  const pathname = usePathname();
  const { initialized } = useAuthStore();
  const { user, leagues, leaguesLoading, authInitialized } = useLeague();

  const ready = initialized && authInitialized && !leaguesLoading;
  if (!ready) return null;

  if (!user) {
    if (!isPublicPath(pathname)) {
      return <Redirect href="/welcome" />;
    }
    return null;
  }

  if (isPublicPath(pathname)) {
    return <Redirect href={leagues.length === 0 ? '/onboarding' : '/'} />;
  }

  if (leagues.length > 0 && pathname === '/onboarding') {
    return <Redirect href="/" />;
  }

  if (
    leagues.length === 0 &&
    !isOnboardingPath(pathname) &&
    !isLeagueSetupPath(pathname) &&
    pathname !== '/readiness' &&
    pathname !== '/invite'
  ) {
    return <Redirect href="/onboarding" />;
  }

  return null;
}

/** Boot overlay while auth/leagues hydrate — never unmount the navigator. */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { hex, layout } = useThemeTokens();
  const { initialized } = useAuthStore();
  const { user, leaguesLoading, authInitialized } = useLeague();

  const booting = !initialized || !authInitialized || (!!user && leaguesLoading);
  const showBootOverlay = booting && !isPublicPath(pathname);

  return (
    <>
      <AuthRedirect />
      {children}
      {showBootOverlay ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            layout.centered,
            { backgroundColor: hex.background, gap: 12, zIndex: 100 },
          ]}
        >
          <ActivityIndicator color={hex.primary} />
          <Text variant="bodyMuted">Loading…</Text>
        </View>
      ) : null}
    </>
  );
}
