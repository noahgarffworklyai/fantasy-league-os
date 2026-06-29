import { useState } from 'react';
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
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { AICard } from '@/components/ui/AICard';
import { Card, Divider } from '@/components/ui/Card';
import { useLeague, type League } from '@/lib/league-context';
import { homePriorities } from '@/lib/ai-intelligence';
import { useThemeTokens } from '@/lib/theme';

type TabKey = 'priorities' | 'league' | 'news';

export default function HomePage() {
  const { active, user } = useLeague();
  const router = useNav();
  const [tab, setTab] = useState<TabKey>('priorities');
  const { hex, layout, surfaces } = useThemeTokens();
  if (!active) return null;
  const isSynced = active.type === 'synced';
  const firstName = (user?.name ?? 'Marc').split(/\s+/)[0];

  return (
    <Screen>
      <View style={layout.screen}>
        <View style={layout.intro}>
          <Text variant="eyebrow">Week {active.week || 1}</Text>
          <Text variant="hero" style={{ marginTop: 4 }}>
            Hi, {firstName}.
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            {active.teamName ? `${active.teamName} · ${active.record}` : active.record} ·{' '}
            {active.members} teams · {active.rank > 0 ? `#${active.rank}` : '—'}
          </Text>
        </View>

        <Pressable onPress={() => router.switchTab('/team')}>
          <Card>
            <View style={layout.cardPad}>
              <View style={layout.rowBetween}>
                <Text variant="eyebrow">
                  Week {active.week || 1} · This week
                </Text>
                <View style={surfaces.pillSuccess}>
                  <Text variant="captionSuccess">72% win</Text>
                </View>
              </View>
              <View style={[layout.rowEnd, { marginTop: 20 }]}>
                <View>
                  <Text variant="bodyMuted">You</Text>
                  <Text variant="scoreXL" style={{ marginTop: 4 }}>
                    118.4
                  </Text>
                  <Text variant="bodyMuted" style={{ marginTop: 8 }}>
                    Proj 126.2 · {active.record}
                  </Text>
                </View>
                <Text variant="caption" style={{ paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 2 }}>
                  vs
                </Text>
                <View style={layout.alignEnd}>
                  <Text variant="bodyMuted">The Steel Curtain</Text>
                  <Text variant="scoreXL" style={{ marginTop: 4 }}>
                    104.1
                  </Text>
                  <Text variant="bodyMuted" style={{ marginTop: 8 }}>
                    Proj 112.4
                  </Text>
                </View>
              </View>
            </View>
            <Divider />
            <View style={layout.cardFooter}>
              <Text variant="link">Open matchup</Text>
              <ChevronRight size={16} color={hex.mutedForeground} />
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
  const { layout } = useThemeTokens();
  const priorities = homePriorities(active).slice(0, 3);
  return (
    <View style={layout.section}>
      <View style={layout.stackSm}>
        {priorities.map((r) => (
          <AICard
            key={r.id}
            rec={r}
            compact
            onAction={() => (r.category === 'Treasury' ? router.navigate('/treasury') : router.switchTab('/team'))}
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
  const { hex, layout, surfaces } = useThemeTokens();
  return (
    <View style={layout.section}>
      <Card>
        <View style={[layout.rowWrap, layout.cardPad, { width: '100%' }]}>
          <View style={layout.half}>
            <Stat label="Standing" value={active.rank > 0 ? `#${active.rank}` : '—'} />
          </View>
          <View style={layout.half}>
            <Stat
              label="Playoffs"
              value={active.rank <= Math.ceil(active.members / 2) ? 'In' : 'Bubble'}
            />
          </View>
          <View style={layout.half}>
            <Stat label="Pot" value={`$${active.potUsd.toLocaleString()}`} />
          </View>
          <View style={layout.half}>
            <Stat label="Activity" value="3 new" />
          </View>
        </View>
        <Divider />
        <Pressable onPress={() => router.switchTab('/league')} style={layout.cardFooter}>
          <Text variant="link">Open league</Text>
          <ChevronRight size={16} color={hex.mutedForeground} />
        </Pressable>
      </Card>

      <Pressable onPress={() => router.switchTab('/team')}>
        <Card>
          <View style={layout.healthRow}>
            <HealthStat label="Healthy" value="11" tone="success" first />
            <HealthStat label="Quest." value="2" tone="warning" />
            <HealthStat label="Out" value="1" tone="danger" />
            <HealthStat label="IR" value="1" tone="muted" />
          </View>
          <Divider />
          <View style={layout.cardFooter}>
            <Text variant="link">Roster health</Text>
            <ChevronRight size={16} color={hex.mutedForeground} />
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

function NewsPane() {
  const { layout } = useThemeTokens();
  return (
    <View style={layout.section}>
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
      <Text variant="eyebrow">{label}</Text>
      <Text variant="statValue" style={{ marginTop: 6 }}>
        {value}
      </Text>
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
  const { layout, toneFg } = useThemeTokens();
  return (
    <View style={first ? layout.healthCell : layout.healthCellBorder}>
      <Text variant="scoreLG" style={{ color: toneFg[tone === 'muted' ? 'neutral' : tone] }}>
        {value}
      </Text>
      <Text variant="eyebrow" style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View>
      {divided ? <Divider /> : null}
      <View style={layout.listRow}>
        <View style={[surfaces.iconBox, { backgroundColor: toneBg[tone] }]}>
          <IconComp size={18} color={toneFg[tone]} />
        </View>
        <View style={layout.flex1}>
          <Text variant="body" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            {sub}
          </Text>
        </View>
        {external ? (
          <ArrowUpRight size={16} color={hex.mutedForeground} />
        ) : (
          <ArrowRight size={16} color={hex.mutedForeground} />
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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <Pressable onPress={() => router.switchTab('/players')}>
      {divided ? <Divider /> : null}
      <View style={layout.listRow}>
        <View style={[surfaces.iconBox, { backgroundColor: toneBg[tone] }]}>
          <IconComp size={18} color={toneFg[tone]} />
        </View>
        <View style={layout.flex1}>
          <Text variant="body" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <ChevronRight size={16} color={hex.mutedForeground} />
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
  const { hex, layout, surfaces, toneBg } = useThemeTokens();
  return (
    <View>
      {divided ? <Divider /> : null}
      <View style={layout.listRow}>
        <View style={[surfaces.iconBox, { backgroundColor: toneBg.neutral }]}>
          <CalendarClock size={18} color={hex.mutedForeground} />
        </View>
        <View style={layout.flex1}>
          <Text variant="body" numberOfLines={1}>
            {away} @ {home}
          </Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            Kickoff {kickoff}
          </Text>
        </View>
        {yours > 0 ? (
          <View style={surfaces.pillMuted}>
            <Text variant="caption">{yours} yours</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
