import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import {
  Bell,
  Check,
  ChevronDown,
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
import { Pressable, Text, View } from './ui/primitives';
import { AvatarImage } from './ui/AvatarImage';
import { Sheet } from './ui/Sheet';
import { useCommissionerSheet } from '@/lib/commissioner-sheet-context';
import { leagueSubtitle, useLeague, type League } from '@/lib/league-context';
import { personAvatar } from '@/lib/avatars';
import { isTabActive } from '@/lib/nav';
import { useColors, useHex, useTheme, useThemeStyles } from '@/lib/theme';

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
  const hex = useHex();
  const { scheme } = useTheme();
  const { layout, surfaces } = useThemeStyles();
  const [switcher, setSwitcher] = useState(false);
  const [menu, setMenu] = useState(false);
  if (!active) return null;

  return (
    <View style={{ width: '100%', paddingTop: Math.max(insets.top, 12), backgroundColor: hex.background }}>
      <View style={[layout.rowBetween, { width: '100%', paddingHorizontal: 16, paddingBottom: 8 }]}>
        <Pressable
          onPress={() => setSwitcher(true)}
          style={[
            layout.row,
            layout.flex1,
            surfaces.pill,
            {
              height: 36,
              gap: 6,
              paddingHorizontal: 14,
              marginRight: 12,
              minWidth: 0,
              backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(13,13,13,0.06)',
            },
          ]}
        >
          <Text variant="link" numberOfLines={1} style={{ flex: 1, minWidth: 0, opacity: 0.9 }}>
            {active.name}
          </Text>
          <ChevronDown size={14} color={c.foreground} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => setMenu(true)}
          style={{
            height: 36,
            width: 36,
            overflow: 'hidden',
            borderRadius: 9999,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(13,13,13,0.1)',
          }}
        >
          <AvatarImage
            src={personAvatar(user?.email || user?.name || 'me')}
            name={user?.name ?? 'Me'}
            size={36}
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
  const hex = useHex();
  const { layout, surfaces } = useThemeStyles();
  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Switch League" scroll={false}>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={surfaces.sheetGroup}>
          {leagues.map((l, i) => {
            const selected = l.id === activeId;
            return (
              <Pressable
                key={l.id}
                onPress={() => onSelect(l.id)}
                style={[
                  layout.row,
                  { gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
                  i > 0 ? layout.listRowBorder : null,
                ]}
              >
                <View
                  style={[
                    layout.centered,
                    {
                      height: 40,
                      width: 40,
                      borderRadius: 14,
                      backgroundColor: 'rgba(13,13,13,0.9)',
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: hex.primaryForeground }}>
                    {l.shortName}
                  </Text>
                </View>
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="bodySm" numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text variant="bodyMuted" numberOfLines={1}>
                    {leagueSubtitle(l)}
                  </Text>
                </View>
                {selected ? <Check size={16} color={c.success} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={[layout.row, { marginTop: 16, gap: 8 }]}>
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
  const hex = useHex();
  const { layout } = useThemeStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[
        layout.flex1,
        layout.centered,
        {
          gap: 8,
          borderRadius: 20,
          backgroundColor: hex.surface,
          paddingVertical: 16,
        },
      ]}
    >
      <IconComp size={16} color={c.foreground} />
      <Text variant="caption">{label} League</Text>
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
  signOut: () => Promise<void>;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const c = useColors();
  const hex = useHex();
  const { layout, surfaces } = useThemeStyles();
  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };
  const items = [
    { icon: User, label: 'Profile', onPress: () => go('/profile') },
    { icon: Plus, label: 'Create a League', onPress: () => go('/onboarding/create') },
    { icon: UserPlus, label: 'Join a League', onPress: () => go('/onboarding/join') },
    { icon: Bell, label: 'Notifications', onPress: () => go('/profile') },
    { icon: Settings, label: 'Settings', onPress: () => go('/commissioner/settings') },
    { icon: CircleHelp, label: 'Help', onPress: () => go('/profile') },
    {
      icon: LogOut,
      label: 'Logout',
      onPress: async () => {
        onClose();
        await signOut();
      },
    },
  ];
  return (
    <Sheet open={open} onClose={onClose} scroll={false}>
      <View style={{ paddingHorizontal: 16 }}>
        <View style={[layout.row, { gap: 12, paddingHorizontal: 8, paddingBottom: 16 }]}>
          <AvatarImage src={personAvatar(email || name)} name={name} size={48} />
          <View style={[layout.flex1, { minWidth: 0 }]}>
            <Text variant="titleMd" numberOfLines={1}>
              {name}
            </Text>
            {email ? (
              <Text variant="bodyMuted" numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={surfaces.sheetGroup}>
          {items.map((it, i) => (
            <Pressable
              key={it.label}
              onPress={it.onPress}
              style={[
                layout.row,
                { gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
                i > 0 ? layout.listRowBorder : null,
              ]}
            >
              <it.icon size={16} color={it.label === 'Logout' ? c.destructive : c.foreground} />
              <Text
                variant="body"
                style={[
                  layout.flex1,
                  it.label === 'Logout' ? { color: hex.danger } : null,
                ]}
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
  const c = useColors();
  const hex = useHex();
  const { scheme } = useTheme();
  const { layout } = useThemeStyles();

  const barBg = scheme === 'dark' ? 'rgba(8,8,8,0.92)' : 'rgba(242,242,242,0.92)';

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingTop: 8,
      }}
      pointerEvents="box-none"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            borderRadius: 9999,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hex.hairline,
            backgroundColor: barBg,
            paddingHorizontal: 8,
            paddingVertical: 6,
            overflow: 'hidden',
          }}
        >
          {NAV.map((n) => {
            const active = isTabActive(pathname, n.to);
            return (
              <Pressable
                key={n.to}
                onPress={() => {
                  if (active) return;
                  router.replace(n.to as never);
                }}
                style={[
                  layout.flex1,
                  layout.centered,
                  { gap: 2, borderRadius: 9999, paddingVertical: 6, minWidth: 0 },
                  active ? { backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(13,13,13,0.05)' } : null,
                ]}
              >
                <n.icon
                  size={20}
                  color={active ? c.foreground : c.mutedForeground}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <Text
                  variant="pill"
                  numberOfLines={1}
                  style={{ color: active ? hex.foreground : hex.mutedForeground }}
                >
                  {n.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={open}
          style={[
            layout.centered,
            {
              height: 58,
              width: 58,
              flexShrink: 0,
              borderRadius: 9999,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.hairline,
              backgroundColor: barBg,
            },
          ]}
        >
          <View
            style={[
              layout.centered,
              {
                height: 28,
                width: 28,
                borderRadius: 9999,
                backgroundColor: hex.primary,
              },
            ]}
          >
            <View
              style={{
                height: 6,
                width: 6,
                borderRadius: 9999,
                backgroundColor: hex.success,
              }}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
