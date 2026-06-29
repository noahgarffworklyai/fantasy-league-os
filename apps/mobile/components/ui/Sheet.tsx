import { type ReactNode } from 'react';
import { Modal, Pressable, View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from './primitives';
import { useColors, useHex } from '@/lib/theme';
import { layout } from '@/lib/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Render children inside a ScrollView (default true). */
  scroll?: boolean;
  children: ReactNode;
  /** Max height as a fraction of the screen (default 0.92). */
  heightFraction?: number;
};

/** Bottom sheet modal with a grab handle, header, and backdrop. */
export function Sheet({ open, onClose, title, scroll = true, children, heightFraction = 0.92 }: Props) {
  const c = useColors();
  const hex = useHex();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = windowHeight * heightFraction;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View>{children}</View>
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.panel,
            {
              maxHeight,
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: hex.surfaceElevated,
            },
          ]}
        >
          <View style={[layout.centered, { paddingTop: 10 }]}>
            <View style={styles.handle} />
          </View>
          {title ? (
            <View style={[layout.rowBetween, { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12 }]}>
              <Text variant="titleLg">{title}</Text>
              <Pressable
                onPress={onClose}
                style={[layout.centered, layout.iconButtonSm, { backgroundColor: 'rgba(13,13,13,0.05)' }]}
              >
                <X size={16} color={c.foreground} />
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingTop: 6 }} />
          )}
          <View style={title ? undefined : { paddingTop: 8 }}>{body}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  handle: {
    height: 6,
    width: 40,
    borderRadius: 9999,
    backgroundColor: 'rgba(13,13,13,0.15)',
  },
});
