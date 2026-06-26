import { useRouter } from 'expo-router';

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
    back: () => router.back(),
  };
}
