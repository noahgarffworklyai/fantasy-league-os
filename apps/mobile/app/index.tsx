import { useState } from 'react';
import { View } from 'react-native';
import { useNav } from '@/lib/nav';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Flame,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { AICard } from '@/components/ui/AICard';
import { Card, Divider } from '@/components/ui/Card';
import { useLeague, type League } from '@/lib/league-context';
import { homePriorities } from '@/lib/ai-intelligence';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

type TabKey = 'priorities' | 'league' | 'news';

export default function HomePage() {
  const { active, user } = useLeague();
  const router = useNav();
  const [tab, setTab] = useState<TabKey>('priorities');
  const c = useColors();
  if (!active) return null;
  const isSynced = active.type === 'synced';
  const firstName = (user?.name ?? 'Marc').split(/\s+/)[0];

  return (
    <Screen>
      <View className="gap-5 px-4 pb-10 pt-2">
        {/* Intro */}
        <View className="px-1 pt-1">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Week {active.week || 1}
          </Text>
          <Text className="mt-1 text-[34px] font-semibold leading-[36px] tracking-tighter2">
            Hi, {firstName}.
          </Text>
          <Text className="mt-2 text-[13px] text-muted-foreground">
            {active.teamName ? `${active.teamName} · ${active.record}` : active.record} ·{' '}
            {active.members} teams · {active.rank > 0 ? `#${active.rank}` : '—'}
          </Text>
        </View>

        {/* Matchup card */}
        <Pressable onPress={() => router.navigate('/team')}>
          <Card>
            <View className="p-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Week {active.week || 1} · This week
                </Text>
                <View className="rounded-full bg-success/15 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold tracking-wide text-success">72% win</Text>
                </View>
              </View>
              <View className="mt-5 flex-row items-end justify-between gap-4">
                <View>
                  <Text className="text-[12px] text-muted-foreground">You</Text>
                  <Text className="mt-1 text-[44px] font-semibold leading-[44px] tracking-tighter2">
                    118.4
                  </Text>
                  <Text className="mt-2 text-[12px] text-muted-foreground">
                    Proj 126.2 · {active.record}
                  </Text>
                </View>
                <Text className="pb-1 text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
                  vs
                </Text>
                <View className="items-end">
                  <Text className="text-[12px] text-muted-foreground">The Steel Curtain</Text>
                  <Text className="mt-1 text-[44px] font-semibold leading-[44px] tracking-tighter2">
                    104.1
                  </Text>
                  <Text className="mt-2 text-[12px] text-muted-foreground">Proj 112.4</Text>
                </View>
              </View>
            </View>
            <Divider />
            <View className="flex-row items-center justify-between px-6 py-3.5">
              <Text className="text-[13px] font-medium tracking-tightish">Open matchup</Text>
              <ChevronRight size={16} color={c.mutedForeground} />
            </View>
          </Card>
        </Pressable>

        <Segmented
          tabs={[
            { key: 'priorities', label: 'Priorities' },
            { key: 'league', label: 'League' },
            { key: 'news', label: 'News' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'priorities' ? (
          <PrioritiesPane active={active} isSynced={isSynced} />
        ) : tab === 'league' ? (
          <LeaguePane active={active} />
        ) : (
          <NewsPane />
        )}
      </View>
    </Screen>
  );
}

function PrioritiesPane({ active, isSynced }: { active: League; isSynced: boolean }) {
  const router = useNav();
  const priorities = homePriorities(active).slice(0, 3);
  return (
    <View className="gap-4">
      <View className="gap-2.5">
        {priorities.map((r) => (
          <AICard
            key={r.id}
            rec={r}
            compact
            onAction={() => router.navigate(r.category === 'Treasury' ? '/treasury' : '/team')}
          />
        ))}
      </View>
      <Card>
        <Priority
          icon={Sparkles}
          tone="success"
          title="Start Jayden Daniels over Brock Purdy"
          sub="+3.8 projected · weather edge"
        />
        <Priority
          icon={AlertTriangle}
          tone="warning"
          title="Two players questionable"
          sub="Check Sunday morning · Kelce, Walker"
          divided
        />
        <Priority
          icon={Activity}
          tone="neutral"
          title={isSynced ? 'Trade awaiting response' : 'Waiver claims tonight'}
          sub={isSynced ? `Review on ${active.platform}` : 'Locks 11:59 PM ET'}
          external={isSynced}
          divided
        />
      </Card>
    </View>
  );
}

function LeaguePane({ active }: { active: League }) {
  const router = useNav();
  const c = useColors();
  return (
    <View className="gap-4">
      <Card>
        <View className="flex-row flex-wrap px-6 py-5">
          <View className="w-1/2 pb-5">
            <Stat label="Standing" value={active.rank > 0 ? `#${active.rank}` : '—'} />
          </View>
          <View className="w-1/2 pb-5">
            <Stat
              label="Playoffs"
              value={active.rank <= Math.ceil(active.members / 2) ? 'In' : 'Bubble'}
            />
          </View>
          <View className="w-1/2">
            <Stat label="Pot" value={`$${active.potUsd.toLocaleString()}`} />
          </View>
          <View className="w-1/2">
            <Stat label="Activity" value="3 new" />
          </View>
        </View>
        <Divider />
        <Pressable
          onPress={() => router.navigate('/league')}
          className="flex-row items-center justify-between px-6 py-3.5"
        >
          <Text className="text-[13px] font-medium tracking-tightish">Open league</Text>
          <ChevronRight size={16} color={c.mutedForeground} />
        </Pressable>
      </Card>

      <Pressable onPress={() => router.navigate('/team')}>
        <Card>
          <View className="flex-row px-2 py-5">
            <HealthStat label="Healthy" value="11" tone="success" first />
            <HealthStat label="Quest." value="2" tone="warning" />
            <HealthStat label="Out" value="1" tone="danger" />
            <HealthStat label="IR" value="1" tone="muted" />
          </View>
          <Divider />
          <View className="flex-row items-center justify-between px-6 py-3.5">
            <Text className="text-[13px] font-medium tracking-tightish">Roster health</Text>
            <ChevronRight size={16} color={c.mutedForeground} />
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

function NewsPane() {
  return (
    <View className="gap-4">
      <Card>
        <NewsRow icon={Flame} tone="danger" title="Saquon questionable (ankle)" sub="Friday practice · monitor" />
        <NewsRow icon={Newspaper} tone="neutral" title="WR1 role shifts in Chicago" sub="Odunze trending up" divided />
        <NewsRow icon={AlertTriangle} tone="warning" title="Suspension upheld · 2 games" sub="Backup gains volume" divided />
      </Card>
      <Card>
        <GameRow away="BUF" home="KC" kickoff="1:00 PM" yours={3} />
        <GameRow away="SF" home="LAR" kickoff="4:25 PM" yours={2} divided />
        <GameRow away="DAL" home="PHI" kickoff="8:20 PM" yours={1} divided />
      </Card>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-1.5 text-[20px] font-semibold tracking-tighter2">{value}</Text>
    </View>
  );
}

function HealthStat({
  label,
  value,
  tone,
  first,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'muted';
  first?: boolean;
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'danger'
          ? 'text-danger'
          : 'text-muted-foreground';
  return (
    <View className={cn('flex-1 items-center', first ? '' : 'border-l border-hairline')}>
      <Text className={cn('text-[28px] font-semibold tracking-tighter2', color)}>{value}</Text>
      <Text className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

const TONE_BG: Record<string, string> = {
  success: 'bg-success/15',
  warning: 'bg-warning/25',
  danger: 'bg-danger/15',
  neutral: 'bg-muted',
};
const TONE_FG: Record<string, string> = {
  success: 'text-success',
  warning: 'text-foreground',
  danger: 'text-danger',
  neutral: 'text-muted-foreground',
};

function Priority({
  icon: IconComp,
  title,
  sub,
  tone,
  divided,
  external,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  divided?: boolean;
  external?: boolean;
}) {
  const c = useColors();
  const iconColor =
    tone === 'success' ? c.success : tone === 'danger' ? c.danger : tone === 'warning' ? c.foreground : c.mutedForeground;
  return (
    <View>
      {divided ? <Divider /> : null}
      <View className="flex-row items-center gap-3 px-5 py-4">
        <View className={cn('h-10 w-10 shrink-0 items-center justify-center rounded-2xl', TONE_BG[tone])}>
          <IconComp size={18} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
            {sub}
          </Text>
        </View>
        {external ? (
          <ArrowUpRight size={16} color={c.mutedForeground} />
        ) : (
          <ArrowRight size={16} color={c.mutedForeground} />
        )}
      </View>
    </View>
  );
}

function NewsRow({
  icon: IconComp,
  title,
  sub,
  tone,
  divided,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  divided?: boolean;
}) {
  const router = useNav();
  const c = useColors();
  const iconColor =
    tone === 'success' ? c.success : tone === 'danger' ? c.danger : tone === 'warning' ? c.foreground : c.mutedForeground;
  return (
    <Pressable onPress={() => router.navigate('/players')}>
      {divided ? <Divider /> : null}
      <View className="flex-row items-center gap-3 px-5 py-4">
        <View className={cn('h-10 w-10 shrink-0 items-center justify-center rounded-2xl', TONE_BG[tone], TONE_FG[tone])}>
          <IconComp size={18} color={iconColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <ChevronRight size={16} color={c.mutedForeground} />
      </View>
    </Pressable>
  );
}

function GameRow({
  away,
  home,
  kickoff,
  yours,
  divided,
}: {
  away: string;
  home: string;
  kickoff: string;
  yours: number;
  divided?: boolean;
}) {
  const c = useColors();
  return (
    <View>
      {divided ? <Divider /> : null}
      <View className="flex-row items-center gap-3 px-5 py-4">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <CalendarClock size={18} color={c.mutedForeground} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>
            {away} @ {home}
          </Text>
          <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
            Kickoff {kickoff}
          </Text>
        </View>
        {yours > 0 ? (
          <View className="rounded-full bg-foreground/5 px-2.5 py-1">
            <Text className="text-[11px] font-semibold tracking-wide text-foreground">{yours} yours</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
