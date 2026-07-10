import { type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_BAR_SPACE } from './WorkflowShell';
import { useHex } from '@/lib/theme';

/** Scrollable screen body for the main tabs. */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const hex = useHex();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: hex.background }}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: BOTTOM_BAR_SPACE + insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  );
}
