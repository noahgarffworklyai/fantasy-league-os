import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowDownAZ,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Copy,
  GripVertical,
  Hash,
  Heart,
  Link as LinkIcon,
  ListChecks,
  type LucideIcon,
  Mail,
  MessageSquare,
  Pause,
  PlayCircle,
  Plus,
  QrCode,
  Search,
  Send,
  Settings as SettingsIcon,
  Smile,
  Sparkles,
  Star,
  Trophy,
  TrendingUp,
  Users,
  X,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useLeague, type League } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

type DraftView =
  | { kind: 'home' }
  | { kind: 'create' }
  | { kind: 'readiness' }
  | { kind: 'readiness-step'; key: ReadinessKey }
  | { kind: 'invite' }
  | { kind: 'board' }
  | { kind: 'queue' }
  | { kind: 'settings' }
  | { kind: 'join' }
  | { kind: 'complete' };

type ReadinessKey = 'created' | 'rules' | 'invites' | 'filled' | 'dues' | 'order' | 'time' | 'ready';

interface Player {
  id: string;
  name: string;
  pos: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
  team: string;
  proj: number;
  bye: number;
  health: 'healthy' | 'questionable' | 'doubtful';
  trending?: boolean;
  bestAvail: number;
  fit: number;
  need: number;
  value: number;
  risk: number;
  sos: 'Easy' | 'Med' | 'Hard';
}

const PLAYERS: Player[] = [
  { id: 'p1', name: 'Bijan Robinson', pos: 'RB', team: 'ATL', proj: 21.4, bye: 12, health: 'healthy', trending: true, bestAvail: 96, fit: 92, need: 88, value: 93, risk: 12, sos: 'Easy' },
  { id: 'p2', name: 'Justin Jefferson', pos: 'WR', team: 'MIN', proj: 20.8, bye: 6, health: 'healthy', bestAvail: 95, fit: 88, need: 75, value: 90, risk: 10, sos: 'Med' },
  { id: 'p3', name: 'Patrick Mahomes', pos: 'QB', team: 'KC', proj: 24.6, bye: 10, health: 'healthy', bestAvail: 88, fit: 70, need: 60, value: 80, risk: 8, sos: 'Med' },
  { id: 'p4', name: 'Sam LaPorta', pos: 'TE', team: 'DET', proj: 14.2, bye: 5, health: 'questionable', trending: true, bestAvail: 84, fit: 81, need: 92, value: 82, risk: 28, sos: 'Easy' },
  { id: 'p5', name: 'Saquon Barkley', pos: 'RB', team: 'PHI', proj: 19.7, bye: 7, health: 'healthy', bestAvail: 92, fit: 90, need: 85, value: 88, risk: 15, sos: 'Hard' },
  { id: 'p6', name: 'Tyreek Hill', pos: 'WR', team: 'MIA', proj: 19.1, bye: 6, health: 'questionable', bestAvail: 89, fit: 84, need: 70, value: 85, risk: 25, sos: 'Med' },
  { id: 'p7', name: 'Travis Kelce', pos: 'TE', team: 'KC', proj: 13.6, bye: 10, health: 'healthy', bestAvail: 80, fit: 78, need: 90, value: 75, risk: 20, sos: 'Med' },
  { id: 'p8', name: 'Justin Tucker', pos: 'K', team: 'BAL', proj: 9.1, bye: 14, health: 'healthy', bestAvail: 60, fit: 55, need: 30, value: 70, risk: 5, sos: 'Easy' },
  { id: 'p9', name: '49ers DEF', pos: 'DEF', team: 'SF', proj: 10.4, bye: 9, health: 'healthy', bestAvail: 65, fit: 60, need: 35, value: 72, risk: 10, sos: 'Med' },
  { id: 'p10', name: 'Garrett Wilson', pos: 'WR', team: 'NYJ', proj: 17.3, bye: 12, health: 'healthy', trending: true, bestAvail: 86, fit: 82, need: 78, value: 84, risk: 14, sos: 'Med' },
];

type Drafted = { pick: number; team: string; player: Player };
type ChatMsg = { id: string; who: string; text: string };

export default function DraftPage() {
  const { active } = useLeague();
  const nav = useNav();
  const [view, setView] = useState<DraftView>({ kind: 'home' });
  const [queue, setQueue] = useState<string[]>(['p1', 'p4', 'p10']);
  const [drafted, setDrafted] = useState<Drafted[]>([]);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(90);
  const [chat, setChat] = useState<ChatMsg[]>([
    { id: 'c1', who: 'Marcus', text: "Let's gooo" },
    { id: 'c2', who: 'Jenna', text: 'Drafting from the beach 🌴' },
  ]);

  useEffect(() => {
    if (view.kind !== 'board' || paused) return;
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [view, paused, seconds]);

  if (!active) return null;
  const exit = () => nav.back();
  const home = () => setView({ kind: 'home' });

  switch (view.kind) {
    case 'home':
      return <DraftHome league={active} onExit={exit} onGo={setView} />;
    case 'create':
      return <CreateLeague onBack={home} onExit={exit} onDone={() => setView({ kind: 'readiness' })} />;
    case 'readiness':
      return (
        <ReadinessView
          league={active}
          onBack={home}
          onExit={exit}
          onOpen={(k) => {
            if (k === 'invites') setView({ kind: 'invite' });
            else if (k === 'ready') setView({ kind: 'board' });
            else setView({ kind: 'readiness-step', key: k });
          }}
        />
      );
    case 'readiness-step':
      return <ReadinessStep stepKey={view.key} onBack={() => setView({ kind: 'readiness' })} onExit={exit} />;
    case 'invite':
      return <InviteView league={active} onBack={() => setView({ kind: 'readiness' })} onExit={exit} />;
    case 'board':
      return (
        <DraftBoard
          league={active}
          onBack={home}
          onExit={exit}
          onOpenQueue={() => setView({ kind: 'queue' })}
          onSettings={() => setView({ kind: 'settings' })}
          onComplete={() => setView({ kind: 'complete' })}
          queue={queue}
          setQueue={setQueue}
          drafted={drafted}
          setDrafted={setDrafted}
          paused={paused}
          setPaused={setPaused}
          seconds={seconds}
          setSeconds={setSeconds}
          chat={chat}
          setChat={setChat}
        />
      );
    case 'queue':
      return <QueueView onBack={() => setView({ kind: 'board' })} onExit={exit} queue={queue} setQueue={setQueue} />;
    case 'settings':
      return <DraftSettings league={active} onBack={() => setView({ kind: 'board' })} onExit={exit} />;
    case 'join':
      return <JoinDraft onBack={home} onExit={exit} onDone={() => setView({ kind: 'board' })} />;
    case 'complete':
      return <DraftComplete league={active} onExit={exit} onBegin={() => nav.back()} />;
  }
}

/* ============= Shell ============= */
function Shell({
  title,
  subtitle,
  onBack,
  onExit,
  children,
  hideBack,
  trailing,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onExit: () => void;
  children: ReactNode;
  hideBack?: boolean;
  trailing?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View className="flex-1 bg-surface">
      <View className="border-b border-hairline bg-surface" style={{ paddingTop: Math.max(insets.top, 14) }}>
        <View className="flex-row items-center justify-between px-2 pb-3">
          {hideBack || !onBack ? (
            <View className="w-[72px]" />
          ) : (
            <Pressable onPress={onBack} className="flex-row items-center gap-0.5 rounded-full px-2 py-1">
              <ChevronLeft size={20} color={c.success} />
              <Text className="text-[15px] text-success">Back</Text>
            </Pressable>
          )}
          <View className="items-center">
            <Text className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Current Draft</Text>
            <Text className="text-[16px] font-semibold tracking-tightish">{title}</Text>
            {subtitle ? <Text className="text-[11px] text-muted-foreground">{subtitle}</Text> : null}
          </View>
          <View className="flex-row items-center justify-end gap-1 pr-1">
            {trailing}
            <Pressable onPress={onExit} className="h-8 items-center justify-center rounded-full bg-muted px-3">
              <Text className="text-[12px] font-medium text-muted-foreground">Exit</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 32) }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

/* ============= Draft Home ============= */
function DraftHome({ league, onExit, onGo }: { league: League; onExit: () => void; onGo: (v: DraftView) => void }) {
  const c = useColors();
  const synced = league.type === 'synced';
  const isCommish = league.role === 'commissioner';

  const hostedCards = [
    { key: 'create', icon: Plus, title: 'Create League', sub: 'Start a new hosted league', show: isCommish, go: () => onGo({ kind: 'create' }) },
    { key: 'join', icon: Users, title: 'Join Draft', sub: 'Invite link, code, or invitation', show: true, go: () => onGo({ kind: 'join' }) },
    { key: 'board', icon: PlayCircle, title: 'Resume Draft', sub: 'Live · Round 3, Pick 7', show: true, go: () => onGo({ kind: 'board' }) },
    { key: 'queue', icon: ListChecks, title: 'Player Queue', sub: 'Prepare your picks', show: true, go: () => onGo({ kind: 'queue' }) },
    { key: 'readiness', icon: Check, title: 'League Readiness', sub: 'Checklist before draft day', show: true, go: () => onGo({ kind: 'readiness' }) },
    { key: 'settings', icon: SettingsIcon, title: 'Draft Settings', sub: 'Timer, type & order', show: isCommish, go: () => onGo({ kind: 'settings' }) },
  ];
  const syncedCards = [
    { key: 'import', icon: Plus, title: 'Import Draft Results', sub: `From ${league.platform}`, go: () => {} },
    { key: 'board', icon: ClipboardList, title: 'Draft Board', sub: 'View completed draft', go: () => onGo({ kind: 'board' }) },
    { key: 'grades', icon: Trophy, title: 'Draft Grades', sub: 'AI team grades', go: () => onGo({ kind: 'complete' }) },
    { key: 'analysis', icon: Sparkles, title: 'Draft Analysis', sub: 'Steals, reaches & best value', go: () => {} },
    { key: 'recap', icon: TrendingUp, title: 'Draft Recap', sub: 'Round-by-round summary', go: () => {} },
  ];
  const cards = synced ? syncedCards : hostedCards.filter((c2) => c2.show);

  return (
    <Shell title="Draft" subtitle={league.name} onExit={onExit} hideBack>
      <View className="mb-4 rounded-[30px] bg-foreground p-5">
        <Text className="text-[11px] uppercase tracking-widest text-background/60">{synced ? 'Synced Draft' : league.stage === 'draft' ? 'Live' : 'Preseason'}</Text>
        <Text className="mt-1 text-[24px] font-semibold tracking-tight text-background">
          {synced ? 'Your draft, deeper.' : league.stage === 'draft' ? 'Draft in progress' : 'Get ready to draft'}
        </Text>
        <Text className="mt-1 text-[13px] text-background/70">
          {synced ? `Drafted on ${league.platform}. Mirrored in Commissioner.` : 'Set up your league, prep your queue, and run a premium draft.'}
        </Text>
        {!synced ? (
          <Pressable onPress={() => onGo({ kind: 'board' })} className="mt-4 flex-row items-center gap-1 self-start rounded-full bg-background px-4 py-2">
            <PlayCircle size={16} color={c.foreground} />
            <Text className="text-[13px] font-semibold text-foreground">Enter Draft Board</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="overflow-hidden rounded-[28px] bg-surface-elevated">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Pressable key={card.key} onPress={card.go}>
              <View className={cn('flex-row items-center gap-4 px-4 py-4', i > 0 ? 'border-t border-hairline' : '')}>
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-foreground">
                  <Icon size={18} color={c.background} strokeWidth={2.25} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[17px] font-semibold tracking-tightish">{card.title}</Text>
                  <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{card.sub}</Text>
                </View>
                <ChevronRight size={16} color={c.mutedForeground} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </Shell>
  );
}

/* ============= Create League ============= */
function CreateLeague({ onBack, onExit, onDone }: { onBack: () => void; onExit: () => void; onDone: () => void }) {
  const c = useColors();
  const STEPS = ['League Name', 'League Size', 'Scoring', 'Buy-in', 'Prize Structure', 'Draft Date', 'Draft Type', 'Review'];
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', size: 12, scoring: 'Half PPR', buyIn: 50, prize: '60 / 30 / 10', date: '', draftType: 'Snake' });
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : onDone());
  const back = () => (step > 0 ? setStep(step - 1) : onBack());

  return (
    <Shell title="Create League" subtitle={`Step ${step + 1} of ${STEPS.length}`} onBack={back} onExit={onExit}>
      <View className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
        <View className="h-full bg-foreground" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </View>
      <Text className="px-1 text-[22px] font-semibold tracking-tight">{STEPS[step]}</Text>
      <Text className="mb-4 px-1 text-[13px] text-muted-foreground">Set it once. Members will see it everywhere.</Text>

      <View className="overflow-hidden rounded-[24px] bg-surface-elevated p-2">
        {step === 0 ? (
          <TextInput autoFocus value={data.name} onChangeText={(t) => setData({ ...data, name: t })} placeholder="e.g. The Sunday Scaries" placeholderTextColor={c.mutedForeground} className="px-3 py-4 text-[18px] font-medium text-foreground" />
        ) : null}
        {step === 1 ? <Choices value={String(data.size)} onChange={(v) => setData({ ...data, size: Number(v) })} opts={['8', '10', '12', '14']} /> : null}
        {step === 2 ? <Choices value={data.scoring} onChange={(v) => setData({ ...data, scoring: v })} opts={['Standard', 'Half PPR', 'PPR']} /> : null}
        {step === 3 ? <Choices value={String(data.buyIn)} onChange={(v) => setData({ ...data, buyIn: Number(v) })} opts={['0', '25', '50', '100', '250']} prefix="$" /> : null}
        {step === 4 ? <Choices value={data.prize} onChange={(v) => setData({ ...data, prize: v })} opts={['100 (winner)', '60 / 30 / 10', '50 / 30 / 15 / 5']} /> : null}
        {step === 5 ? (
          <TextInput value={data.date} onChangeText={(t) => setData({ ...data, date: t })} placeholder="Sat Aug 23, 7:00 PM" placeholderTextColor={c.mutedForeground} className="px-3 py-4 text-[16px] font-medium text-foreground" />
        ) : null}
        {step === 6 ? <Choices value={data.draftType} onChange={(v) => setData({ ...data, draftType: v })} opts={['Snake', 'Auction', 'Linear']} /> : null}
        {step === 7 ? (
          <View>
            <Review label="Name" value={data.name || '—'} first />
            <Review label="Size" value={`${data.size} teams`} />
            <Review label="Scoring" value={data.scoring} />
            <Review label="Buy-in" value={data.buyIn ? `$${data.buyIn}` : 'Free'} />
            <Review label="Prize" value={data.prize} />
            <Review label="Draft" value={data.date || 'Set later'} />
            <Review label="Type" value={data.draftType} />
          </View>
        ) : null}
      </View>

      <Pressable onPress={next} disabled={step === 0 && !data.name} className={cn('mt-6 h-14 items-center justify-center rounded-full bg-foreground', step === 0 && !data.name ? 'opacity-40' : '')}>
        <Text className="text-[17px] font-semibold tracking-tightish text-background">{step === STEPS.length - 1 ? 'Create League' : 'Continue'}</Text>
      </Pressable>
    </Shell>
  );
}

function Choices({ value, onChange, opts, prefix }: { value: string; onChange: (v: string) => void; opts: string[]; prefix?: string }) {
  return (
    <View className="flex-row flex-wrap gap-2 p-1">
      {opts.map((o) => {
        const sel = value === o || value === o.split(' ')[0];
        return (
          <Pressable key={o} onPress={() => onChange(o)} className={cn('w-[48%] rounded-2xl px-4 py-3', sel ? 'bg-foreground' : 'bg-background')}>
            <Text className={cn('text-[15px] font-medium', sel ? 'text-background' : 'text-foreground')}>{prefix}{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Review({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={cn('flex-row items-center justify-between px-3 py-3', first ? '' : 'border-t border-border')}>
      <Text className="text-[14px] text-muted-foreground">{label}</Text>
      <Text className="text-[15px] font-medium">{value}</Text>
    </View>
  );
}

/* ============= Readiness ============= */
function ReadinessView({ league, onBack, onExit, onOpen }: { league: League; onBack: () => void; onExit: () => void; onOpen: (k: ReadinessKey) => void }) {
  const c = useColors();
  const size = league.size ?? 12;
  const joined = league.joined ?? 10;
  const paid = league.paid ?? 8;
  const items: { key: ReadinessKey; label: string; sub: string; status: 'complete' | 'progress' | 'attention' }[] = [
    { key: 'created', label: 'League Created', sub: league.name, status: 'complete' },
    { key: 'rules', label: 'League Rules', sub: `${league.scoring ?? 'Half PPR'} · Standard roster`, status: 'complete' },
    { key: 'invites', label: 'Members Invited', sub: `${size - joined} pending`, status: joined === size ? 'complete' : 'progress' },
    { key: 'filled', label: 'League Filled', sub: `${joined} of ${size} joined`, status: joined === size ? 'complete' : 'attention' },
    { key: 'dues', label: 'League Dues', sub: `${paid} of ${size} paid`, status: paid === size ? 'complete' : 'attention' },
    { key: 'order', label: 'Draft Order', sub: 'Randomize or set manually', status: 'attention' },
    { key: 'time', label: 'Draft Time', sub: league.draftDate ?? 'Pick a date and time', status: league.draftDate ? 'complete' : 'attention' },
    { key: 'ready', label: 'League Ready', sub: 'Enter Draft Board', status: 'attention' },
  ];
  return (
    <Shell title="League Readiness" subtitle={league.name} onBack={onBack} onExit={onExit}>
      <View className="overflow-hidden rounded-[28px] bg-surface-elevated">
        {items.map((it, i) => (
          <Pressable key={it.key} onPress={() => onOpen(it.key)}>
            <View className={cn('flex-row items-center gap-3 px-4 py-4', i > 0 ? 'border-t border-hairline' : '')}>
              <StatusIcon status={it.status} />
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-medium tracking-tightish">{it.label}</Text>
                <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{it.sub}</Text>
              </View>
              <ChevronRight size={16} color={c.mutedForeground} />
            </View>
          </Pressable>
        ))}
      </View>
    </Shell>
  );
}

function StatusIcon({ status }: { status: 'complete' | 'progress' | 'attention' }) {
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

function ReadinessStep({ stepKey, onBack, onExit }: { stepKey: ReadinessKey; onBack: () => void; onExit: () => void }) {
  const titles: Record<ReadinessKey, string> = {
    created: 'League Created',
    rules: 'League Rules',
    invites: 'Invite Members',
    filled: 'League Capacity',
    dues: 'League Dues',
    order: 'Draft Order',
    time: 'Draft Time',
    ready: 'League Ready',
  };
  return (
    <Shell title={titles[stepKey]} onBack={onBack} onExit={onExit}>
      <View className="rounded-[28px] bg-surface-elevated p-6">
        <Text className="text-center text-[15px] text-muted-foreground">
          {stepKey === 'order'
            ? 'Randomize the order, drag to set manually, or schedule a live reveal.'
            : stepKey === 'dues'
              ? 'Collect entry fees in Treasury before draft day.'
              : stepKey === 'rules'
                ? 'Roster, scoring, and schedule. Edit in League Settings.'
                : 'Configure this step to keep your league on track.'}
        </Text>
      </View>
      <Pressable onPress={onBack} className="mt-6 h-14 items-center justify-center rounded-full bg-foreground">
        <Text className="text-[17px] font-semibold tracking-tightish text-background">Save & Return</Text>
      </Pressable>
    </Shell>
  );
}

/* ============= Invite ============= */
function InviteView({ league, onBack, onExit }: { league: League; onBack: () => void; onExit: () => void }) {
  const c = useColors();
  const size = league.size ?? 12;
  const joined = league.joined ?? 10;
  const pending = size - joined;
  const paid = league.paid ?? 8;
  const link = `https://cmsr.app/invite/${league.id}`;
  const rows = [
    { icon: LinkIcon, label: 'Copy Invite Link', sub: link },
    { icon: Mail, label: 'Email', sub: 'Send via email' },
    { icon: MessageSquare, label: 'SMS', sub: 'Send via text' },
    { icon: QrCode, label: 'QR Code', sub: 'Tap to display' },
  ];

  return (
    <Shell title="Invite Members" subtitle={league.name} onBack={onBack} onExit={onExit}>
      <View className="mb-4 items-center rounded-[28px] bg-surface-elevated p-5">
        <Text className="text-[11px] uppercase tracking-widest text-muted-foreground">League Capacity</Text>
        <Text className="mt-1 text-[32px] font-semibold tracking-tight">{joined} of {size} Joined</Text>
        <Text className="mt-1 text-[13px] text-muted-foreground">{pending} pending · {paid} paid · Draft Ready: {joined === size && paid === size ? 'Yes' : 'No'}</Text>
      </View>
      <View className="overflow-hidden rounded-[28px] bg-surface-elevated">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <Pressable key={r.label}>
              <View className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
                <View className="h-9 w-9 items-center justify-center rounded-2xl bg-foreground">
                  <Icon size={16} color={c.background} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-medium tracking-tightish">{r.label}</Text>
                  <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{r.sub}</Text>
                </View>
                <Copy size={16} color={c.mutedForeground} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onBack} className="mt-6 h-14 items-center justify-center rounded-full bg-foreground">
        <Text className="text-[17px] font-semibold tracking-tightish text-background">Return to Readiness</Text>
      </Pressable>
    </Shell>
  );
}

/* ============= Draft Board ============= */
function DraftBoard({
  league,
  onBack,
  onExit,
  onOpenQueue,
  onSettings,
  onComplete,
  queue,
  setQueue,
  drafted,
  setDrafted,
  paused,
  setPaused,
  seconds,
  setSeconds,
  chat,
  setChat,
}: {
  league: League;
  onBack: () => void;
  onExit: () => void;
  onOpenQueue: () => void;
  onSettings: () => void;
  onComplete: () => void;
  queue: string[];
  setQueue: React.Dispatch<React.SetStateAction<string[]>>;
  drafted: Drafted[];
  setDrafted: React.Dispatch<React.SetStateAction<Drafted[]>>;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
  chat: ChatMsg[];
  setChat: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
}) {
  const c = useColors();
  const [tab, setTab] = useState<'players' | 'queue' | 'chat'>('players');
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState<'ALL' | Player['pos']>('ALL');
  const [selected, setSelected] = useState<Player | null>(null);
  const isCommish = league.role === 'commissioner';

  const draftedIds = new Set(drafted.map((d) => d.player.id));
  const available = useMemo(
    () =>
      PLAYERS.filter((p) => !draftedIds.has(p.id))
        .filter((p) => (pos === 'ALL' ? true : p.pos === pos))
        .filter((p) => (search ? p.name.toLowerCase().includes(search.toLowerCase()) : true))
        .sort((a, b) => b.bestAvail - a.bestAvail),
    [drafted, pos, search],
  );

  const pickNumber = drafted.length + 1;
  const size = league.size ?? 12;
  const round = Math.ceil(pickNumber / size);
  const slot = ((pickNumber - 1) % size) + 1;
  const onClock = 'Your Team';

  const draft = (p: Player) => {
    setDrafted((d) => [...d, { pick: pickNumber, team: onClock, player: p }]);
    setQueue((q) => q.filter((id) => id !== p.id));
    setSeconds(90);
    setSelected(null);
    if (pickNumber >= 5) setTimeout(() => onComplete(), 400);
  };

  return (
    <Shell
      title="Draft Board"
      subtitle={`Round ${round} · Pick ${slot}`}
      onBack={onBack}
      onExit={onExit}
      trailing={isCommish ? (
        <Pressable onPress={onSettings} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <SettingsIcon size={16} color={c.mutedForeground} />
        </Pressable>
      ) : null}
    >
      <View className="mb-4 flex-row items-center gap-3 rounded-[28px] bg-foreground p-4">
        <View className="flex-1">
          <Text className="text-[10px] uppercase tracking-widest text-background/60">On the clock</Text>
          <Text className="text-[17px] font-semibold tracking-tight text-background">{onClock}</Text>
          <Text className="text-[11px] text-background/60">Pick {pickNumber} · Round {round}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[34px] font-semibold tracking-tight tabular-nums text-background">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text>
          {isCommish ? (
            <Pressable onPress={() => setPaused((p) => !p)} className="mt-1 flex-row items-center gap-1 rounded-full bg-background/15 px-2 py-0.5">
              {paused ? <PlayCircle size={12} color={c.background} /> : <Pause size={12} color={c.background} />}
              <Text className="text-[10px] font-medium text-background">{paused ? 'Resume' : 'Pause'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="mb-4 flex-row gap-2.5">
        <View className="flex-1 rounded-[24px] bg-surface-elevated p-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">Your Roster</Text>
          <View className="mt-2 gap-1.5">
            {drafted.length === 0 ? (
              <Text className="text-[12px] text-muted-foreground">No picks yet</Text>
            ) : (
              drafted.slice(-3).map((d) => (
                <View key={d.pick} className="flex-row items-center justify-between">
                  <Text className="text-[12px] font-medium">{d.player.name}</Text>
                  <Text className="text-[12px] text-muted-foreground">{d.player.pos}</Text>
                </View>
              ))
            )}
          </View>
          <Text className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">Needs</Text>
          <View className="mt-1 flex-row flex-wrap gap-1">
            {['RB', 'WR', 'TE'].map((n) => (
              <View key={n} className="rounded-full bg-muted px-2 py-0.5"><Text className="text-[10px] font-medium">{n}</Text></View>
            ))}
          </View>
        </View>
        <View className="flex-1 rounded-[24px] bg-surface-elevated p-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">Recent Picks</Text>
          <View className="mt-2 gap-1.5">
            {drafted.length === 0 ? (
              <Text className="text-[12px] text-muted-foreground">Draft just started</Text>
            ) : (
              drafted.slice(-3).reverse().map((d) => (
                <Text key={d.pick} className="text-[12px]"><Text className="text-muted-foreground">#{d.pick} </Text><Text className="font-medium">{d.player.name}</Text></Text>
              ))
            )}
          </View>
        </View>
      </View>

      <View className="mb-3 flex-row gap-1 rounded-full bg-muted p-1">
        {[
          { k: 'players' as const, label: 'Available' },
          { k: 'queue' as const, label: `Queue · ${queue.length}` },
          { k: 'chat' as const, label: 'Chat' },
        ].map((t) => (
          <Pressable key={t.k} onPress={() => setTab(t.k)} className={cn('flex-1 rounded-full py-1.5', tab === t.k ? 'bg-background' : '')}>
            <Text className={cn('text-center text-[12px] font-medium', tab === t.k ? 'text-foreground' : 'text-muted-foreground')}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'players' ? (
        <>
          <View className="mb-2 flex-row items-center gap-2 rounded-full bg-surface-elevated px-3 py-2">
            <Search size={16} color={c.mutedForeground} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search players" placeholderTextColor={c.mutedForeground} className="flex-1 text-[14px] text-foreground" />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
            {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const).map((p) => (
              <Pressable key={p} onPress={() => setPos(p)} className={cn('shrink-0 rounded-full px-3 py-1', pos === p ? 'bg-foreground' : 'bg-muted')}>
                <Text className={cn('text-[12px] font-medium', pos === p ? 'text-background' : 'text-muted-foreground')}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
            {available.map((p, i) => (
              <Pressable key={p.id} onPress={() => setSelected(p)}>
                <View className={cn('flex-row items-center gap-3 px-3 py-3', i > 0 ? 'border-t border-hairline' : '')}>
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-foreground/5">
                    <Text className="text-[11px] font-semibold">{p.pos}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                      {p.trending ? <TrendingUp size={12} color={c.success} /> : null}
                      {p.health !== 'healthy' ? <Heart size={12} color={c.destructive} /> : null}
                    </View>
                    <Text className="text-[11px] text-muted-foreground">{p.team} · Proj {p.proj} · Bye {p.bye}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[13px] font-semibold tabular-nums">{p.bestAvail}</Text>
                    <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">BA</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {tab === 'queue' ? <QueueInline queue={queue} setQueue={setQueue} onOpenFull={onOpenQueue} /> : null}
      {tab === 'chat' ? <ChatPanel chat={chat} setChat={setChat} /> : null}

      <PlayerSheet
        player={selected}
        inQueue={selected ? queue.includes(selected.id) : false}
        onClose={() => setSelected(null)}
        onQueue={() => selected && setQueue((q) => (q.includes(selected.id) ? q.filter((x) => x !== selected.id) : [...q, selected.id]))}
        onDraft={() => selected && draft(selected)}
      />
    </Shell>
  );
}

function QueueInline({ queue, setQueue, onOpenFull }: { queue: string[]; setQueue: React.Dispatch<React.SetStateAction<string[]>>; onOpenFull: () => void }) {
  const c = useColors();
  const players = queue.map((id) => PLAYERS.find((p) => p.id === id)).filter(Boolean) as Player[];
  return (
    <View className="gap-3">
      <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
        {players.length === 0 ? (
          <View className="px-6 py-10">
            <Text className="text-center text-[15px] font-medium">Queue is empty</Text>
            <Text className="mt-1 text-center text-[12px] text-muted-foreground">Star players from the Available tab to prep your picks.</Text>
          </View>
        ) : (
          players.map((p, i) => (
            <View key={p.id} className={cn('flex-row items-center gap-3 px-3 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <GripVertical size={16} color={c.mutedForeground} />
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-foreground/5"><Text className="text-[11px] font-semibold">{p.pos}</Text></View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14px] font-medium" numberOfLines={1}>{p.name}</Text>
                <Text className="text-[11px] text-muted-foreground">{p.team} · Proj {p.proj}</Text>
              </View>
              <Pressable onPress={() => setQueue((q) => q.filter((id) => id !== p.id))}>
                <X size={16} color={c.mutedForeground} />
              </Pressable>
            </View>
          ))
        )}
      </View>
      <Pressable onPress={onOpenFull} className="h-12 items-center justify-center rounded-full bg-foreground">
        <Text className="text-[14px] font-semibold text-background">Manage Full Queue</Text>
      </Pressable>
    </View>
  );
}

function ChatPanel({ chat, setChat }: { chat: ChatMsg[]; setChat: React.Dispatch<React.SetStateAction<ChatMsg[]>> }) {
  const c = useColors();
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim()) return;
    setChat((m) => [...m, { id: String(Date.now()), who: 'You', text: text.trim() }]);
    setText('');
  };
  return (
    <View className="gap-3">
      <View className="rounded-[24px] bg-foreground/5 px-3 py-2">
        <Text className="text-[11px] text-muted-foreground">📌 Commissioner: Auto-pick is set to 90s. Be ready!</Text>
      </View>
      <View className="gap-2">
        {chat.map((m) => (
          <View key={m.id} className="rounded-2xl bg-surface-elevated px-3 py-2">
            <Text className="text-[11px] font-medium text-muted-foreground">{m.who}</Text>
            <Text className="text-[14px]">{m.text}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row items-center gap-2 rounded-full bg-surface-elevated px-3 py-2">
        <Smile size={16} color={c.mutedForeground} />
        <TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder="Message your league" placeholderTextColor={c.mutedForeground} className="flex-1 text-[14px] text-foreground" />
        <Pressable onPress={send} className="h-8 w-8 items-center justify-center rounded-full bg-foreground">
          <Send size={14} color={c.background} />
        </Pressable>
      </View>
    </View>
  );
}

/* ============= Player Sheet ============= */
function PlayerSheet({ player, inQueue, onClose, onQueue, onDraft }: { player: Player | null; inQueue: boolean; onClose: () => void; onQueue: () => void; onDraft: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!player) return null;
  const outlook = player.bestAvail > 90 ? 'Top of the board. Elite production and high floor.' : player.health !== 'healthy' ? 'Watch the injury report — value is real if cleared.' : 'Solid pick at this slot with strong upside.';
  const rec = player.fit > 85 ? 'This player provides the best long-term value while filling your weakest position.' : 'Reasonable value pick — consider need over upside here.';

  return (
    <Modal visible={!!player} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="mx-2 mb-2 overflow-hidden rounded-[36px] border border-hairline bg-background">
          <View className="items-center pt-2.5"><View className="h-1 w-9 rounded-full bg-muted-foreground/30" /></View>
          <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20) }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5"><Text className="text-[14px] font-semibold">{player.pos}</Text></View>
              <View className="min-w-0 flex-1">
                <Text className="text-[20px] font-semibold tracking-tight" numberOfLines={1}>{player.name}</Text>
                <Text className="text-[12px] text-muted-foreground">{player.team} · Proj {player.proj} · Bye {player.bye}</Text>
              </View>
              <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-muted">
                <X size={16} color={c.mutedForeground} />
              </Pressable>
            </View>

            <View className="mt-4 rounded-[24px] bg-foreground p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] uppercase tracking-widest text-background/60">AI Recommendation</Text>
                <View className="rounded-full bg-background/15 px-2 py-0.5"><Text className="text-[10px] font-semibold text-background">BA {player.bestAvail}</Text></View>
              </View>
              <Text className="mt-2 text-[14px] leading-relaxed text-background">{rec}</Text>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <ScoreCell label="Fit" value={player.fit} />
              <ScoreCell label="Need" value={player.need} />
              <ScoreCell label="Value" value={player.value} />
              <ScoreCell label="Risk" value={player.risk} invert />
              <ScoreCell label="Health" value={player.health === 'healthy' ? 95 : 60} />
              <ScoreCell label="SOS" value={player.sos === 'Easy' ? 90 : player.sos === 'Med' ? 70 : 45} />
            </View>

            <Block title="Fantasy Outlook" body={outlook} />
            <Block title="Recent Performance" body="3-game rolling avg trending up. Two top-12 finishes in the last three weeks." />
            <Block title="Health" body={player.health === 'healthy' ? 'Full practice all week.' : "Listed as questionable. Monitor Friday's report."} />
            <Block title="Schedule" body={`Strength of schedule: ${player.sos}. Bye week ${player.bye}.`} />
            <Block title="Community" body={'"Locked in starter all year." · "Worth the reach for upside." · See full discussion in Players.'} />

            <View className="mt-5 flex-row gap-2">
              <Pressable onPress={onQueue} className="h-12 flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-surface-elevated">
                <Star size={16} color={c.foreground} fill={inQueue ? c.foreground : 'none'} />
                <Text className="text-[14px] font-semibold">{inQueue ? 'Queued' : 'Queue'}</Text>
              </Pressable>
              <Pressable onPress={onDraft} className="h-12 flex-[2] items-center justify-center rounded-full bg-foreground">
                <Text className="text-[15px] font-semibold text-background">Draft {player.name.split(' ').slice(-1)[0]}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ScoreCell({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View className="w-[31%] rounded-2xl bg-surface-elevated p-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Text>
        <Text className="text-[10px] text-foreground">{value}</Text>
      </View>
      <View className="mt-1.5 h-1 rounded-full bg-muted">
        <View className={cn('h-full rounded-full', invert ? 'bg-destructive' : 'bg-foreground')} style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <View className="mt-3 rounded-[20px] bg-surface-elevated p-3">
      <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</Text>
      <Text className="mt-1 text-[13px] leading-relaxed">{body}</Text>
    </View>
  );
}

/* ============= Queue (full page) ============= */
function QueueView({ onBack, onExit, queue, setQueue }: { onBack: () => void; onExit: () => void; queue: string[]; setQueue: React.Dispatch<React.SetStateAction<string[]>> }) {
  const c = useColors();
  const [mode, setMode] = useState<'rank' | 'tier'>('rank');
  const players = queue.map((id) => PLAYERS.find((p) => p.id === id)).filter(Boolean) as Player[];
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= queue.length) return;
    setQueue((q) => {
      const copy = [...q];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  return (
    <Shell title="Player Queue" subtitle={`${players.length} queued`} onBack={onBack} onExit={onExit}>
      <View className="mb-3 flex-row gap-1 rounded-full bg-muted p-1">
        <Pressable onPress={() => setMode('rank')} className={cn('flex-1 flex-row items-center justify-center gap-1 rounded-full py-1.5', mode === 'rank' ? 'bg-background' : '')}>
          <ArrowDownAZ size={12} color={mode === 'rank' ? c.foreground : c.mutedForeground} />
          <Text className={cn('text-[12px] font-medium', mode === 'rank' ? 'text-foreground' : 'text-muted-foreground')}>Rank</Text>
        </Pressable>
        <Pressable onPress={() => setMode('tier')} className={cn('flex-1 flex-row items-center justify-center gap-1 rounded-full py-1.5', mode === 'tier' ? 'bg-background' : '')}>
          <Hash size={12} color={mode === 'tier' ? c.foreground : c.mutedForeground} />
          <Text className={cn('text-[12px] font-medium', mode === 'tier' ? 'text-foreground' : 'text-muted-foreground')}>Tiers</Text>
        </Pressable>
      </View>

      {players.length === 0 ? (
        <View className="rounded-[24px] bg-surface-elevated px-6 py-12">
          <Text className="text-center text-[15px] font-medium">Queue is empty</Text>
          <Text className="mt-1 text-center text-[12px] text-muted-foreground">Star players from the Draft Board to build your shortlist.</Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {players.map((p, i) => (
            <View key={p.id} className={cn('flex-row items-center gap-3 px-3 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <Text className="w-5 text-center text-[12px] font-semibold tabular-nums text-muted-foreground">{i + 1}</Text>
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-foreground/5"><Text className="text-[11px] font-semibold">{p.pos}</Text></View>
              <View className="min-w-0 flex-1">
                <Text className="text-[14px] font-medium" numberOfLines={1}>{p.name}</Text>
                <Text className="text-[11px] text-muted-foreground">{p.team} · BA {p.bestAvail} · Bye {p.bye}</Text>
              </View>
              <View>
                <Pressable onPress={() => move(i, -1)} className="px-1"><Text className="text-muted-foreground">▲</Text></Pressable>
                <Pressable onPress={() => move(i, 1)} className="px-1"><Text className="text-muted-foreground">▼</Text></Pressable>
              </View>
              <Pressable onPress={() => setQueue((q) => q.filter((id) => id !== p.id))}>
                <X size={16} color={c.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="mt-5 flex-row gap-2">
        <View className="flex-1 rounded-[20px] bg-surface-elevated p-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">Sleepers</Text>
          <Text className="mt-1 text-[13px]">G. Wilson · S. LaPorta</Text>
        </View>
        <View className="flex-1 rounded-[20px] bg-surface-elevated p-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">Avoid</Text>
          <Text className="mt-1 text-[13px]">Aging RBs · Bye 6 stack</Text>
        </View>
      </View>
    </Shell>
  );
}

/* ============= Settings ============= */
function DraftSettings({ league, onBack, onExit }: { league: League; onBack: () => void; onExit: () => void }) {
  const isCommish = league.role === 'commissioner';
  const rows = [
    { label: 'Draft Timer', value: '90 seconds' },
    { label: 'Draft Type', value: league.draftType ?? 'Snake' },
    { label: 'Pause Rules', value: 'Commissioner only' },
    { label: 'Pick Trading', value: 'Allowed' },
    { label: 'Draft Order', value: 'Randomized' },
    { label: 'Auto Pick', value: 'Top of queue' },
    { label: 'Draft Chat', value: 'Enabled' },
  ];
  return (
    <Shell title="Draft Settings" subtitle={isCommish ? 'Editable' : 'Read only'} onBack={onBack} onExit={onExit}>
      <View className="overflow-hidden rounded-[28px] bg-surface-elevated">
        {rows.map((r, i) => (
          <View key={r.label} className={cn('flex-row items-center justify-between px-4 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
            <Text className="text-[15px] font-medium">{r.label}</Text>
            <Text className="text-[14px] text-muted-foreground">{r.value}</Text>
          </View>
        ))}
      </View>
      {!isCommish ? <Text className="mt-4 text-center text-[12px] text-muted-foreground">Only the commissioner can change these settings.</Text> : null}
    </Shell>
  );
}

/* ============= Join ============= */
function JoinDraft({ onBack, onExit, onDone }: { onBack: () => void; onExit: () => void; onDone: () => void }) {
  const c = useColors();
  const [tab, setTab] = useState<'link' | 'code' | 'invite'>('code');
  const [code, setCode] = useState('');
  return (
    <Shell title="Join Draft" onBack={onBack} onExit={onExit}>
      <View className="mb-3 flex-row gap-1 rounded-full bg-muted p-1">
        {[
          { k: 'link' as const, label: 'Invite Link' },
          { k: 'code' as const, label: 'League Code' },
          { k: 'invite' as const, label: 'Invitation' },
        ].map((t) => (
          <Pressable key={t.k} onPress={() => setTab(t.k)} className={cn('flex-1 rounded-full py-1.5', tab === t.k ? 'bg-background' : '')}>
            <Text className={cn('text-center text-[12px] font-medium', tab === t.k ? 'text-foreground' : 'text-muted-foreground')}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <View className="rounded-[28px] bg-surface-elevated p-4">
        {tab === 'link' ? <TextInput placeholder="Paste invite link" placeholderTextColor={c.mutedForeground} className="px-2 py-3 text-[15px] text-foreground" /> : null}
        {tab === 'code' ? (
          <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase().slice(0, 8))} placeholder="ABCD-1234" placeholderTextColor={c.mutedForeground} className="px-2 py-3 text-center text-[24px] font-semibold tracking-[8px] text-foreground" />
        ) : null}
        {tab === 'invite' ? <Text className="text-center text-[13px] text-muted-foreground">No pending invitations.</Text> : null}
      </View>
      <Pressable onPress={onDone} className="mt-6 h-14 items-center justify-center rounded-full bg-foreground">
        <Text className="text-[17px] font-semibold tracking-tightish text-background">Join Draft</Text>
      </Pressable>
    </Shell>
  );
}

/* ============= Complete ============= */
function DraftComplete({ league, onExit, onBegin }: { league: League; onExit: () => void; onBegin: () => void }) {
  const c = useColors();
  const grades = [
    { team: 'Your Team', grade: 'A-', note: 'Balanced roster, high floor' },
    { team: 'Marcus Hill', grade: 'A', note: 'Best draft of the league' },
    { team: 'Jenna Park', grade: 'B+', note: 'Strong WR core' },
    { team: 'Devon Reed', grade: 'B', note: 'Reached early on TE' },
    { team: 'Sam Ortiz', grade: 'C', note: 'Thin at RB' },
  ];
  return (
    <Shell title="Draft Complete" subtitle={league.name} onExit={onExit} hideBack>
      <View className="mb-5 rounded-[30px] bg-foreground p-5">
        <Trophy size={28} color={c.background} />
        <Text className="mt-2 text-[22px] font-semibold tracking-tight text-background">That's a wrap.</Text>
        <Text className="mt-1 text-[13px] text-background/70">Every pick is locked in. Review your grade and head to Home to start the season.</Text>
      </View>

      <View className="mb-4 overflow-hidden rounded-[24px] bg-surface-elevated">
        <Text className="px-4 pb-2 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">Team Grades</Text>
        {grades.map((g, i) => (
          <View key={g.team} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
            <View className="h-9 w-9 items-center justify-center rounded-2xl bg-foreground"><Text className="text-[13px] font-semibold text-background">{g.grade}</Text></View>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-medium">{g.team}</Text>
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{g.note}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mb-5 flex-row gap-2">
        <Highlight label="Best Value" value="Bijan Robinson" />
        <Highlight label="Biggest Steal" value="S. LaPorta" />
        <Highlight label="Biggest Reach" value="J. Tucker" />
      </View>

      <View className="rounded-[20px] bg-surface-elevated p-4">
        <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Summary</Text>
        <Text className="mt-1 text-[13px] leading-relaxed">Strong RB-anchored build with WR depth. Watch waivers for an early TE2 to hedge your starter's bye week.</Text>
      </View>

      <Pressable onPress={onBegin} className="mt-6 h-14 items-center justify-center rounded-full bg-foreground">
        <Text className="text-[17px] font-semibold tracking-tightish text-background">Begin Season</Text>
      </Pressable>
      <Text className="pt-3 text-center text-[12px] text-muted-foreground">Draft results stay accessible from Commissioner → Draft.</Text>
    </Shell>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-[20px] bg-surface-elevated p-3">
      <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-1 text-[13px] font-medium" numberOfLines={1}>{value}</Text>
    </View>
  );
}
