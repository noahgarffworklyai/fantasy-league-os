import { TextInput, type TextInputProps } from 'react-native';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

type Props = TextInputProps & { className?: string };

/** Themed text input matching the wireframe field style. */
export function Input({ className, ...props }: Props) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      className={cn(
        'h-14 w-full rounded-2xl bg-surface-elevated px-4 text-[17px] tracking-tightish text-foreground',
        className,
      )}
      {...props}
    />
  );
}
