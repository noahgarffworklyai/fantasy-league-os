import { type ReactNode } from 'react';
import { Modal, Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from './primitives';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

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
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ paddingBottom: insets.bottom + 24 }}>{children}</View>
  );

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-[30px] bg-surface-elevated"
          style={{ maxHeight: `${heightFraction * 100}%` }}
        >
          <View className="items-center pt-2.5">
            <View className="h-1.5 w-10 rounded-full bg-foreground/15" />
          </View>
          {title ? (
            <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
              <Text className="text-[18px] font-semibold tracking-tightish">{title}</Text>
              <Pressable
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-foreground/5"
              >
                <X size={16} color={c.foreground} />
              </Pressable>
            </View>
          ) : (
            <View className="pt-1.5" />
          )}
          <View className={cn(title ? '' : 'pt-2')}>{body}</View>
        </View>
      </View>
    </Modal>
  );
}
