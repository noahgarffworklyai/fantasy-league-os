import { AlertCircle, Check, ChevronRight, Circle } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Divider } from '@/components/ui/Card';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useTheme, useThemeTokens } from '@/lib/theme';

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
  const { hex, layout, surfaces } = useThemeTokens();
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
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="eyebrow">League Readiness</Text>
        <Text variant="titleXl" style={{ marginTop: 4 }}>
          {active.name}
        </Text>
        <Text variant="subtitle" style={{ marginTop: 8 }}>
          Set everything up before draft day.
        </Text>

        <View style={[surfaces.card, { marginTop: 24 }]}>
          {items.map((it, i) => (
            <ReadinessRow key={it.key} item={it} divided={i > 0} onPress={() => it.to && nav.push(it.to)} />
          ))}
        </View>

        {next ? (
          <View style={{ paddingTop: 24 }}>
            <Text variant="eyebrow" style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
              Next up
            </Text>
            <Pressable
              onPress={() => next.to && nav.push(next.to)}
              style={surfaces.primaryButton}
            >
              <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
                {next.action ?? next.label}
              </Text>
            </Pressable>
            <Pressable onPress={() => nav.replace('/')} style={[layout.centered, { paddingTop: 12 }]}>
              <Text variant="link" muted>
                Skip for now
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function ReadinessRow({ item, divided, onPress }: { item: Item; divided?: boolean; onPress: () => void }) {
  const { hex, layout } = useThemeTokens();
  const inner = (
    <View style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 16 }]}>
      <StatusIcon status={item.status} />
      <View style={[layout.flex1, { minWidth: 0 }]}>
        <Text variant="body">{item.label}</Text>
        <Text variant="bodyMuted" numberOfLines={1}>
          {item.sub}
        </Text>
      </View>
      {item.to ? <ChevronRight size={16} color={hex.mutedForeground} /> : null}
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
  const { hex, layout, toneBg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  if (status === 'complete')
    return (
      <View
        style={[
          layout.centered,
          { height: 32, width: 32, borderRadius: 9999, backgroundColor: hex.success },
        ]}
      >
        <Check size={16} color={hex.background} />
      </View>
    );
  if (status === 'progress')
    return (
      <View
        style={[
          layout.centered,
          { height: 32, width: 32, borderRadius: 9999, backgroundColor: toneBg.warning },
        ]}
      >
        <Circle size={12} color={hex.foreground} fill={hex.foreground} />
      </View>
    );
  return (
    <View
      style={[
        layout.centered,
        { height: 32, width: 32, borderRadius: 9999, backgroundColor: `rgba(${ink},0.05)` },
      ]}
    >
      <AlertCircle size={16} color={hex.mutedForeground} />
    </View>
  );
}
