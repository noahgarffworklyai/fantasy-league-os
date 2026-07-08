import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { Card, Divider } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { PlayerHealthPanel } from '@/components/player/PlayerHealthPanel';
import { PlayerOverviewPanel, type PlayerProfileContext } from '@/components/player/PlayerOverviewPanel';
import { PlayerPerformancePanel } from '@/components/player/PlayerPerformancePanel';
import { PlayerProfileTabs, type PlayerProfileTab } from '@/components/player/PlayerProfileTabs';
import { useLeague, type League } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';
import { spacing } from '@/lib/tokens';
import { usePlayerSleeperStats } from '@/lib/use-player-sleeper-stats';

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

const onDark = {
  muted: 'rgba(252,252,252,0.6)',
  sub: 'rgba(252,252,252,0.7)',
} as const;

function useDraftStyles() {
  const { hex } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  return useMemo(() => StyleSheet.create({

  fill: { flex: 1 },
  shell: { flex: 1, backgroundColor: hex.surface },
  shellHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: hex.hairline,
    backgroundColor: hex.surface,
  },
  shellHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backSpacer: { width: 72 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerCenter: { alignItems: 'center' },
  headerTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingRight: 4,
  },
  exitBtn: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.muted,
    paddingHorizontal: 12,
  },
  iconBtn: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.muted,
  },
  heroBanner: {
    marginBottom: 16,
    borderRadius: 30,
    backgroundColor: hex.primary,
    padding: 20,
  },
  heroCta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 9999,
    backgroundColor: hex.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listRowSm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  miniCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: hex.surfaceElevated,
    padding: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: hex.surfaceElevated,
    padding: 12,
  },
  posBadge: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: `rgba(${ink},0.05)`,
  },
  posBadgeSm: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: `rgba(${ink},0.05)`,
  },
  posBadgeLg: {
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: `rgba(${ink},0.05)`,
  },
  progressTrack: {
    marginBottom: 16,
    height: 4,
    overflow: 'hidden',
    borderRadius: 9999,
    backgroundColor: hex.muted,
  },
  progressFill: { height: '100%', backgroundColor: hex.primary },
  formCard: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: hex.surfaceElevated,
    padding: 8,
  },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 4 },
  choice: { width: '48%', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  clockBanner: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 28,
    backgroundColor: hex.primary,
    padding: 16,
  },
  filterPill: { flexShrink: 0, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 },
  needPill: {
    borderRadius: 9999,
    backgroundColor: hex.muted,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  boardTabs: {
    marginBottom: 12,
    flexDirection: 'row',
    gap: 4,
    borderRadius: 9999,
    backgroundColor: hex.muted,
    padding: 4,
  },
  boardTab: { flex: 1, borderRadius: 9999, paddingVertical: 6 },
  boardTabActive: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 6,
    backgroundColor: hex.background,
  },
  scoreCell: {
    width: '31%',
    borderRadius: 16,
    backgroundColor: hex.surfaceElevated,
    padding: 10,
  },
  infoBlock: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: hex.surfaceElevated,
    padding: 12,
  },
  sheet: {
    marginHorizontal: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hex.hairline,
    backgroundColor: hex.background,
  },
  sheetHandle: {
    height: 4,
    width: 36,
    borderRadius: 9999,
    backgroundColor: 'rgba(99,99,99,0.3)',
  },
  aiRec: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: hex.primary,
    padding: 16,
  },
  chatPin: {
    borderRadius: 24,
    backgroundColor: `rgba(${ink},0.05)`,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBubble: {
    borderRadius: 16,
    backgroundColor: hex.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    backgroundColor: hex.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.primary,
  },
  sheetActions: { marginTop: 20, flexDirection: 'row', gap: 8 },
  queueBtn: {
    height: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9999,
    backgroundColor: hex.surfaceElevated,
  },
  draftBtn: {
    height: 48,
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.primary,
  },
  centeredStat: {
    marginBottom: 16,
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: hex.surfaceElevated,
    padding: 20,
  },
  emptyState: { paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center' },
  btnSm: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.primary,
  },
  btnDisabled: { opacity: 0.4 },
  rowGapSm: { gap: 6, marginTop: 8 },
  rowGap: { gap: 8 },
  sectionGap: { gap: 12 },
  dualRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  flexShrink: { minWidth: 0, flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '500',
    color: hex.foreground,
  },
  textInputMd: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '500',
    color: hex.foreground,
  },
  textInputSm: { flex: 1, fontSize: 14, color: hex.foreground },
  textInputCode: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 8,
    color: hex.foreground,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pauseBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(252,252,252,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  baPill: {
    borderRadius: 9999,
    backgroundColor: 'rgba(252,252,252,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gradesHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  rankTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 9999,
    paddingVertical: 6,
  },
  rankTabActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 9999,
    paddingVertical: 6,
    backgroundColor: hex.background,
  },

  }), [hex, ink]);
}

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
    const t = setTimeout(() => setSeconds((sec) => sec - 1), 1000);
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
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const insets = useSafeAreaInsets();
  return (
    <View style={s.shell}>
      <View style={[s.shellHeader, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={s.shellHeaderRow}>
          {hideBack || !onBack ? (
            <View style={s.backSpacer} />
          ) : (
            <Pressable onPress={onBack} style={s.backBtn}>
              <ChevronLeft size={20} color={toneFg.success} />
              <Text variant="body" style={{ color: toneFg.success }}>
                Back
              </Text>
            </Pressable>
          )}
          <View style={s.headerCenter}>
            <Text variant="caption" muted>
              Current Draft
            </Text>
            <Text variant="titleMd">{title}</Text>
            {subtitle ? (
              <Text variant="caption" muted>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={s.headerTrailing}>
            {trailing}
            <Pressable onPress={onExit} style={s.exitBtn}>
              <Text variant="bodyMuted">Exit</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView
        style={s.fill}
        contentContainerStyle={[layout.screen, { paddingBottom: Math.max(insets.bottom, 32) }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/* ============= Draft Home ============= */
function DraftHome({ league, onExit, onGo }: { league: League; onExit: () => void; onGo: (v: DraftView) => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <View style={s.heroBanner}>
        <Text variant="eyebrow" style={{ color: onDark.muted }}>
          {synced ? 'Synced Draft' : league.stage === 'draft' ? 'Live' : 'Preseason'}
        </Text>
        <Text variant="titleLg" style={{ color: hex.primaryForeground, marginTop: 4, fontSize: 24 }}>
          {synced ? 'Your draft, deeper.' : league.stage === 'draft' ? 'Draft in progress' : 'Get ready to draft'}
        </Text>
        <Text variant="subtitle" style={{ color: onDark.sub, marginTop: 4 }}>
          {synced ? `Drafted on ${league.platform}. Mirrored in Commissioner.` : 'Set up your league, prep your queue, and run a premium draft.'}
        </Text>
        {!synced ? (
          <Pressable onPress={() => onGo({ kind: 'board' })} style={s.heroCta}>
            <PlayCircle size={16} color={hex.foreground} />
            <Text variant="button" style={{ color: hex.foreground }}>
              Enter Draft Board
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Card>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <View key={card.key}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={card.go}>
                <View style={s.listRow}>
                  <View style={surfaces.iconBoxDark}>
                    <Icon size={18} color={hex.background} strokeWidth={2.25} />
                  </View>
                  <View style={s.flexShrink}>
                    <Text variant="titleLg">{card.title}</Text>
                    <Text variant="subtitle" numberOfLines={1}>
                      {card.sub}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={c.mutedForeground} />
                </View>
              </Pressable>
            </View>
          );
        })}
      </Card>
    </Shell>
  );
}

/* ============= Create League ============= */
function CreateLeague({ onBack, onExit, onDone }: { onBack: () => void; onExit: () => void; onDone: () => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const STEPS = ['League Name', 'League Size', 'Scoring', 'Buy-in', 'Prize Structure', 'Draft Date', 'Draft Type', 'Review'];
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', size: 12, scoring: 'Half PPR', buyIn: 50, prize: '60 / 30 / 10', date: '', draftType: 'Snake' });
  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : onDone());
  const back = () => (step > 0 ? setStep(step - 1) : onBack());
  const disabled = step === 0 && !data.name;

  return (
    <Shell title="Create League" subtitle={`Step ${step + 1} of ${STEPS.length}`} onBack={back} onExit={onExit}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>
      <Text variant="sectionTitle" style={{ paddingHorizontal: 4 }}>
        {STEPS[step]}
      </Text>
      <Text variant="subtitle" style={{ marginBottom: 16, paddingHorizontal: 4 }}>
        Set it once. Members will see it everywhere.
      </Text>

      <View style={s.formCard}>
        {step === 0 ? (
          <TextInput
            autoFocus
            value={data.name}
            onChangeText={(t) => setData({ ...data, name: t })}
            placeholder="e.g. The Sunday Scaries"
            placeholderTextColor={c.mutedForeground}
            style={s.textInput}
          />
        ) : null}
        {step === 1 ? <Choices value={String(data.size)} onChange={(v) => setData({ ...data, size: Number(v) })} opts={['8', '10', '12', '14']} /> : null}
        {step === 2 ? <Choices value={data.scoring} onChange={(v) => setData({ ...data, scoring: v })} opts={['Standard', 'Half PPR', 'PPR']} /> : null}
        {step === 3 ? <Choices value={String(data.buyIn)} onChange={(v) => setData({ ...data, buyIn: Number(v) })} opts={['0', '25', '50', '100', '250']} prefix="$" /> : null}
        {step === 4 ? <Choices value={data.prize} onChange={(v) => setData({ ...data, prize: v })} opts={['100 (winner)', '60 / 30 / 10', '50 / 30 / 15 / 5']} /> : null}
        {step === 5 ? (
          <TextInput
            value={data.date}
            onChangeText={(t) => setData({ ...data, date: t })}
            placeholder="Sat Aug 23, 7:00 PM"
            placeholderTextColor={c.mutedForeground}
            style={s.textInputMd}
          />
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

      <Pressable onPress={next} disabled={disabled} style={[surfaces.primaryButton, { marginTop: 24 }, disabled ? s.btnDisabled : null]}>
        <Text variant="titleMd" style={{ color: hex.primaryForeground }}>
          {step === STEPS.length - 1 ? 'Create League' : 'Continue'}
        </Text>
      </Pressable>
    </Shell>
  );
}

function Choices({ value, onChange, opts, prefix }: { value: string; onChange: (v: string) => void; opts: string[]; prefix?: string }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={s.choiceGrid}>
      {opts.map((o) => {
        const sel = value === o || value === o.split(' ')[0];
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[s.choice, { backgroundColor: sel ? hex.primary : hex.background }]}
          >
            <Text variant="body" style={{ color: sel ? hex.primaryForeground : hex.foreground }}>
              {prefix}
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Review({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View>
      {!first ? <Divider /> : null}
      <View style={s.reviewRow}>
        <Text variant="bodySm" muted>
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}

/* ============= Readiness ============= */
function ReadinessView({ league, onBack, onExit, onOpen }: { league: League; onBack: () => void; onExit: () => void; onOpen: (k: ReadinessKey) => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <Card>
        {items.map((it, i) => (
          <View key={it.key}>
            {i > 0 ? <Divider /> : null}
            <Pressable onPress={() => onOpen(it.key)}>
              <View style={[s.listRowSm, { gap: 12 }]}>
                <StatusIcon status={it.status} />
                <View style={s.flexShrink}>
                  <Text variant="body">{it.label}</Text>
                  <Text variant="subtitle" numberOfLines={1}>
                    {it.sub}
                  </Text>
                </View>
                <ChevronRight size={16} color={c.mutedForeground} />
              </View>
            </Pressable>
          </View>
        ))}
      </Card>
    </Shell>
  );
}

function StatusIcon({ status }: { status: 'complete' | 'progress' | 'attention' }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  const c = useColors();
  if (status === 'complete')
    return (
      <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: toneFg.success }]}>
        <Check size={16} color={hex.background} />
      </View>
    );
  if (status === 'progress')
    return (
      <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: toneBg.warning }]}>
        <Circle size={12} color={c.foreground} fill={c.foreground} />
      </View>
    );
  return (
    <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: `rgba(${ink},0.05)` }]}>
      <AlertCircle size={16} color={c.mutedForeground} />
    </View>
  );
}

function ReadinessStep({ stepKey, onBack, onExit }: { stepKey: ReadinessKey; onBack: () => void; onExit: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <View style={surfaces.roundedCardLg}>
        <Text variant="body" muted style={{ textAlign: 'center' }}>
          {stepKey === 'order'
            ? 'Randomize the order, drag to set manually, or schedule a live reveal.'
            : stepKey === 'dues'
              ? 'Collect entry fees in Treasury before draft day.'
              : stepKey === 'rules'
                ? 'Roster, scoring, and schedule. Edit in League Settings.'
                : 'Configure this step to keep your league on track.'}
        </Text>
      </View>
      <Pressable onPress={onBack} style={[surfaces.primaryButton, { marginTop: 24 }]}>
        <Text variant="titleMd" style={{ color: hex.primaryForeground }}>
          Save & Return
        </Text>
      </Pressable>
    </Shell>
  );
}

/* ============= Invite ============= */
function InviteView({ league, onBack, onExit }: { league: League; onBack: () => void; onExit: () => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <View style={s.centeredStat}>
        <Text variant="eyebrow">League Capacity</Text>
        <Text variant="scoreLG" style={{ marginTop: 4 }}>
          {joined} of {size} Joined
        </Text>
        <Text variant="subtitle" style={{ marginTop: 4, textAlign: 'center' }}>
          {pending} pending · {paid} paid · Draft Ready: {joined === size && paid === size ? 'Yes' : 'No'}
        </Text>
      </View>
      <Card>
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <View key={r.label}>
              {i > 0 ? <Divider /> : null}
              <Pressable>
                <View style={s.listRowSm}>
                  <View style={surfaces.iconBoxDark}>
                    <Icon size={16} color={hex.background} />
                  </View>
                  <View style={s.flexShrink}>
                    <Text variant="body">{r.label}</Text>
                    <Text variant="bodyMuted" numberOfLines={1}>
                      {r.sub}
                    </Text>
                  </View>
                  <Copy size={16} color={c.mutedForeground} />
                </View>
              </Pressable>
            </View>
          );
        })}
      </Card>
      <Pressable onPress={onBack} style={[surfaces.primaryButton, { marginTop: 24 }]}>
        <Text variant="titleMd" style={{ color: hex.primaryForeground }}>
          Return to Readiness
        </Text>
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
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      trailing={
        isCommish ? (
          <Pressable onPress={onSettings} style={s.iconBtn}>
            <SettingsIcon size={16} color={c.mutedForeground} />
          </Pressable>
        ) : null
      }
    >
      <View style={s.clockBanner}>
        <View style={s.flexShrink}>
          <Text variant="caption" style={{ color: onDark.muted, textTransform: 'uppercase', letterSpacing: 2 }}>
            On the clock
          </Text>
          <Text variant="titleLg" style={{ color: hex.primaryForeground }}>
            {onClock}
          </Text>
          <Text variant="caption" style={{ color: onDark.muted }}>
            Pick {pickNumber} · Round {round}
          </Text>
        </View>
        <View style={s.alignEnd}>
          <Text variant="hero" style={{ color: hex.primaryForeground, fontSize: 34, lineHeight: 34 }}>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </Text>
          {isCommish ? (
            <Pressable onPress={() => setPaused((p) => !p)} style={s.pauseBtn}>
              {paused ? <PlayCircle size={12} color={hex.background} /> : <Pause size={12} color={hex.background} />}
              <Text variant="pill" style={{ color: hex.primaryForeground }}>
                {paused ? 'Resume' : 'Pause'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={s.dualRow}>
        <View style={s.miniCard}>
          <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
            Your Roster
          </Text>
          <View style={s.rowGapSm}>
            {drafted.length === 0 ? (
              <Text variant="bodyMuted">No picks yet</Text>
            ) : (
              drafted.slice(-3).map((d) => (
                <View key={d.pick} style={s.rowBetween}>
                  <Text variant="bodyMuted" style={{ fontWeight: '500' }}>
                    {d.player.name}
                  </Text>
                  <Text variant="bodyMuted">{d.player.pos}</Text>
                </View>
              ))
            )}
          </View>
          <Text variant="caption" muted style={{ marginTop: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
            Needs
          </Text>
          <View style={s.rowWrap}>
            {['RB', 'WR', 'TE'].map((n) => (
              <View key={n} style={s.needPill}>
                <Text variant="pill">{n}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.miniCard}>
          <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
            Recent Picks
          </Text>
          <View style={s.rowGapSm}>
            {drafted.length === 0 ? (
              <Text variant="bodyMuted">Draft just started</Text>
            ) : (
              drafted
                .slice(-3)
                .reverse()
                .map((d) => (
                  <Text key={d.pick} variant="bodyMuted">
                    <Text muted>#{d.pick} </Text>
                    <Text style={{ fontWeight: '500' }}>{d.player.name}</Text>
                  </Text>
                ))
            )}
          </View>
        </View>
      </View>

      <View style={s.boardTabs}>
        {[
          { k: 'players' as const, label: 'Available' },
          { k: 'queue' as const, label: `Queue · ${queue.length}` },
          { k: 'chat' as const, label: 'Chat' },
        ].map((t) => (
          <Pressable key={t.k} onPress={() => setTab(t.k)} style={tab === t.k ? s.boardTabActive : s.boardTab}>
            <Text variant="pill" style={{ textAlign: 'center', color: tab === t.k ? hex.foreground : hex.mutedForeground }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'players' ? (
        <>
          <View style={[layout.searchBar, { marginBottom: 8, borderRadius: 9999 }]}>
            <Search size={16} color={c.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search players"
              placeholderTextColor={c.mutedForeground}
              style={s.textInputSm}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
            {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPos(p)}
                style={[s.filterPill, { backgroundColor: pos === p ? hex.primary : hex.muted }]}
              >
                <Text variant="pill" style={{ color: pos === p ? hex.primaryForeground : hex.mutedForeground }}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={surfaces.roundedCard}>
            {available.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable onPress={() => setSelected(p)}>
                  <View style={s.listRowCompact}>
                    <View style={s.posBadge}>
                      <Text variant="caption">{p.pos}</Text>
                    </View>
                    <View style={s.flexShrink}>
                      <View style={[s.row, { gap: 6 }]}>
                        <Text variant="body" numberOfLines={1}>
                          {p.name}
                        </Text>
                        {p.trending ? <TrendingUp size={12} color={toneFg.success} /> : null}
                        {p.health !== 'healthy' ? <Heart size={12} color={toneFg.danger} /> : null}
                      </View>
                      <Text variant="caption" muted>
                        {p.team} · Proj {p.proj} · Bye {p.bye}
                      </Text>
                    </View>
                    <View style={s.alignEnd}>
                      <Text variant="bodySm">{p.bestAvail}</Text>
                      <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
                        BA
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
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
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const players = queue.map((id) => PLAYERS.find((p) => p.id === id)).filter(Boolean) as Player[];
  return (
    <View style={s.sectionGap}>
      <View style={surfaces.roundedCard}>
        {players.length === 0 ? (
          <View style={s.emptyState}>
            <Text variant="body">Queue is empty</Text>
            <Text variant="bodyMuted" style={{ marginTop: 4, textAlign: 'center' }}>
              Star players from the Available tab to prep your picks.
            </Text>
          </View>
        ) : (
          players.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <View style={s.listRowCompact}>
                <GripVertical size={16} color={c.mutedForeground} />
                <View style={s.posBadgeSm}>
                  <Text variant="caption">{p.pos}</Text>
                </View>
                <View style={s.flexShrink}>
                  <Text variant="bodySm" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" muted>
                    {p.team} · Proj {p.proj}
                  </Text>
                </View>
                <Pressable onPress={() => setQueue((q) => q.filter((id) => id !== p.id))}>
                  <X size={16} color={c.mutedForeground} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
      <Pressable onPress={onOpenFull} style={s.btnSm}>
        <Text variant="button" style={{ color: hex.primaryForeground }}>
          Manage Full Queue
        </Text>
      </Pressable>
    </View>
  );
}

function ChatPanel({ chat, setChat }: { chat: ChatMsg[]; setChat: React.Dispatch<React.SetStateAction<ChatMsg[]>> }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [text, setText] = useState('');
  const send = () => {
    if (!text.trim()) return;
    setChat((m) => [...m, { id: String(Date.now()), who: 'You', text: text.trim() }]);
    setText('');
  };
  return (
    <View style={s.sectionGap}>
      <View style={s.chatPin}>
        <Text variant="caption" muted>
          📌 Commissioner: Auto-pick is set to 90s. Be ready!
        </Text>
      </View>
      <View style={s.rowGap}>
        {chat.map((m) => (
          <View key={m.id} style={s.chatBubble}>
            <Text variant="caption" muted style={{ fontWeight: '500' }}>
              {m.who}
            </Text>
            <Text variant="bodySm">{m.text}</Text>
          </View>
        ))}
      </View>
      <View style={s.chatInput}>
        <Smile size={16} color={c.mutedForeground} />
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder="Message your league"
          placeholderTextColor={c.mutedForeground}
          style={s.textInputSm}
        />
        <Pressable onPress={send} style={s.sendBtn}>
          <Send size={14} color={hex.background} />
        </Pressable>
      </View>
    </View>
  );
}

/* ============= Player Sheet ============= */
function draftProfileContext(player: Player): PlayerProfileContext {
  return {
    id: player.id,
    name: player.name,
    pos: player.pos,
    team: player.team,
    proj: player.proj,
    status: player.health === 'questionable' || player.health === 'doubtful' ? 'q' : 'ok',
  };
}

function PlayerSheet({ player, inQueue, onClose, onQueue, onDraft }: { player: Player | null; inQueue: boolean; onClose: () => void; onQueue: () => void; onDraft: () => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PlayerProfileTab>('overview');
  const profile = player ? draftProfileContext(player) : null;
  const { data: sleeperStats } = usePlayerSleeperStats(player?.id, player ? {
    name: player.name,
    pos: player.pos,
    team: player.team,
    status: profile?.status,
    fallbackProj: player.proj,
  } : undefined);
  if (!player || !profile) return null;

  const displayProj = sleeperStats?.weekProj ?? player.proj;
  const rec = player.fit > 85 ? 'This player provides the best long-term value while filling your weakest position.' : 'Reasonable value pick — consider need over upside here.';

  return (
    <Modal visible={!!player} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={s.sheet}>
          <View style={[layout.centered, { paddingTop: 10 }]}>
            <View style={s.sheetHandle} />
          </View>
          <ScrollView
            style={{ maxHeight: 560 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20) }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[s.row, { gap: 12 }]}>
              <View style={s.posBadgeLg}>
                <Text variant="bodySm">{player.pos}</Text>
              </View>
              <View style={s.flexShrink}>
                <Text variant="sectionTitle" numberOfLines={1}>
                  {player.name}
                </Text>
                <Text variant="bodyMuted">
                  {player.team} · Proj {displayProj.toFixed(1)} · Bye {player.bye}
                </Text>
              </View>
              <Pressable onPress={onClose} style={s.iconBtn}>
                <X size={16} color={c.mutedForeground} />
              </Pressable>
            </View>

            <View style={s.aiRec}>
              <View style={s.rowBetween}>
                <Text variant="caption" style={{ color: onDark.muted, textTransform: 'uppercase', letterSpacing: 2 }}>
                  AI Recommendation
                </Text>
                <View style={s.baPill}>
                  <Text variant="pill" style={{ color: hex.primaryForeground, fontWeight: '600' }}>
                    BA {player.bestAvail}
                  </Text>
                </View>
              </View>
              <Text variant="bodySm" style={{ color: hex.primaryForeground, marginTop: 8, lineHeight: 20 }}>
                {rec}
              </Text>
            </View>

            <View style={[layout.rowWrap, { gap: 8, marginTop: 12 }]}>
              <ScoreCell label="Fit" value={player.fit} />
              <ScoreCell label="Need" value={player.need} />
              <ScoreCell label="Value" value={player.value} />
              <ScoreCell label="Risk" value={player.risk} invert />
              <ScoreCell label="Health" value={player.health === 'healthy' ? 95 : 60} />
              <ScoreCell label="SOS" value={player.sos === 'Easy' ? 90 : player.sos === 'Med' ? 70 : 45} />
            </View>

            <View style={{ marginTop: spacing.section }}>
              <PlayerProfileTabs value={tab} onChange={setTab} />
            </View>

            <View style={{ marginTop: spacing.section, gap: spacing.section }}>
              {tab === 'overview' ? <PlayerOverviewPanel player={profile} /> : null}
              {tab === 'performance' ? <PlayerPerformancePanel player={profile} /> : null}
              {tab === 'health' ? <PlayerHealthPanel player={profile} /> : null}
            </View>

            <View style={s.sheetActions}>
              <Pressable onPress={onQueue} style={s.queueBtn}>
                <Star size={16} color={c.foreground} fill={inQueue ? c.foreground : 'none'} />
                <Text variant="bodySm">{inQueue ? 'Queued' : 'Queue'}</Text>
              </Pressable>
              <Pressable onPress={onDraft} style={s.draftBtn}>
                <Text variant="body" style={{ color: hex.primaryForeground }}>
                  Draft {player.name.split(' ').slice(-1)[0]}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ScoreCell({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={s.scoreCell}>
      <View style={s.rowBetween}>
        <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
          {label}
        </Text>
        <Text variant="pill">{value}</Text>
      </View>
      <View style={[surfaces.progressTrack, { marginTop: 6 }]}>
        <View
          style={[
            surfaces.progressFill,
            { width: `${pct}%`, backgroundColor: invert ? hex.danger : hex.primary },
          ]}
        />
      </View>
    </View>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={s.infoBlock}>
      <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
        {title}
      </Text>
      <Text variant="subtitle" style={{ marginTop: 4, lineHeight: 20 }}>
        {body}
      </Text>
    </View>
  );
}

/* ============= Queue (full page) ============= */
function QueueView({ onBack, onExit, queue, setQueue }: { onBack: () => void; onExit: () => void; queue: string[]; setQueue: React.Dispatch<React.SetStateAction<string[]>> }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <View style={s.boardTabs}>
        <Pressable onPress={() => setMode('rank')} style={mode === 'rank' ? s.rankTabActive : s.rankTab}>
          <ArrowDownAZ size={12} color={mode === 'rank' ? c.foreground : c.mutedForeground} />
          <Text variant="pill" style={{ color: mode === 'rank' ? hex.foreground : hex.mutedForeground }}>
            Rank
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode('tier')} style={mode === 'tier' ? s.rankTabActive : s.rankTab}>
          <Hash size={12} color={mode === 'tier' ? c.foreground : c.mutedForeground} />
          <Text variant="pill" style={{ color: mode === 'tier' ? hex.foreground : hex.mutedForeground }}>
            Tiers
          </Text>
        </Pressable>
      </View>

      {players.length === 0 ? (
        <View style={[surfaces.emptyState, { borderRadius: 24 }]}>
          <Text variant="body">Queue is empty</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4, textAlign: 'center' }}>
            Star players from the Draft Board to build your shortlist.
          </Text>
        </View>
      ) : (
        <View style={surfaces.roundedCard}>
          {players.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <View style={s.listRowCompact}>
                <Text variant="pill" muted style={{ width: 20, textAlign: 'center' }}>
                  {i + 1}
                </Text>
                <View style={s.posBadgeSm}>
                  <Text variant="caption">{p.pos}</Text>
                </View>
                <View style={s.flexShrink}>
                  <Text variant="bodySm" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" muted>
                    {p.team} · BA {p.bestAvail} · Bye {p.bye}
                  </Text>
                </View>
                <View>
                  <Pressable onPress={() => move(i, -1)} style={{ paddingHorizontal: 4 }}>
                    <Text muted>▲</Text>
                  </Pressable>
                  <Pressable onPress={() => move(i, 1)} style={{ paddingHorizontal: 4 }}>
                    <Text muted>▼</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setQueue((q) => q.filter((id) => id !== p.id))}>
                  <X size={16} color={c.mutedForeground} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={[s.dualRow, { marginTop: 20, marginBottom: 0 }]}>
        <View style={s.statCard}>
          <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
            Sleepers
          </Text>
          <Text variant="subtitle" style={{ marginTop: 4 }}>
            G. Wilson · S. LaPorta
          </Text>
        </View>
        <View style={s.statCard}>
          <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
            Avoid
          </Text>
          <Text variant="subtitle" style={{ marginTop: 4 }}>
            Aging RBs · Bye 6 stack
          </Text>
        </View>
      </View>
    </Shell>
  );
}

/* ============= Settings ============= */
function DraftSettings({ league, onBack, onExit }: { league: League; onBack: () => void; onExit: () => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <Card>
        {rows.map((r, i) => (
          <View key={r.label}>
            {i > 0 ? <Divider /> : null}
            <View style={[s.rowBetween, { paddingHorizontal: 16, paddingVertical: 14 }]}>
              <Text variant="body">{r.label}</Text>
              <Text variant="bodySm" muted>
                {r.value}
              </Text>
            </View>
          </View>
        ))}
      </Card>
      {!isCommish ? (
        <Text variant="bodyMuted" style={{ marginTop: 16, textAlign: 'center' }}>
          Only the commissioner can change these settings.
        </Text>
      ) : null}
    </Shell>
  );
}

/* ============= Join ============= */
function JoinDraft({ onBack, onExit, onDone }: { onBack: () => void; onExit: () => void; onDone: () => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<'link' | 'code' | 'invite'>('code');
  const [code, setCode] = useState('');
  return (
    <Shell title="Join Draft" onBack={onBack} onExit={onExit}>
      <Segmented
        tabs={[
          { key: 'link', label: 'Invite Link' },
          { key: 'code', label: 'League Code' },
          { key: 'invite', label: 'Invitation' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View style={[surfaces.roundedCardLg, { padding: 16, marginTop: 12 }]}>
        {tab === 'link' ? (
          <TextInput placeholder="Paste invite link" placeholderTextColor={c.mutedForeground} style={s.textInputMd} />
        ) : null}
        {tab === 'code' ? (
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 8))}
            placeholder="ABCD-1234"
            placeholderTextColor={c.mutedForeground}
            style={s.textInputCode}
          />
        ) : null}
        {tab === 'invite' ? (
          <Text variant="subtitle" muted style={{ textAlign: 'center' }}>
            No pending invitations.
          </Text>
        ) : null}
      </View>
      <Pressable onPress={onDone} style={[surfaces.primaryButton, { marginTop: 24 }]}>
        <Text variant="titleMd" style={{ color: hex.primaryForeground }}>
          Join Draft
        </Text>
      </Pressable>
    </Shell>
  );
}

/* ============= Complete ============= */
function DraftComplete({ league, onExit, onBegin }: { league: League; onExit: () => void; onBegin: () => void }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
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
      <View style={[s.heroBanner, { marginBottom: 20 }]}>
        <Trophy size={28} color={hex.background} />
        <Text variant="sectionTitle" style={{ color: hex.primaryForeground, marginTop: 8 }}>
          That's a wrap.
        </Text>
        <Text variant="subtitle" style={{ color: onDark.sub, marginTop: 4 }}>
          Every pick is locked in. Review your grade and head to Home to start the season.
        </Text>
      </View>

      <View style={[surfaces.roundedCard, { marginBottom: 16 }]}>
        <Text variant="caption" muted style={[s.gradesHeader, { textTransform: 'uppercase', letterSpacing: 2 }]}>
          Team Grades
        </Text>
        {grades.map((g, i) => (
          <View key={g.team}>
            {i > 0 ? <Divider /> : null}
            <View style={s.listRowCompact}>
              <View style={surfaces.iconBoxDark}>
                <Text variant="bodySm" style={{ color: hex.primaryForeground }}>
                  {g.grade}
                </Text>
              </View>
              <View style={s.flexShrink}>
                <Text variant="bodySm">{g.team}</Text>
                <Text variant="bodyMuted" numberOfLines={1}>
                  {g.note}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={[s.dualRow, { marginBottom: 20 }]}>
        <Highlight label="Best Value" value="Bijan Robinson" />
        <Highlight label="Biggest Steal" value="S. LaPorta" />
        <Highlight label="Biggest Reach" value="J. Tucker" />
      </View>

      <View style={[surfaces.aiCard, { borderColor: `rgba(${ink},0.1)` }]}>
        <View style={[s.row, { gap: 6 }]}>
          <Sparkles size={14} color={c.mutedForeground} />
          <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
            AI Summary
          </Text>
        </View>
        <Text variant="subtitle" style={{ marginTop: 4, lineHeight: 20 }}>
          Strong RB-anchored build with WR depth. Watch waivers for an early TE2 to hedge your starter's bye week.
        </Text>
      </View>

      <Pressable onPress={onBegin} style={[surfaces.primaryButton, { marginTop: 24 }]}>
        <Text variant="titleMd" style={{ color: hex.primaryForeground }}>
          Begin Season
        </Text>
      </Pressable>
      <Text variant="bodyMuted" style={{ paddingTop: 12, textAlign: 'center' }}>
        Draft results stay accessible from Commissioner → Draft.
      </Text>
    </Shell>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  const s = useDraftStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={s.statCard}>
      <Text variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 2 }}>
        {label}
      </Text>
      <Text variant="subtitle" style={{ marginTop: 4, fontWeight: '500' }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
