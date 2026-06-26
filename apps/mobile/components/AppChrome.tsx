import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Home,
  LogOut,
  Plus,
  Search,
  Settings,
  Trophy,
  User,
  UserPlus,
  Users,
  Wifi,
} from 'lucide-react-native';
import { Pressable, Text } from './ui/primitives';
import { AvatarImage } from './ui/AvatarImage';
import { Sheet } from './ui/Sheet';
import { useCommissionerSheet } from '@/lib/commissioner-sheet-context';
import { leagueSubtitle, useLeague, type League } from '@/lib/league-context';
import { personAvatar } from '@/lib/avatars';
import { useColors, useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/team', label: 'Team', icon: Users, exact: false },
  { to: '/league', label: 'League', icon: Trophy, exact: false },
  { to: '/players', label: 'Players', icon: Search, exact: false },
] as const;

/* ------------------------------ Top Chrome ------------------------------ */

export function TopChrome() {
  const insets = useSafeAreaInsets();
  const { user, leagues, active, setActiveId, signOut } = useLeague();
  const c = useColors();
  const [switcher, setSwitcher] = useState(false);
  const [menu, setMenu] = useState(false);
  if (!active) return null;

  const initials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'MJ';

  return (
    <View style={{ paddingTop: Math.max(insets.top, 12) }} className="bg-background">
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Pressable
          onPress={() => setSwitcher(true)}
          className="h-9 flex-row items-center gap-1.5 rounded-full bg-foreground/[0.06] px-3.5"
        >
          <Text className="max-w-[180px] text-[13px] font-medium tracking-tightish text-foreground/90" numberOfLines={1}>
            {active.name}
          </Text>
          <ChevronDown size={14} color={c.foreground} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => setMenu(true)}
          className="h-9 w-9 overflow-hidden rounded-full border border-foreground/10"
        >
          <AvatarImage
            src={personAvatar(user?.email || user?.name || 'me')}
            name={user?.name ?? 'Me'}
            className="h-9 w-9"
          />
        </Pressable>
      </View>

      <LeagueSwitcherSheet
        open={switcher}
        onClose={() => setSwitcher(false)}
        leagues={leagues}
        activeId={active.id}
        onSelect={(id) => {
          setActiveId(id);
          setSwitcher(false);
        }}
      />

      <ProfileMenuSheet
        open={menu}
        onClose={() => setMenu(false)}
        signOut={signOut}
        name={user?.name ?? 'Marc Jackson'}
        email={user?.email ?? ''}
      />
    </View>
  );
}

function LeagueSwitcherSheet({
  open,
  onClose,
  leagues,
  activeId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  leagues: League[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const c = useColors();
  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Switch League" scroll={false}>
      <View className="px-4">
        <View className="overflow-hidden rounded-[24px] bg-surface">
          {leagues.map((l, i) => {
            const selected = l.id === activeId;
            return (
              <Pressable
                key={l.id}
                onPress={() => onSelect(l.id)}
                className={cn(
                  'w-full flex-row items-center gap-3 px-4 py-3.5',
                  i > 0 ? 'border-t border-foreground/[0.06]' : '',
                )}
              >
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-foreground/90">
                  <Text className="text-[12px] font-semibold text-background">{l.shortName}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold tracking-tightish" numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                    {leagueSubtitle(l)}
                  </Text>
                </View>
                {selected ? <Check size={16} color={c.success} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 flex-row gap-2">
          <SheetAction icon={Plus} label="Create" onPress={() => go('/onboarding/create')} />
          <SheetAction icon={UserPlus} label="Join" onPress={() => go('/onboarding/join')} />
          <SheetAction icon={Wifi} label="Sync" onPress={() => go('/onboarding/sync')} />
        </View>
      </View>
    </Sheet>
  );
}

function SheetAction({
  icon: IconComp,
  label,
  onPress,
}: {
  icon: typeof Plus;
  label: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-2 rounded-[20px] bg-surface py-4"
    >
      <IconComp size={16} color={c.foreground} />
      <Text className="text-[12px] font-medium tracking-tightish">{label} League</Text>
    </Pressable>
  );
}

function ProfileMenuSheet({
  open,
  onClose,
  signOut,
  name,
  email,
}: {
  open: boolean;
  onClose: () => void;
  signOut: () => void;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const c = useColors();
  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };
  const items = [
    { icon: User, label: 'Profile', onPress: () => go('/profile') },
    { icon: Bell, label: 'Notifications', onPress: () => go('/profile') },
    { icon: Settings, label: 'Settings', onPress: () => go('/commissioner/settings') },
    { icon: CircleHelp, label: 'Help', onPress: () => go('/profile') },
    {
      icon: LogOut,
      label: 'Logout',
      onPress: () => {
        onClose();
        signOut();
      },
    },
  ];
  return (
    <Sheet open={open} onClose={onClose} scroll={false}>
      <View className="px-4">
        <View className="flex-row items-center gap-3 px-2 pb-4">
          <AvatarImage src={personAvatar(email || name)} name={name} className="h-12 w-12" />
          <View className="min-w-0 flex-1">
            <Text className="text-[17px] font-semibold tracking-tighter2" numberOfLines={1}>
              {name}
            </Text>
            {email ? (
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="overflow-hidden rounded-[24px] bg-surface">
          {items.map((it, i) => (
            <Pressable
              key={it.label}
              onPress={it.onPress}
              className={cn(
                'w-full flex-row items-center gap-3 px-4 py-3.5',
                i > 0 ? 'border-t border-foreground/[0.06]' : '',
              )}
            >
              <it.icon size={16} color={it.label === 'Logout' ? c.destructive : c.foreground} />
              <Text
                className={cn(
                  'flex-1 text-[15px] tracking-tightish',
                  it.label === 'Logout' ? 'text-destructive' : '',
                )}
              >
                {it.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Sheet>
  );
}

/* ------------------------------ Bottom Bar ------------------------------ */

export function BottomBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useCommissionerSheet();
  const { scheme } = useTheme();
  const c = useColors();

  return (
    <View
      className="absolute inset-x-0 bottom-0 px-4"
      style={{ paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center gap-2">
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          className="flex-1 overflow-hidden rounded-full border border-hairline"
          style={{ borderRadius: 9999 }}
        >
          <View className="flex-row bg-background/40 px-2 py-1.5">
            {NAV.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Pressable
                  key={n.to}
                  onPress={() => router.navigate(n.to as never)}
                  className={cn(
                    'flex-1 items-center gap-0.5 rounded-full py-1.5',
                    active ? 'bg-foreground/5' : '',
                  )}
                >
                  <n.icon
                    size={20}
                    color={active ? c.foreground : c.mutedForeground}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  <Text
                    className={cn(
                      'text-[10px] font-medium tracking-wide',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {n.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
        <Pressable
          onPress={open}
          className="h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-background/60"
        >
          <View className="h-7 w-7 items-center justify-center rounded-full bg-foreground">
            <View className="h-1.5 w-1.5 rounded-full bg-success" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
