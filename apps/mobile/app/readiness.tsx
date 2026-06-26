import { View } from 'react-native';
import { AlertCircle, Check, ChevronRight, Circle } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Divider } from '@/components/ui/Card';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';

type Status = 'complete' | 'progress' | 'attention';
interface Item {
  key: string;
  label: string;
  sub: string;
  status: Status;
  action?: string;
  to?: string;
}

export default function ReadinessPage() {
  const { active } = useLeague();
  const nav = useNav();
  if (!active) return null;

  const items: Item[] = [
    { key: 'created', label: 'League Created', sub: active.name, status: 'complete' },
    {
      key: 'rules',
      label: 'Rules Complete',
      sub: `${active.scoring ?? 'Half PPR'} · ${active.size ?? active.members} teams`,
      status: 'complete',
    },
    {
      key: 'invites',
      label: 'Invite Members',
      sub: `${active.joined ?? 1} of ${active.size ?? active.members} joined`,
      status: 'progress',
      action: 'Send Invites',
      to: '/invite',
    },
    {
      key: 'dues',
      label: 'Collect Dues',
      sub: `${active.paid ?? 0} of ${active.size ?? active.members} paid`,
      status: 'attention',
      action: 'Collect Dues',
    },
    { key: 'order', label: 'Set Draft Order', sub: 'Randomize or set manually', status: 'attention', action: 'Set Draft Order' },
    {
      key: 'schedule',
      label: 'Schedule Draft',
      sub: active.draftDate ? active.draftDate : 'Pick a date and time',
      status: active.draftDate ? 'complete' : 'attention',
    },
    { key: 'ready', label: 'Ready to Draft', sub: 'All steps complete', status: 'attention', action: 'Start Draft' },
  ];

  const next = items.find((i) => i.status !== 'complete');

  return (
    <Screen>
      <View className="px-6 pt-2">
        <Text className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
          League Readiness
        </Text>
        <Text className="mt-1 text-[28px] font-semibold leading-tight tracking-tighter2">
          {active.name}
        </Text>
        <Text className="mt-2 text-[15px] text-muted-foreground">
          Set everything up before draft day.
        </Text>

        <View className="mt-6 overflow-hidden rounded-[28px] bg-surface-elevated">
          {items.map((it, i) => (
            <ReadinessRow key={it.key} item={it} divided={i > 0} onPress={() => it.to && nav.push(it.to)} />
          ))}
        </View>

        {next ? (
          <View className="pt-6">
            <Text className="px-1 pb-2 text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
              Next up
            </Text>
            <Pressable
              onPress={() => next.to && nav.push(next.to)}
              className="h-14 w-full items-center justify-center rounded-full bg-foreground"
            >
              <Text className="text-[17px] font-semibold tracking-tightish text-background">
                {next.action ?? next.label}
              </Text>
            </Pressable>
            <Pressable onPress={() => nav.replace('/')} className="items-center pt-3">
              <Text className="text-[13px] text-muted-foreground">Skip for now</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function ReadinessRow({ item, divided, onPress }: { item: Item; divided?: boolean; onPress: () => void }) {
  const c = useColors();
  const inner = (
    <View className="flex-row items-center gap-3 px-4 py-4">
      <StatusIcon status={item.status} />
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-medium tracking-tightish">{item.label}</Text>
        <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
          {item.sub}
        </Text>
      </View>
      {item.to ? <ChevronRight size={16} color={c.mutedForeground} /> : null}
    </View>
  );
  return (
    <View>
      {divided ? <Divider /> : null}
      {item.to ? <Pressable onPress={onPress}>{inner}</Pressable> : inner}
    </View>
  );
}

export function StatusIcon({ status }: { status: Status }) {
  const c = useColors();
  if (status === 'complete')
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-success">
        <Check size={16} color={c.background} />
      </View>
    );
  if (status === 'progress')
    return (
      <View className="h-8 w-8 items-center justify-center rounded-full bg-warning/30">
        <Circle size={12} color={c.foreground} fill={c.foreground} />
      </View>
    );
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-foreground/5">
      <AlertCircle size={16} color={c.mutedForeground} />
    </View>
  );
}
