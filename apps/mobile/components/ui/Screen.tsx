import { type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_BAR_SPACE } from './WorkflowShell';

/** Scrollable screen body for the main tabs (top chrome is rendered globally). */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
