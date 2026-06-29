import { useRouter } from 'expo-router';

/** Bottom-bar tab roots — switching between these should not stack or slide. */
export const TAB_ROUTES = ['/', '/team', '/league', '/players'] as const;

export function isTabRoute(path: string) {
  return TAB_ROUTES.some((t) => t === path || (t !== '/' && path.startsWith(t)));
}

export function isTabActive(pathname: string, tab: string) {
  return tab === '/' ? pathname === '/' : pathname.startsWith(tab);
}

/**
 * Thin wrapper over expo-router that accepts plain string paths.
 * (Typed routes are disabled; this keeps call sites clean.)
 */
export function useNav() {
  const router = useRouter();
  return {
    push: (path: string) => router.push(path as never),
    navigate: (path: string) => router.navigate(path as never),
    replace: (path: string) => router.replace(path as never),
    /** Instant tab switch — replaces current screen, no slide animation. */
    switchTab: (path: string) => router.replace(path as never),
    back: () => router.back(),
  };
}
