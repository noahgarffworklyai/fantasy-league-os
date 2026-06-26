import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Apple, ChevronLeft, Mail } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useLeague, type AuthProvider } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

export default function AuthPage() {
  const { signIn } = useLeague();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const c = useColors();

  // Social sign-in mirrors the wireframe. Real OAuth/backends can be wired
  // into handle() (e.g. expo-auth-session, /auth/login) without UI changes.
  const handle = (provider: AuthProvider) => {
    const presets: Record<AuthProvider, { name: string; email: string }> = {
      apple: { name: 'You', email: 'you@icloud.com' },
      google: { name: 'You', email: 'you@gmail.com' },
      email: { name: 'You', email: 'you@commissioner.app' },
    };
    signIn({ ...presets[provider], provider });
    nav.push('/onboarding');
  };

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View className="flex-row items-center">
        <Pressable
          onPress={() => nav.push('/welcome')}
          className="-ml-2 flex-row items-center gap-0.5 rounded-full px-2 py-1"
        >
          <ChevronLeft size={20} color={c.foreground} />
          <Text className="text-[15px]">Back</Text>
        </Pressable>
      </View>

      <View className="mt-10">
        <Text className="text-[34px] font-semibold leading-[36px] tracking-tighter2">
          Sign in to Commissioner
        </Text>
        <Text className="mt-3 text-[15px] text-muted-foreground">
          Use your Apple, Google, or email to continue.
        </Text>
      </View>

      <View className="mt-10 gap-3">
        <AuthButton onPress={() => handle('apple')} label="Continue with Apple" dark>
          <Apple size={20} color={c.background} />
        </AuthButton>
        <AuthButton onPress={() => handle('google')} label="Continue with Google">
          <Text className="text-[13px] font-bold text-foreground">G</Text>
        </AuthButton>
        <AuthButton onPress={() => handle('email')} label="Continue with Email">
          <Mail size={20} color={c.foreground} />
        </AuthButton>
      </View>

      <View className="flex-1" />
      <Text className="pt-6 text-center text-[12px] text-muted-foreground">
        We never post on your behalf.
      </Text>
    </View>
  );
}

function AuthButton({
  onPress,
  label,
  children,
  dark,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-14 w-full flex-row items-center justify-center gap-2.5 rounded-full',
        dark ? 'bg-foreground' : 'border border-hairline bg-surface-elevated',
      )}
    >
      {children}
      <Text
        className={cn(
          'text-[17px] font-semibold tracking-tightish',
          dark ? 'text-background' : 'text-foreground',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
