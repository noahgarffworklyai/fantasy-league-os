import { useRouter, usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useLeague } from '@/lib/league-context';

const PUBLIC_PREFIXES = ['/welcome', '/auth'];

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/');
}

/** Redirect unauthenticated users to welcome; send new users without leagues to onboarding. */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { initialized } = useAuthStore();
  const { user, leagues, leaguesLoading, authInitialized } = useLeague();

  useEffect(() => {
    if (!initialized || !authInitialized || leaguesLoading) return;

    if (!user) {
      if (!isPublicPath(pathname)) {
        router.replace('/welcome');
      }
      return;
    }

    if (isPublicPath(pathname)) {
      router.replace(leagues.length === 0 ? '/onboarding' : '/');
      return;
    }

    if (leagues.length === 0 && !isOnboardingPath(pathname) && pathname !== '/readiness' && pathname !== '/invite') {
      router.replace('/onboarding');
    }
  }, [initialized, authInitialized, leaguesLoading, user, leagues.length, pathname, router]);

  return children;
}
