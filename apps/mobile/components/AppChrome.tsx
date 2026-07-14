import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  DollarSign,
  Home,
  LogOut,
  Plus,
  Settings,
  Shield,
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
import { NAV_ICON_SIZE, PAGE_TITLE_LINE_HEIGHT } from '@/lib/tokens';
import { useColors, useHex, useThemeStyles, useThemeTokens } from '@/lib/theme';

const NAV_MAIN = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/treasury', label: 'Treasury', icon: DollarSign, exact: false },
  { to: '/trades', label: 'Trades', icon: ArrowLeftRight, exact: false },
  { to: '/analytics', label: 'Stats', icon: BarChart3, exact: false },
] as const;

const HEADER_AVATAR_SIZE = PAGE_TITLE_LINE_HEIGHT;

/** Combined profile + league switcher, inline with page headers. */
export function HeaderAvatarButton() {
  const { user, leagues, active, setActiveId, signOut } = useLeague();
  const hex = useHex();
  const [open, setOpen] = useState(false);
  if (!active || !user) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          height: HEADER_AVATAR_SIZE,
          width: HEADER_AVATAR_SIZE,
          marginLeft: 12,
          flexShrink: 0,
        }}
      >
        <View style={{ position: 'relative', height: HEADER_AVATAR_SIZE, width: HEADER_AVATAR_SIZE }}>
          <View
            style={{
              height: HEADER_AVATAR_SIZE,
              width: HEADER_AVATAR_SIZE,
              overflow: 'hidden',
              borderRadius: 9999,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.hairline,
            }}
          >
            <AvatarImage
              src={personAvatar(user.email || user.name || 'me')}
              name={user.name ?? 'Me'}
              size={HEADER_AVATAR_SIZE}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              height: 16,
              width: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9999,
              borderWidth: 1.5,
              borderColor: hex.background,
              backgroundColor: hex.foreground,
            }}
          >
            <ChevronDown size={9} color={hex.background} strokeWidth={2.5} />
          </View>
        </View>
      </Pressable>

      <AccountMenuSheet
        open={open}
        onClose={() => setOpen(false)}
        leagues={leagues}
        activeId={active.id}
        onSelectLeague={(id) => {
          setActiveId(id);
          setOpen(false);
        }}
        signOut={signOut}
        name={user.name ?? 'Member'}
        email={user.email ?? ''}
      />
    </>
  );
}

function AccountMenuSheet({
  open,
  onClose,
  leagues,
  activeId,
  onSelectLeague,
  signOut,
  name,
  email,
}: {
  open: boolean;
  onClose: () => void;
  leagues: League[];
  activeId: string;
  onSelectLeague: (id: string) => void;
  signOut: () => Promise<void>;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const c = useColors();
  const hex = useHex();
  const { layout, surfaces } = useThemeStyles();
  const { open: openCommissioner } = useCommissionerSheet();

  const go = (to: string) => {
    onClose();
    router.push(to as never);
  };

  const menuItems = [
    { icon: User, label: 'Profile', onPress: () => go('/profile') },
    { icon: Shield, label: 'Commissioner', onPress: () => { onClose(); openCommissioner(); } },
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

        <Text variant="eyebrow" style={{ paddingHorizontal: 8, marginBottom: 8 }}>
          Switch league
        </Text>
        <View style={surfaces.sheetGroup}>
          {leagues.map((l, i) => {
            const selected = l.id === activeId;
            return (
              <Pressable
                key={l.id}
                onPress={() => onSelectLeague(l.id)}
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

        <View style={[surfaces.sheetGroup, { marginTop: 16 }]}>
          {menuItems.map((it, i) => (
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

/* ------------------------------ Bottom Bar ------------------------------ */

export function BottomBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { surfaces, navFg } = useThemeTokens();
  const teamActive = isTabActive(pathname, '/team');

  const renderNavItem = (n: (typeof NAV_MAIN)[number]) => {
    const active = isTabActive(pathname, n.to);
    return (
      <Pressable
        key={n.to}
        onPress={() => {
          if (active) return;
          router.replace(n.to as never);
        }}
        style={[
          surfaces.navTab,
          { minWidth: 0 },
          active ? surfaces.navTabActive : null,
        ]}
      >
        <n.icon size={NAV_ICON_SIZE} color={navFg} strokeWidth={active ? 2 : 1.75} />
        <Text
          variant="navLabel"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={{ width: '100%', textAlign: 'center', color: navFg }}
        >
          {n.label}
        </Text>
      </Pressable>
    );
  };

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
        <View style={[surfaces.navBarFloat, { minWidth: 0 }]}>
          {NAV_MAIN.map(renderNavItem)}
        </View>
        <Pressable
          onPress={() => {
            if (teamActive) return;
            router.replace('/team' as never);
          }}
          style={[surfaces.navTeamCircle, teamActive ? surfaces.navTabActive : null]}
        >
          <Users size={NAV_ICON_SIZE} color={navFg} strokeWidth={teamActive ? 2 : 1.75} />
          <Text
            variant="navLabel"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{ color: navFg }}
          >
            Team
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
