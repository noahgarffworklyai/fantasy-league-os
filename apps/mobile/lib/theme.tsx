import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colorScheme as nwColorScheme } from 'nativewind';
import { hexForScheme, palettes, type ColorScheme, type HexPalette } from './colors';
import { darkTokens, lightTokens, type TokenSet } from './tokens';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'commissioner.theme';

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: (typeof palettes)['light'];
  hex: HexPalette;
  tokens: TokenSet;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(preference: ThemePreference, systemScheme: ColorScheme | null | undefined): ColorScheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const scheme = resolveScheme(preference, systemScheme);

  useEffect(() => {
    nwColorScheme.set(scheme);
  }, [scheme]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(() => {
    const hex = hexForScheme(scheme);
    return {
      preference,
      scheme,
      colors: palettes[scheme],
      hex,
      tokens: scheme === 'dark' ? darkTokens : lightTokens,
      setPreference,
    };
  }, [preference, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Convenience hook returning the active palette (for icon colors, etc.). */
export function useColors() {
  return useTheme().colors;
}

/** Active hex tokens for inline styles. */
export function useHex() {
  return useTheme().hex;
}

/** Active StyleSheet token set (type, layout, surfaces, toneBg, toneFg). */
export function useThemeStyles() {
  return useTheme().tokens;
}

/** Shorthand: hex + all token styles in one hook. */
export function useThemeTokens() {
  const { hex, tokens } = useTheme();
  return { hex, ...tokens };
}
