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
import { View } from 'react-native';
import { Pressable, Text } from './ui/primitives';
import { Sheet } from './ui/Sheet';
import { useCommissionerSheet } from '@/lib/commissioner-sheet-context';
import { useLeague, type League, type SeasonStage } from '@/lib/league-context';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

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

  return (
    <Sheet open={state.open} onClose={close} scroll={false}>
      <View className="px-4 pb-2">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            Commissioner
          </Text>
          <Text className="text-[15px] font-semibold tracking-tightish">
            {active ? active.name : 'Get started'}
          </Text>
          <View className="w-20" />
        </View>
        {active ? <Launcher league={active} onPick={close} /> : <OnboardingLauncher onPick={close} />}
      </View>
    </Sheet>
  );
}

function Launcher({ league, onPick }: { league: League; onPick: () => void }) {
  const router = useRouter();
  const c = useColors();
  return (
    <View className="overflow-hidden rounded-[30px] border border-hairline bg-surface">
      {ACTIONS.map((a, i) => {
        const badge = a.badge?.(league) ?? null;
        return (
          <Pressable
            key={a.key}
            onPress={() => {
              onPick();
              router.push(a.to as never);
            }}
            className={cn(
              'w-full flex-row items-center gap-4 px-4 py-4',
              i > 0 ? 'border-t border-hairline' : '',
            )}
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
              <a.icon size={19} color={c.foreground} strokeWidth={2} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-semibold tracking-tightish">{a.label}</Text>
              <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                {a.sub}
              </Text>
            </View>
            {badge ? (
              <View className="rounded-full bg-muted px-2 py-0.5">
                <Text className="text-[11px] font-medium text-muted-foreground">{badge}</Text>
              </View>
            ) : null}
            <ChevronRight size={16} color={c.mutedForeground} />
          </Pressable>
        );
      })}
    </View>
  );
}

function OnboardingLauncher({ onPick }: { onPick: () => void }) {
  const router = useRouter();
  const c = useColors();
  const items = [
    { to: '/onboarding/create', icon: Plus, title: 'Create a League', sub: 'Start a new league in Commissioner.' },
    { to: '/onboarding/join', icon: UserPlus, title: 'Join a League', sub: 'Enter an invite from your commissioner.' },
    { to: '/onboarding/sync', icon: RefreshCw, title: 'Sync Existing League', sub: 'Connect ESPN, Sleeper, or Yahoo.' },
  ] as const;
  return (
    <View className="gap-2 pt-2">
      <Text className="px-2 pb-1 text-[15px] text-muted-foreground">Add your first league.</Text>
      <View className="overflow-hidden rounded-[24px] bg-surface">
        {items.map((it, i) => (
          <Pressable
            key={it.to}
            onPress={() => {
              onPick();
              router.push(it.to as never);
            }}
            className={cn(
              'w-full flex-row items-center gap-4 px-4 py-3.5',
              i > 0 ? 'border-t border-hairline' : '',
            )}
          >
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-foreground">
              <it.icon size={18} color={c.background} strokeWidth={2.25} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-semibold tracking-tightish">{it.title}</Text>
              <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                {it.sub}
              </Text>
            </View>
            <ChevronRight size={16} color={c.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
