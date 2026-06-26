import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { palettes, type ColorScheme } from './colors';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'commissioner.theme';

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: (typeof palettes)['light'];
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  // Default to light on first paint (matches the wireframe), then hydrate.
  useEffect(() => {
    setColorScheme('light');
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemePreference | null;
        if (stored) {
          setPreferenceState(stored);
          setColorScheme(stored);
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    setColorScheme(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <ThemeContext.Provider
      value={{ preference, scheme, colors: palettes[scheme], setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Convenience hook returning the active palette. */
export function useColors() {
  return useTheme().colors;
}
