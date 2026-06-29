import { useRouter } from 'expo-router';
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Trophy,
  UserPlus,
  Wallet,
} from 'lucide-react-native';
import { Pressable, Text, View } from './ui/primitives';
import { Sheet } from './ui/Sheet';
import { useCommissionerSheet } from '@/lib/commissioner-sheet-context';
import { useLeague, type League, type SeasonStage } from '@/lib/league-context';
import { useThemeTokens } from '@/lib/theme';

type ActionKey = 'league' | 'treasury' | 'draft' | 'reports' | 'settings';

interface ActionDef {
  key: ActionKey;
  label: string;
  sub: string;
  icon: typeof Trophy;
  to: string;
  badge?: (l: League) => string | null;
}

const ACTIONS: ActionDef[] = [
  {
    key: 'league',
    label: 'League',
    sub: 'Members, rules & history',
    icon: Trophy,
    to: '/commissioner/league',
    badge: (l) =>
      l.joined !== undefined && l.size && l.joined < l.size
        ? `${l.size - l.joined} pending invites`
        : null,
  },
  {
    key: 'treasury',
    label: 'Treasury',
    sub: 'Pot, payments & payouts',
    icon: Wallet,
    to: '/treasury',
    badge: (l) =>
      l.paid !== undefined && l.size && l.paid < l.size ? `${l.size - l.paid} unpaid members` : null,
  },
  {
    key: 'draft',
    label: 'Draft',
    sub: 'Board, queue & readiness',
    icon: ClipboardList,
    to: '/draft',
    badge: (l) => (l.stage === 'preseason' || l.stage === 'draft' ? 'Draft soon' : null),
  },
  {
    key: 'reports',
    label: 'Reports',
    sub: 'Weekly recaps & insights',
    icon: BarChart3,
    to: '/commissioner/reports',
    badge: (l) => (l.stage === 'regular' || l.stage === 'playoffs' ? 'New weekly report' : null),
  },
  {
    key: 'settings',
    label: 'Settings',
    sub: 'Configuration & preferences',
    icon: SettingsIcon,
    to: '/commissioner/settings',
  },
];

const HIGHLIGHT: Record<SeasonStage, ActionKey[]> = {
  preseason: ['league', 'treasury', 'draft'],
  draft: ['draft', 'league', 'treasury'],
  regular: ['reports', 'treasury', 'league', 'settings'],
  playoffs: ['reports', 'treasury'],
  offseason: ['league', 'reports'],
};

export function CommissionerSheet() {
  const { state, close } = useCommissionerSheet();
  const { active } = useLeague();
  const { layout } = useThemeTokens();

  return (
    <Sheet open={state.open} onClose={close} scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={[layout.rowBetween, { marginBottom: 8 }]}>
          <Text variant="eyebrow" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Commissioner
          </Text>
          <Text variant="bodySm">{active ? active.name : 'Get started'}</Text>
          <View style={{ width: 80 }} />
        </View>
        {active ? <Launcher league={active} onPick={close} /> : <OnboardingLauncher onPick={close} />}
      </View>
    </Sheet>
  );
}

function Launcher({ league, onPick }: { league: League; onPick: () => void }) {
  const router = useRouter();
  const { hex, layout, surfaces } = useThemeTokens();
  return (
    <View style={[surfaces.card, { borderWidth: 1, borderColor: hex.hairline }]}>
      {ACTIONS.map((a, i) => {
        const badge = a.badge?.(league) ?? null;
        return (
          <Pressable
            key={a.key}
            onPress={() => {
              onPick();
              router.push(a.to as never);
            }}
            style={[layout.row, { gap: 16, paddingHorizontal: 16, paddingVertical: 16 }, i > 0 ? layout.listRowBorder : null]}
          >
            <View style={[surfaces.iconBox, { borderRadius: 9999, backgroundColor: hex.muted }]}>
              <a.icon size={19} color={hex.foreground} strokeWidth={2} />
            </View>
            <View style={[layout.flex1, { minWidth: 0 }]}>
              <Text variant="titleMd">{a.label}</Text>
              <Text variant="subtitle" numberOfLines={1}>
                {a.sub}
              </Text>
            </View>
            {badge ? (
              <View style={[surfaces.pillMuted, { paddingHorizontal: 8, paddingVertical: 2 }]}>
                <Text variant="caption">{badge}</Text>
              </View>
            ) : null}
            <ChevronRight size={16} color={hex.mutedForeground} />
          </Pressable>
        );
      })}
    </View>
  );
}

function OnboardingLauncher({ onPick }: { onPick: () => void }) {
  const router = useRouter();
  const { hex, layout, surfaces } = useThemeTokens();
  const items = [
    { to: '/onboarding/create', icon: Plus, title: 'Create a League', sub: 'Start a new league in Commissioner.' },
    { to: '/onboarding/join', icon: UserPlus, title: 'Join a League', sub: 'Enter an invite from your commissioner.' },
    { to: '/onboarding/sync', icon: RefreshCw, title: 'Sync Existing League', sub: 'Connect ESPN, Sleeper, or Yahoo.' },
  ] as const;
  return (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <Text variant="body" muted style={{ paddingHorizontal: 8, paddingBottom: 4 }}>
        Add your first league.
      </Text>
      <View style={surfaces.sheetGroup}>
        {items.map((it, i) => (
          <Pressable
            key={it.to}
            onPress={() => {
              onPick();
              router.push(it.to as never);
            }}
            style={[layout.row, { gap: 16, paddingHorizontal: 16, paddingVertical: 14 }, i > 0 ? layout.listRowBorder : null]}
          >
            <View style={surfaces.iconBoxDark}>
              <it.icon size={18} color={hex.background} strokeWidth={2.25} />
            </View>
            <View style={[layout.flex1, { minWidth: 0 }]}>
              <Text variant="titleMd">{it.title}</Text>
              <Text variant="subtitle" numberOfLines={1}>
                {it.sub}
              </Text>
            </View>
            <ChevronRight size={16} color={hex.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
