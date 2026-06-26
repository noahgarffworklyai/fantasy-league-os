import { useState, type ReactNode } from 'react';
import { Modal, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  HeartPulse,
  type LucideIcon,
  Minus,
  MessageCircle,
  Plus,
  Repeat,
  Send,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { AICard, AISection, ConfidencePill } from '@/components/ui/AICard';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { useLeague } from '@/lib/league-context';
import {
  evaluateTrade,
  teamCoaching,
  tradeIdeas,
  waiverTargets,
  type TradeIdea,
  type WaiverTarget,
} from '@/lib/ai-intelligence';
import { personAvatar, playerAvatar } from '@/lib/avatars';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

// ====================== Player data ======================
type LiveStatus = 'field' | 'redzone' | 'scored';
type PlayerDetail = {
  name: string;
  pos: string;
  team: string;
  proj?: number;
  opp?: string;
  status?: 'ok' | 'q' | 'o';
  value?: number;
  note?: string;
  seasonPts?: number;
  avg?: number;
  rank?: string;
  ownership?: string;
  live?: LiveStatus;
  liveNote?: string;
};

const STARTERS: PlayerDetail[] = [
  { name: 'J. Allen', pos: 'QB', team: 'BUF', opp: 'vs MIA', proj: 22.4, status: 'ok', value: 34, seasonPts: 218.4, avg: 24.3, rank: 'QB2', ownership: '99%', live: 'scored', liveNote: 'TD pass · +6.2 pts' },
  { name: 'B. Robinson', pos: 'RB', team: 'ATL', opp: '@ TB', proj: 16.1, status: 'ok', value: 38, seasonPts: 184.2, avg: 18.4, rank: 'RB4', ownership: '100%', live: 'redzone', liveNote: '1st & goal at 4' },
  { name: 'K. Walker III', pos: 'RB', team: 'SEA', opp: 'vs SF', proj: 13.8, status: 'q', value: 22, seasonPts: 142.6, avg: 14.3, rank: 'RB18', ownership: '99%', note: 'Ankle · limited Wed/Thu', live: 'field' },
  { name: 'J. Jefferson', pos: 'WR', team: 'MIN', opp: 'vs GB', proj: 19.7, status: 'ok', value: 42, seasonPts: 196.8, avg: 21.9, rank: 'WR1', ownership: '100%', live: 'field' },
  { name: 'P. Nacua', pos: 'WR', team: 'LAR', opp: '@ SF', proj: 14.2, status: 'ok', value: 30, seasonPts: 161.4, avg: 17.9, rank: 'WR8', ownership: '99%' },
  { name: 'T. Kelce', pos: 'TE', team: 'KC', opp: '@ BUF', proj: 11.4, status: 'q', value: 28, seasonPts: 132.1, avg: 14.7, rank: 'TE3', ownership: '100%', note: 'Knee · expected to play' },
  { name: 'R. Odunze', pos: 'WR', team: 'CHI', opp: 'vs DET', proj: 10.9, status: 'ok', value: 14, seasonPts: 96.2, avg: 12.0, rank: 'WR42', ownership: '84%' },
  { name: 'J. Tucker', pos: 'K', team: 'BAL', opp: 'vs CIN', proj: 8.1, status: 'ok', value: 6, seasonPts: 92.4, avg: 9.2, rank: 'K3', ownership: '98%' },
  { name: 'Steelers', pos: 'DEF', team: 'PIT', opp: '@ CLE', proj: 7.6, status: 'ok', value: 5, seasonPts: 84.0, avg: 8.4, rank: 'DEF5', ownership: '92%' },
];

const STARTER_SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLX', 'K', 'DEF'];

const BENCH: (PlayerDetail & { trend: string })[] = [
  { name: 'B. Purdy', pos: 'QB', team: 'SF', proj: 18.9, trend: 'up', status: 'ok', opp: 'ELITE matchup', value: 16, seasonPts: 178.3, avg: 19.8, rank: 'QB6', ownership: '96%', live: 'field' },
  { name: 'J. Mims', pos: 'RB', team: 'DEN', proj: 9.2, trend: 'up', status: 'ok', opp: 'Volume rising', value: 8, seasonPts: 62.4, avg: 7.8, rank: 'RB48', ownership: '44%' },
  { name: 'C. Olave', pos: 'WR', team: 'NO', proj: 11.4, trend: 'down', status: 'q', opp: 'Tough CB', value: 22, seasonPts: 118.4, avg: 13.2, rank: 'WR24', ownership: '98%', note: 'Concussion protocol' },
  { name: 'D. Goedert', pos: 'TE', team: 'PHI', proj: 8.5, trend: 'flat', status: 'ok', opp: 'Steady', value: 9, seasonPts: 78.4, avg: 8.7, rank: 'TE12', ownership: '82%' },
];

const IR: PlayerDetail[] = [
  { name: 'C. McCaffrey', pos: 'RB', team: 'SF', note: 'Achilles · throw 12 carries/wk on return', opp: 'Lead back upside', value: 40, seasonPts: 48.2, avg: 16.1, rank: 'RB36', ownership: '100%' },
];

const AVAILABLE_PLAYERS: PlayerDetail[] = [
  { name: 'Tank Bigsby', pos: 'RB', team: 'JAX', proj: 11.2, value: 18, ownership: '42%', rank: 'RB38', note: 'Etienne Q · drew 17 carries last week' },
  { name: 'Tyler Conklin', pos: 'TE', team: 'NYJ', proj: 7.8, value: 9, ownership: '31%', rank: 'TE16', note: '23% target share last 3 games' },
  { name: 'Quentin Johnston', pos: 'WR', team: 'LAC', proj: 9.4, value: 11, ownership: '28%', rank: 'WR52', note: 'Snap share climbing' },
  { name: 'Roschon Johnson', pos: 'RB', team: 'CHI', proj: 8.1, value: 7, ownership: '22%', rank: 'RB54', note: 'Goal-line work' },
  { name: 'Rams DEF', pos: 'DEF', team: 'LAR', proj: 8.4, value: 6, ownership: '38%', rank: 'DEF12', note: '3 of next 4 vs rookie QBs' },
  { name: 'Cade Otton', pos: 'TE', team: 'TB', proj: 6.9, value: 5, ownership: '18%', rank: 'TE22', note: 'Streaming option' },
];

const LEAGUE_MANAGERS = [
  { id: 'm1', name: 'Marcus Hill', team: 'Steel Curtain', lastMsg: 'Open to moving Bigsby for a WR2.' },
  { id: 'm2', name: 'Jenna Park', team: 'Park Place', lastMsg: 'Not interested right now.' },
  { id: 'm3', name: 'Devon Reed', team: 'Reed Between', lastMsg: 'Counter inbound — check it out.' },
  { id: 'm4', name: 'Priya Shah', team: 'Shah Bros', lastMsg: '' },
];

const MY_PLAYERS = [
  { id: 'mp1', name: 'Travis Kelce', pos: 'TE', value: 28 },
  { id: 'mp2', name: 'Chris Olave', pos: 'WR', value: 22 },
  { id: 'mp3', name: 'Rome Odunze', pos: 'WR', value: 14 },
  { id: 'mp4', name: 'Brock Purdy', pos: 'QB', value: 16 },
];
const THEIR_PLAYERS = [
  { id: 'tp1', name: 'DK Metcalf', pos: 'WR', value: 26 },
  { id: 'tp2', name: 'Tank Bigsby', pos: 'RB', value: 18 },
  { id: 'tp3', name: 'Tyler Conklin', pos: 'TE', value: 9 },
  { id: 'tp4', name: 'Geno Smith', pos: 'QB', value: 12 },
];

const PLAYER_VALUES: PlayerDetail[] = [
  { name: 'Justin Jefferson', pos: 'WR', team: 'MIN', value: 42 },
  { name: 'Bijan Robinson', pos: 'RB', team: 'ATL', value: 38 },
  { name: 'Travis Kelce', pos: 'TE', team: 'KC', value: 28 },
  { name: 'DK Metcalf', pos: 'WR', team: 'SEA', value: 26 },
  { name: 'Chris Olave', pos: 'WR', team: 'NO', value: 22 },
  { name: 'Tank Bigsby', pos: 'RB', team: 'JAX', value: 18 },
];
const VALUE_TRENDS: Record<string, 'up' | 'down' | 'flat'> = {
  'Justin Jefferson': 'up',
  'Bijan Robinson': 'up',
  'Travis Kelce': 'down',
  'DK Metcalf': 'flat',
  'Chris Olave': 'down',
  'Tank Bigsby': 'up',
};

type TabKey = 'lineup' | 'health' | 'trade' | 'waivers';

function slotEligible(slot: string, pos: string): boolean {
  if (slot === 'FLX') return pos === 'RB' || pos === 'WR' || pos === 'TE';
  return slot === pos;
}

export default function TeamPage() {
  const { active } = useLeague();
  const [tab, setTab] = useState<TabKey>('lineup');
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [starters, setStarters] = useState<PlayerDetail[]>(STARTERS);
  const [bench, setBench] = useState<(PlayerDetail & { trend: string })[]>(BENCH);
  const [confirmDrop, setConfirmDrop] = useState<PlayerDetail | null>(null);
  if (!active) return null;
  const isSynced = active.type === 'synced';

  const onMyTeam = (p: PlayerDetail | null) =>
    !!p &&
    (starters.some((x) => x.name === p.name) ||
      bench.some((x) => x.name === p.name) ||
      IR.some((x) => x.name === p.name));

  const handleDrop = (p: PlayerDetail) => {
    setStarters((s) => s.filter((x) => x.name !== p.name));
    setBench((b) => b.filter((x) => x.name !== p.name));
    setConfirmDrop(null);
    setPlayer(null);
  };

  const swapStarter = (slotIdx: number, benchIdx: number) => {
    const benchPlayer = bench[benchIdx];
    const starter = starters[slotIdx];
    const benchTrend = benchPlayer.trend;
    setStarters((s) => s.map((x, i) => (i === slotIdx ? { ...benchPlayer } : x)));
    setBench((b) => b.map((x, i) => (i === benchIdx ? { ...starter, trend: benchTrend } : x)));
  };

  return (
    <Screen>
      <View className="gap-5 px-4 pb-10 pt-1">
        <TeamHeader
          teamName={active.teamName ?? `${active.shortName} Squad`}
          record={active.record}
          projectedFinish={`Proj #${Math.max(1, Math.min(active.members, active.rank || 3))}`}
          rank={`#${active.rank || '—'} of ${active.members}`}
          editable={!isSynced}
        />

        <Segmented
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'lineup', label: 'Lineup' },
            { key: 'health', label: 'Health' },
            { key: 'trade', label: 'Trade' },
            { key: 'waivers', label: 'Waivers' },
          ]}
        />

        {tab === 'lineup' ? (
          <LineupPane isSynced={isSynced} platform={active.platform} leagueId={active.id} onPlayer={setPlayer} starters={starters} bench={bench} onSwap={swapStarter} />
        ) : null}
        {tab === 'health' ? <HealthPane onPlayer={setPlayer} /> : null}
        {tab === 'trade' ? <TradePane synced={isSynced} platform={active.platform} onPlayer={setPlayer} /> : null}
        {tab === 'waivers' ? <WaiversPane synced={isSynced} platform={active.platform} onPlayer={setPlayer} /> : null}
      </View>

      <PlayerSheet
        player={player}
        onClose={() => setPlayer(null)}
        synced={isSynced}
        platform={active.platform}
        canDrop={!isSynced && onMyTeam(player)}
        onRequestDrop={(p) => setConfirmDrop(p)}
      />
      <ConfirmDropDialog player={confirmDrop} onCancel={() => setConfirmDrop(null)} onConfirm={() => confirmDrop && handleDrop(confirmDrop)} />
    </Screen>
  );
}

// ====================== Shared bits ======================
function TeamHeader({
  teamName,
  record,
  projectedFinish,
  rank,
  editable,
}: {
  teamName: string;
  record: string;
  projectedFinish: string;
  rank: string;
  editable: boolean;
}) {
  const c = useColors();
  const [name, setName] = useState(teamName);
  const [editing, setEditing] = useState(false);
  return (
    <View className="px-1 pt-1">
      {editing && editable ? (
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onBlur={() => setEditing(false)}
          className="text-[34px] font-semibold tracking-tighter2 text-foreground"
        />
      ) : (
        <Text onPress={() => editable && setEditing(true)} className="text-[34px] font-semibold leading-[36px] tracking-tighter2">
          {name}
        </Text>
      )}
      <Text className="mt-2 text-[13px] text-muted-foreground">
        {record} · {projectedFinish} · {rank}
      </Text>
      <View className="hidden">{c.background}</View>
    </View>
  );
}

function TeamSection({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between px-1">
        <Text className="text-[20px] font-semibold tracking-tighter2">{title}</Text>
        {caption ? <Text className="text-[12px] text-muted-foreground">{caption}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function LiveDot({ status }: { status?: LiveStatus }) {
  if (!status) return null;
  const color = status === 'scored' ? 'bg-warning' : status === 'redzone' ? 'bg-danger' : 'bg-success';
  return <View className={cn('h-2.5 w-2.5 rounded-full', color)} />;
}

// ====================== Lineup pane ======================
function LineupPane({
  isSynced,
  platform,
  leagueId,
  onPlayer,
  starters,
  bench,
  onSwap,
}: {
  isSynced: boolean;
  platform?: string;
  leagueId: string;
  onPlayer: (p: PlayerDetail) => void;
  starters: PlayerDetail[];
  bench: (PlayerDetail & { trend: string })[];
  onSwap: (slotIdx: number, benchIdx: number) => void;
}) {
  const { active } = useLeague();
  const c = useColors();
  const starterProj = starters.reduce((s, r) => s + (r.proj ?? 0), 0);
  const coaching = teamCoaching(active!);
  const [editing, setEditing] = useState(false);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  void leagueId;

  return (
    <View className="gap-5">
      <TeamSection title="Weekly matchup">
        <Card>
          <View className="flex-row">
            <Side label="You" score="118.4" proj="126.2" remaining="5 to play" />
            <View className="w-px bg-hairline" />
            <Side label="Steel Curtain" score="104.1" proj="112.4" remaining="6 to play" />
          </View>
          <View className="border-t border-hairline px-6 py-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Win probability</Text>
              <Text className="text-[13px] font-semibold tracking-tightish text-success">72%</Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View className="h-full rounded-full bg-success" style={{ width: '72%' }} />
            </View>
          </View>
        </Card>
      </TeamSection>

      <TeamSection
        title="Starting lineup"
        caption={isSynced ? `Recommended · ${platform}` : editing ? 'Tap a slot to swap' : 'Tap Edit to swap starters'}
      >
        <Card>
          <View className="flex-row items-center justify-between px-6 py-5">
            <View>
              <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Projected</Text>
              <Text className="mt-1 text-[28px] font-semibold tracking-tighter2">{starterProj.toFixed(1)}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-success/15 px-2.5 py-1">
                <Text className="text-[11px] font-semibold tracking-wide text-success">72% win</Text>
              </View>
              {!isSynced ? (
                <Pressable
                  onPress={() => setEditing((v) => !v)}
                  className={cn('rounded-full px-3 py-1', editing ? 'bg-foreground' : 'bg-foreground/5')}
                >
                  <Text className={cn('text-[11px] font-semibold tracking-wide', editing ? 'text-background' : 'text-foreground')}>
                    {editing ? 'Done' : 'Edit'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View className="border-t border-hairline">
            {starters.map((r, i) => (
              <PlayerRow
                key={STARTER_SLOTS[i] + r.name}
                slot={STARTER_SLOTS[i]}
                player={r}
                divided={i > 0}
                editing={editing}
                onPress={() => (editing ? setSwapSlot(i) : onPlayer(r))}
              />
            ))}
          </View>
          {isSynced ? <PlatformAction label={`Set lineup in ${platform}`} sub="Changes apply on platform" /> : null}
        </Card>
      </TeamSection>

      <TeamSection title="Bench">
        <Card>
          {bench.map((p, i) => (
            <BenchRow key={p.name} player={p} divided={i > 0} onPress={() => onPlayer(p)} />
          ))}
        </Card>
      </TeamSection>

      <SwapSheet
        open={swapSlot !== null}
        slot={swapSlot !== null ? STARTER_SLOTS[swapSlot] : ''}
        currentStarter={swapSlot !== null ? starters[swapSlot] : null}
        bench={bench}
        onClose={() => setSwapSlot(null)}
        onPick={(benchIdx) => {
          if (swapSlot !== null) onSwap(swapSlot, benchIdx);
          setSwapSlot(null);
        }}
      />

      <AISection title="Coach's recommendations" caption="Updated today">
        {coaching.map((r) => (
          <AICard key={r.id} rec={r} />
        ))}
      </AISection>
      <View className="hidden">{c.background}</View>
    </View>
  );
}

function Side({ label, score, proj, remaining }: { label: string; score: string; proj: string; remaining: string }) {
  return (
    <View className="flex-1 px-6 py-5">
      <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-1 text-[28px] font-semibold tracking-tighter2">{score}</Text>
      <Text className="mt-1 text-[12px] text-muted-foreground">Proj {proj}</Text>
      <Text className="text-[12px] text-muted-foreground">{remaining}</Text>
    </View>
  );
}

function PlatformAction({ label, sub }: { label: string; sub: string }) {
  const c = useColors();
  return (
    <View className="flex-row items-center justify-between border-t border-hairline px-6 py-4">
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold tracking-tightish">{label}</Text>
        <Text className="text-[12px] text-muted-foreground">{sub}</Text>
      </View>
      <ArrowUpRight size={20} color={c.mutedForeground} />
    </View>
  );
}

function PlayerRow({
  slot,
  player,
  divided,
  editing,
  onPress,
}: {
  slot: string;
  player: PlayerDetail;
  divided?: boolean;
  editing?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <View className={cn('flex-row items-center gap-3 px-5 py-3.5', divided ? 'border-t border-hairline' : '')}>
        <View className="h-7 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Text className="text-[10px] font-semibold tracking-wider text-muted-foreground">{slot}</Text>
        </View>
        <View className="relative">
          <AvatarImage src={playerAvatar(player.name + player.team)} name={player.name} className="h-9 w-9" />
          {player.live ? (
            <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
              <LiveDot status={player.live} />
            </View>
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{player.name}</Text>
          <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
            {player.liveNote ?? `${player.pos} · ${player.team} · ${player.opp}`}
          </Text>
        </View>
        {player.status === 'q' ? (
          <View className="rounded-full bg-warning/25 px-2 py-0.5"><Text className="text-[10px] font-semibold uppercase">Q</Text></View>
        ) : null}
        {player.status === 'o' ? (
          <View className="rounded-full bg-danger/15 px-2 py-0.5"><Text className="text-[10px] font-semibold uppercase text-danger">Out</Text></View>
        ) : null}
        <Text className="w-12 text-right text-[15px] font-semibold tabular-nums tracking-tightish">{player.proj?.toFixed(1)}</Text>
        {editing ? <Repeat size={16} color={c.foreground} /> : <ChevronRight size={16} color={c.mutedForeground} />}
      </View>
    </Pressable>
  );
}

function BenchRow({ player, divided, onPress }: { player: PlayerDetail & { trend: string }; divided?: boolean; onPress?: () => void }) {
  const c = useColors();
  const TrendIcon = player.trend === 'up' ? TrendingUp : player.trend === 'down' ? TrendingDown : Activity;
  const trendColor = player.trend === 'up' ? c.success : player.trend === 'down' ? c.danger : c.mutedForeground;
  return (
    <Pressable onPress={onPress}>
      <View className={cn('flex-row items-center gap-3 px-5 py-3.5', divided ? 'border-t border-hairline' : '')}>
        <View className="h-7 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Text className="text-[10px] font-semibold tracking-wider text-muted-foreground">BN</Text>
        </View>
        <View className="relative">
          <AvatarImage src={playerAvatar(player.name + player.team)} name={player.name} className="h-9 w-9" />
          {player.live ? (
            <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
              <LiveDot status={player.live} />
            </View>
          ) : null}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{player.name}</Text>
          <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{player.pos} · {player.team} · {player.opp}</Text>
        </View>
        <TrendIcon size={16} color={trendColor} />
        {player.status === 'q' ? (
          <View className="rounded-full bg-warning/25 px-2 py-0.5"><Text className="text-[10px] font-semibold uppercase">Q</Text></View>
        ) : null}
        <Text className="w-12 text-right text-[15px] font-semibold tabular-nums tracking-tightish">{player.proj?.toFixed(1)}</Text>
      </View>
    </Pressable>
  );
}

// ====================== Health pane ======================
function HealthPane({ onPlayer }: { onPlayer: (p: PlayerDetail) => void }) {
  const c = useColors();
  const injured = [...STARTERS, ...BENCH].filter((p) => p.status === 'q' || p.status === 'o');
  return (
    <View className="gap-5">
      <TeamSection title="Roster health">
        <Card>
          <View className="flex-row px-2 py-5">
            <Tile value="11" label="Healthy" tone="success" first />
            <Tile value="2" label="Quest." tone="warning" />
            <Tile value="1" label="Out" tone="danger" />
            <Tile value="1" label="IR" tone="muted" />
          </View>
          <View className="flex-row items-center justify-between border-t border-hairline px-6 py-4">
            <View>
              <Text className="text-[13px] font-medium tracking-tightish">Health score</Text>
              <Text className="text-[12px] text-muted-foreground">Above league average</Text>
            </View>
            <Text className="text-[22px] font-semibold tracking-tighter2 text-success">82</Text>
          </View>
        </Card>
      </TeamSection>

      <TeamSection title="Injured players" caption={`${injured.length} flagged`}>
        <Card>
          {injured.map((p, i) => (
            <Pressable key={p.name} onPress={() => onPlayer(p)}>
              <View className={cn('flex-row items-start gap-3 px-5 py-4', i > 0 ? 'border-t border-hairline' : '')}>
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-warning/20">
                  <AlertTriangle size={16} color={c.warning} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                    {p.pos} · {p.team} · {p.status === 'o' ? 'Out' : 'Questionable'}
                  </Text>
                  {p.note ? <Text className="mt-1 text-[12px] text-muted-foreground">{p.note}</Text> : null}
                </View>
                <ChevronRight size={16} color={c.mutedForeground} />
              </View>
            </Pressable>
          ))}
        </Card>
      </TeamSection>

      <TeamSection title="Injured reserve">
        <Card>
          {IR.length === 0 ? (
            <EmptyState icon={HeartPulse} title="No one on IR" sub="A healthy roster is a happy roster." />
          ) : (
            IR.map((p, i) => (
              <Pressable key={p.name} onPress={() => onPlayer(p)}>
                <View className={cn('px-5 py-4', i > 0 ? 'border-t border-hairline' : '')}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-9 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Text className="text-[11px] font-semibold tracking-wider text-muted-foreground">IR</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                      <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{p.pos} · {p.team}</Text>
                    </View>
                    <ChevronRight size={16} color={c.mutedForeground} />
                  </View>
                  {p.note ? <Text className="mt-3 text-[13px] text-muted-foreground">{p.note}</Text> : null}
                </View>
              </Pressable>
            ))
          )}
        </Card>
      </TeamSection>

      <TeamSection title="Team analytics">
        <Card>
          <View className="flex-row flex-wrap px-6 py-5">
            {[
              ['Snap reliability', '91%'],
              ['Injury risk', 'Low'],
              ['Avg games missed', '0.4'],
              ['Bye-week pain', 'Wk 10'],
              ['Depth score', 'B+'],
              ['Backup readiness', 'High'],
            ].map(([l, v], i) => (
              <View key={l} className={cn('w-1/2', i < 4 ? 'pb-5' : '')}>
                <TrendStat label={l} value={v} />
              </View>
            ))}
          </View>
        </Card>
      </TeamSection>
    </View>
  );
}

function Tile({ value, label, tone, first }: { value: string; label: string; tone: 'success' | 'warning' | 'danger' | 'muted'; first?: boolean }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-muted-foreground';
  return (
    <View className={cn('flex-1 items-center', first ? '' : 'border-l border-hairline')}>
      <Text className={cn('text-[28px] font-semibold tracking-tighter2', color)}>{value}</Text>
      <Text className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</Text>
    </View>
  );
}

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-1.5 text-[18px] font-semibold tracking-tighter2">{value}</Text>
    </View>
  );
}

function EmptyState({ icon: IconComp, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  const c = useColors();
  return (
    <View className="items-center gap-2 px-6 py-10">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <IconComp size={20} color={c.mutedForeground} />
      </View>
      <Text className="text-[15px] font-medium tracking-tightish">{title}</Text>
      <Text className="text-[12px] text-muted-foreground">{sub}</Text>
    </View>
  );
}

// ====================== Trade pane ======================
type TradeMode = 'hub' | 'pickManager' | 'machine';
type Prefill = { mgrId: string; give: string[]; receive: string[] } | null;

function TradePane({ synced, platform, onPlayer }: { synced: boolean; platform?: string; onPlayer: (p: PlayerDetail) => void }) {
  const c = useColors();
  const [mode, setMode] = useState<TradeMode>('hub');
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [proposeTo, setProposeTo] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<Prefill>(null);

  if (chatWith) {
    const mgr = LEAGUE_MANAGERS.find((m) => m.id === chatWith)!;
    return <PrivateChat manager={mgr} onBack={() => setChatWith(null)} synced={synced} platform={platform} />;
  }
  if (proposeTo) {
    const mgr = LEAGUE_MANAGERS.find((m) => m.id === proposeTo)!;
    return (
      <TradeBuilder
        manager={mgr}
        title="Send trade"
        synced={synced}
        platform={platform}
        initialGive={prefill?.mgrId === mgr.id ? prefill?.give : undefined}
        initialReceive={prefill?.mgrId === mgr.id ? prefill?.receive : undefined}
        onBack={() => {
          setProposeTo(null);
          setPrefill(null);
        }}
        onSent={() => {
          setProposeTo(null);
          setPrefill(null);
          setMode('hub');
        }}
      />
    );
  }
  if (mode === 'machine') {
    return (
      <TradeMachine
        onBack={() => setMode('hub')}
        onSendTrade={(p) => {
          setPrefill(p);
          setProposeTo(p.mgrId);
        }}
      />
    );
  }
  if (mode === 'pickManager') {
    return (
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setMode('hub')}><Text className="text-[14px] font-semibold text-success">← Trade</Text></Pressable>
          <Text className="text-[15px] font-semibold tracking-tightish">Send a trade</Text>
          <View className="w-12" />
        </View>
        <Card>
          {LEAGUE_MANAGERS.map((m, i) => (
            <View key={m.id} className={cn('flex-row items-center gap-3 px-5 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
              <AvatarImage src={personAvatar(m.id + m.name)} name={m.name} className="h-10 w-10" />
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{m.name}</Text>
                <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{m.team}</Text>
              </View>
              <Pressable onPress={() => setChatWith(m.id)} className="h-9 w-9 items-center justify-center rounded-full bg-muted">
                <MessageCircle size={16} color={c.foreground} />
              </Pressable>
              <Pressable onPress={() => setProposeTo(m.id)} className="rounded-full bg-foreground px-3 py-2">
                <Text className="text-[12px] font-semibold text-background">Propose</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="flex-row gap-3">
        <Pressable onPress={() => setMode('pickManager')} className="flex-1 rounded-[28px] border border-hairline bg-surface-elevated p-5">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-foreground">
            <Send size={20} color={c.background} />
          </View>
          <Text className="mt-4 text-[16px] font-semibold tracking-tightish">Send a trade</Text>
          <Text className="mt-1 text-[12px] leading-snug text-muted-foreground">Pick a manager, chat privately, or build a proposal.</Text>
        </Pressable>
        <Pressable onPress={() => setMode('machine')} className="flex-1 rounded-[28px] border border-hairline bg-surface-elevated p-5">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-foreground">
            <Repeat size={20} color={c.background} />
          </View>
          <Text className="mt-4 text-[16px] font-semibold tracking-tightish">Mock trade machine</Text>
          <Text className="mt-1 text-[12px] leading-snug text-muted-foreground">Explore needs, generate trades, send when one fits.</Text>
        </Pressable>
      </View>

      <TeamSection title="Player values" caption="Updated daily">
        <Card>
          {PLAYER_VALUES.map((p, i) => {
            const trend = VALUE_TRENDS[p.name] ?? 'flat';
            const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
            const trendColor = trend === 'up' ? c.success : trend === 'down' ? c.danger : c.mutedForeground;
            return (
              <Pressable key={p.name} onPress={() => onPlayer(p)}>
                <View className={cn('flex-row items-center gap-3 px-5 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
                  <View className="h-9 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Text className="text-[11px] font-semibold tracking-wider text-muted-foreground">{p.pos}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                    <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{p.team}</Text>
                  </View>
                  <TrendIcon size={16} color={trendColor} />
                  <Text className="w-12 text-right text-[15px] font-semibold tabular-nums tracking-tightish">{p.value}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
      </TeamSection>

      <AISection title="Trade ideas">
        {tradeIdeas.map((idea) => (
          <TradeIdeaCard key={idea.id} idea={idea} synced={synced} platform={platform} />
        ))}
      </AISection>
    </View>
  );
}

type Need = 'QB' | 'RB' | 'WR' | 'TE';
type GeneratedTrade = {
  id: string;
  mgrId: string;
  mgrName: string;
  team: string;
  give: { id: string; name: string; pos: string; value: number }[];
  receive: { id: string; name: string; pos: string; value: number }[];
  grade: 'A' | 'B' | 'C';
  why: string;
};

const MANAGER_POOLS: Record<string, typeof THEIR_PLAYERS> = {
  m1: [
    { id: 'm1-1', name: 'Tank Bigsby', pos: 'RB', value: 18 },
    { id: 'm1-2', name: 'Jaylen Warren', pos: 'RB', value: 14 },
    { id: 'm1-3', name: 'Diontae Johnson', pos: 'WR', value: 13 },
  ],
  m2: [
    { id: 'm2-1', name: 'DK Metcalf', pos: 'WR', value: 26 },
    { id: 'm2-2', name: 'Jordan Love', pos: 'QB', value: 17 },
    { id: 'm2-3', name: 'Tyler Conklin', pos: 'TE', value: 9 },
  ],
  m3: [
    { id: 'm3-1', name: 'Geno Smith', pos: 'QB', value: 12 },
    { id: 'm3-2', name: 'Tyjae Spears', pos: 'RB', value: 15 },
    { id: 'm3-3', name: 'Jakobi Meyers', pos: 'WR', value: 12 },
  ],
  m4: [
    { id: 'm4-1', name: 'Dallas Goedert', pos: 'TE', value: 14 },
    { id: 'm4-2', name: 'Khalil Shakir', pos: 'WR', value: 16 },
    { id: 'm4-3', name: 'Brian Robinson', pos: 'RB', value: 13 },
  ],
};

function gradeFor(delta: number): GeneratedTrade['grade'] {
  if (delta >= -2) return 'A';
  if (delta >= -6) return 'B';
  return 'C';
}

function generateTrades(needs: Need[], seed: number, include: string[] = []): GeneratedTrade[] {
  const out: GeneratedTrade[] = [];
  const targetNeeds = needs.length ? needs : (['RB', 'WR'] as Need[]);
  const forced = MY_PLAYERS.filter((p) => include.includes(p.id));
  LEAGUE_MANAGERS.forEach((mgr, mi) => {
    const pool = MANAGER_POOLS[mgr.id] ?? [];
    const want = pool.find((p) => targetNeeds.includes(p.pos as Need));
    if (!want) return;
    const candidates = [...MY_PLAYERS].sort((a, b) => Math.abs(a.value - want.value) - Math.abs(b.value - want.value));
    const give = forced.length ? forced[(seed + mi) % forced.length] : candidates[(seed + mi) % candidates.length];
    const delta = want.value - give.value;
    out.push({
      id: `${mgr.id}-${seed}`,
      mgrId: mgr.id,
      mgrName: mgr.name,
      team: mgr.team,
      give: [{ ...give }],
      receive: [{ ...want }],
      grade: gradeFor(delta),
      why: delta >= 0 ? `You gain ${delta} in trade value and patch your ${want.pos} room.` : `Slight value loss (${delta}) but addresses ${want.pos} need directly.`,
    });
  });
  return out.slice(0, 4);
}

function TradeMachine({ onBack, onSendTrade }: { onBack: () => void; onSendTrade: (p: { mgrId: string; give: string[]; receive: string[] }) => void }) {
  const c = useColors();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [include, setInclude] = useState<string[]>([]);
  const [seed, setSeed] = useState(0);
  const [generated, setGenerated] = useState<GeneratedTrade[]>([]);
  const toggleNeed = (n: Need) => setNeeds((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const toggleInclude = (id: string) => setInclude((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const generate = () => {
    const next = seed + 1;
    setSeed(next);
    setGenerated(generateTrades(needs, next, include));
  };
  const byPos = MY_PLAYERS.reduce<Record<string, number>>((acc, p) => {
    acc[p.pos] = (acc[p.pos] ?? 0) + p.value;
    return acc;
  }, {});

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onBack}><Text className="text-[14px] font-semibold text-success">← Trade</Text></Pressable>
        <Text className="text-[15px] font-semibold tracking-tightish">Mock trade machine</Text>
        <View className="w-12" />
      </View>

      <TeamSection title="Your roster" caption="Tap to include in mock">
        <Card>
          <View className="flex-row px-1 py-3">
            {(['QB', 'RB', 'WR', 'TE'] as Need[]).map((pos, i) => (
              <View key={pos} className={cn('flex-1 items-center', i > 0 ? 'border-l border-hairline' : '')}>
                <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{pos}</Text>
                <Text className="mt-0.5 text-[15px] font-semibold tabular-nums">{byPos[pos] ?? 0}</Text>
              </View>
            ))}
          </View>
          <View className="border-t border-hairline">
            {MY_PLAYERS.map((p, i) => {
              const picked = include.includes(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggleInclude(p.id)}>
                  <View className={cn('flex-row items-center gap-3 px-5 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
                    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                      <Text className="text-[11px] font-semibold tracking-wider text-muted-foreground">{p.pos}</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                      <Text className="text-[12px] text-muted-foreground">Value {p.value}</Text>
                    </View>
                    <View className={cn('h-7 min-w-[64px] items-center justify-center rounded-full px-2', picked ? 'bg-foreground' : 'bg-muted')}>
                      <Text className={cn('text-[11px] font-semibold', picked ? 'text-background' : 'text-muted-foreground')}>{picked ? 'Included' : 'Include'}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </TeamSection>

      <TeamSection title="Trade builder" caption="Tag positions to shape the trade">
        <Card>
          <View className="gap-4 p-5">
            <View>
              <Text className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Position tags</Text>
              <View className="flex-row gap-2">
                {(['QB', 'RB', 'WR', 'TE'] as Need[]).map((n) => {
                  const on = needs.includes(n);
                  return (
                    <Pressable key={n} onPress={() => toggleNeed(n)} className={cn('h-14 flex-1 items-center justify-center rounded-2xl', on ? 'bg-foreground' : 'bg-muted')}>
                      <Text className={cn('text-[15px] tracking-tightish', on ? 'text-background' : 'text-foreground')}>{n}</Text>
                      <Text className={cn('text-[10px] font-medium', on ? 'text-background/70' : 'text-muted-foreground')}>{on ? 'Targeted' : 'Tap'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable onPress={generate} className="h-11 items-center justify-center rounded-full bg-foreground">
              <Text className="text-[13px] font-semibold text-background">{generated.length ? 'Mock again' : 'Generate'}</Text>
            </Pressable>
          </View>
        </Card>
      </TeamSection>

      {generated.length > 0 ? (
        <TeamSection title="Generated trades" caption={`Round ${seed}`}>
          <View className="gap-3">
            {generated.map((t) => (
              <Card key={t.id}>
                <View className="p-4">
                  <View className="flex-row items-center gap-3">
                    <AvatarImage src={personAvatar(t.mgrId + t.mgrName)} name={t.mgrName} className="h-9 w-9" />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[14px] font-semibold tracking-tightish" numberOfLines={1}>{t.mgrName}</Text>
                      <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{t.team}</Text>
                    </View>
                    <View className={cn('h-8 w-8 items-center justify-center rounded-full', t.grade === 'A' ? 'bg-success' : t.grade === 'B' ? 'bg-warning' : 'bg-destructive')}>
                      <Text className="text-[13px] font-bold text-background">{t.grade}</Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1 rounded-2xl bg-muted p-3">
                      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">You give</Text>
                      {t.give.map((p) => (
                        <Text key={p.id} className="mt-1 text-[13px] font-medium tracking-tightish">{p.name} · {p.pos} {p.value}</Text>
                      ))}
                    </View>
                    <View className="flex-1 rounded-2xl bg-muted p-3">
                      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">You receive</Text>
                      {t.receive.map((p) => (
                        <Text key={p.id} className="mt-1 text-[13px] font-medium tracking-tightish">{p.name} · {p.pos} {p.value}</Text>
                      ))}
                    </View>
                  </View>
                  <Text className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{t.why}</Text>
                  <Pressable
                    onPress={() => onSendTrade({ mgrId: t.mgrId, give: t.give.map((p) => p.id).filter((id) => MY_PLAYERS.some((m) => m.id === id)), receive: t.receive.map((p) => p.id) })}
                    className="mt-3 h-10 items-center justify-center rounded-full bg-foreground"
                  >
                    <Text className="text-[13px] font-semibold text-background">Send trade</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        </TeamSection>
      ) : (
        <Text className="px-2 text-[12px] text-muted-foreground">Choose positions above, then generate to see trade ideas.</Text>
      )}
      <View className="hidden">{c.background}</View>
    </View>
  );
}

function TradeBuilder({
  manager,
  title,
  subtitle,
  synced,
  platform,
  onBack,
  onSent,
  initialGive,
  initialReceive,
}: {
  manager?: { id: string; name: string; team: string };
  title: string;
  subtitle?: string;
  synced: boolean;
  platform?: string;
  onBack: () => void;
  onSent: (mgrId: string) => void;
  initialGive?: string[];
  initialReceive?: string[];
}) {
  const [give, setGive] = useState<string[]>(initialGive ?? []);
  const [receive, setReceive] = useState<string[]>(initialReceive ?? []);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    set((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const evaluation = evaluateTrade({ give, receive });
  const recColor = evaluation.recommendation === 'Accept' ? 'bg-success' : evaluation.recommendation === 'Counter' ? 'bg-warning' : 'bg-destructive';
  const activeMgrId = manager?.id ?? '';
  const activeMgr = manager ?? LEAGUE_MANAGERS.find((m) => m.id === activeMgrId);
  const theirPool = MANAGER_POOLS[activeMgrId] ?? THEIR_PLAYERS;
  const giveTotal = MY_PLAYERS.filter((p) => give.includes(p.id)).reduce((s, p) => s + p.value, 0);
  const recvTotal = theirPool.filter((p) => receive.includes(p.id)).reduce((s, p) => s + p.value, 0);
  const delta = recvTotal - giveTotal;
  const pitch =
    delta >= 4
      ? `This deal sends ${recvTotal} in value your way for ${giveTotal} — a clear win on paper.`
      : delta <= -4
        ? `You're paying ${Math.abs(delta)} in surplus value here. Worth it only if the fit unlocks your lineup.`
        : `Value is essentially even (${giveTotal} ↔ ${recvTotal}). The edge comes from positional fit.`;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => onSent(activeMgrId), 700);
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onBack}><Text className="text-[14px] font-semibold text-success">← Trade</Text></Pressable>
        <View className="items-center">
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle ?? (activeMgr ? `To ${activeMgr.name}` : 'Builder')}</Text>
          <Text className="text-[15px] font-semibold tracking-tightish">{title}</Text>
        </View>
        <View className="w-12" />
      </View>

      <View className="flex-row items-center gap-2 px-1">
        {[1, 2, 3].map((s) => (
          <View key={s} className="flex-1 flex-row items-center gap-2">
            <View className={cn('h-6 w-6 items-center justify-center rounded-full', step >= s ? 'bg-foreground' : 'bg-muted')}>
              <Text className={cn('text-[11px] font-semibold', step >= s ? 'text-background' : 'text-muted-foreground')}>{s}</Text>
            </View>
            <Text className={cn('text-[11px] font-semibold uppercase tracking-widest', step === s ? 'text-foreground' : 'text-muted-foreground')}>
              {s === 1 ? 'Give' : s === 2 ? 'Receive' : 'Summary'}
            </Text>
          </View>
        ))}
      </View>

      {step === 1 ? (
        <TeamSection title="Your roster" caption="Pick players to send">
          <Card>
            {MY_PLAYERS.map((p, i) => (
              <RosterPickRow key={p.id} name={p.name} pos={p.pos} value={p.value} selected={give.includes(p.id)} divided={i > 0} onPress={() => toggle(setGive, p.id)} />
            ))}
          </Card>
        </TeamSection>
      ) : null}

      {step === 2 && activeMgr ? (
        <TeamSection title={`${activeMgr.name}'s roster`} caption="Pick players you want back">
          <Card>
            {theirPool.map((p, i) => (
              <RosterPickRow key={p.id} name={p.name} pos={p.pos} value={p.value} selected={receive.includes(p.id)} divided={i > 0} onPress={() => toggle(setReceive, p.id)} />
            ))}
          </Card>
        </TeamSection>
      ) : null}

      {step === 3 ? (
        <>
          <TeamSection title="Trade summary">
            <Card>
              <View className="flex-row">
                <View className="flex-1 p-4">
                  <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">You give</Text>
                  <Text className="mt-1 text-[22px] font-semibold tabular-nums tracking-tighter2">{giveTotal}</Text>
                  {MY_PLAYERS.filter((p) => give.includes(p.id)).map((p) => (
                    <Text key={p.id} className="mt-1 text-[13px] font-medium tracking-tightish">{p.name} · {p.pos}</Text>
                  ))}
                  {give.length === 0 ? <Text className="mt-1 text-[12px] text-muted-foreground">None</Text> : null}
                </View>
                <View className="w-px bg-hairline" />
                <View className="flex-1 p-4">
                  <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">You receive</Text>
                  <Text className="mt-1 text-[22px] font-semibold tabular-nums tracking-tighter2">{recvTotal}</Text>
                  {theirPool.filter((p) => receive.includes(p.id)).map((p) => (
                    <Text key={p.id} className="mt-1 text-[13px] font-medium tracking-tightish">{p.name} · {p.pos}</Text>
                  ))}
                  {receive.length === 0 ? <Text className="mt-1 text-[12px] text-muted-foreground">None</Text> : null}
                </View>
              </View>
            </Card>
          </TeamSection>

          <TeamSection title="AI insights" caption="Pitch for both sides">
            <Card>
              <View className="p-5">
                <View className="flex-row items-center justify-between">
                  <View className={cn('rounded-full px-3 py-1', recColor)}>
                    <Text className="text-[12px] font-semibold text-background">{evaluation.recommendation}</Text>
                  </View>
                  <ConfidencePill confidence={evaluation.confidence} />
                </View>
                <Text className="mt-3 text-[14px] leading-relaxed">{pitch}</Text>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <EvalCell label="Net value" value={`${delta > 0 ? '+' : ''}${delta}`} />
                  <EvalCell label="Roster impact" value={evaluation.rosterImpact} />
                  <EvalCell label="Playoff impact" value={evaluation.playoffImpact} />
                  <EvalCell label="Fit grade" value={delta >= 4 ? 'A' : delta >= -3 ? 'B' : 'C'} />
                </View>
              </View>
            </Card>
          </TeamSection>
        </>
      ) : null}

      <View className="flex-row gap-2">
        <Pressable onPress={() => (step === 1 ? onBack() : setStep((s) => (s - 1) as 1 | 2 | 3))} className="h-11 flex-1 items-center justify-center rounded-full bg-foreground/5">
          <Text className="text-[13px] font-semibold">{step === 1 ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        {step < 3 ? (
          <Pressable
            onPress={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={step === 1 ? give.length === 0 : receive.length === 0}
            className={cn('h-11 flex-1 items-center justify-center rounded-full bg-foreground', (step === 1 ? give.length === 0 : receive.length === 0) ? 'opacity-50' : '')}
          >
            <Text className="text-[13px] font-semibold text-background">Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={sent || give.length === 0 || receive.length === 0}
            className={cn('h-11 flex-1 items-center justify-center rounded-full bg-foreground', sent || give.length === 0 || receive.length === 0 ? 'opacity-50' : '')}
          >
            <Text className="text-[13px] font-semibold text-background">{sent ? 'Sent ✓' : synced ? `Send via ${platform}` : 'Send proposal'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RosterPickRow({ name, pos, value, selected, divided, onPress }: { name: string; pos: string; value: number; selected: boolean; divided?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <View className={cn('flex-row items-center gap-3 px-5 py-3.5', divided ? 'border-t border-hairline' : '')}>
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
          <Text className="text-[11px] font-semibold tracking-wider text-muted-foreground">{pos}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{name}</Text>
          <Text className="text-[12px] text-muted-foreground">Value {value}</Text>
        </View>
        <View className={cn('h-7 min-w-[72px] items-center justify-center rounded-full px-2', selected ? 'bg-foreground' : 'bg-muted')}>
          <Text className={cn('text-[11px] font-semibold', selected ? 'text-background' : 'text-muted-foreground')}>{selected ? 'Selected' : 'Select'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EvalCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[48%] rounded-2xl bg-background p-3">
      <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-[13px] font-medium">{value}</Text>
    </View>
  );
}

function TradeIdeaCard({ idea, synced, platform }: { idea: TradeIdea; synced: boolean; platform?: string }) {
  return (
    <View className="rounded-[30px] bg-surface-elevated p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{idea.type}</Text>
        <Text className="text-[11px] text-muted-foreground">{idea.likelihood}% likely</Text>
      </View>
      <Text className="mt-1 text-[15px] font-semibold tracking-tightish">Target: {idea.target}</Text>
      <Text className="text-[12px] text-muted-foreground">Offer: {idea.offer}</Text>
      <Text className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{idea.reason}</Text>
      <Pressable className="mt-3 items-center rounded-full bg-foreground/5 py-2">
        <Text className="text-[12px] font-semibold">{synced ? `Build in ${platform}` : 'Propose trade'}</Text>
      </Pressable>
    </View>
  );
}

function PrivateChat({ manager, onBack, synced, platform }: { manager: { id: string; name: string; team: string }; onBack: () => void; synced: boolean; platform?: string }) {
  const c = useColors();
  type Msg = { from: 'me' | 'them'; text?: string; trade?: { give: string[]; receive: string[] } };
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'them', text: 'Hey, you looking to move Kelce?' },
    { from: 'me', text: 'Maybe — what do you have at RB?' },
    { from: 'them', text: 'Bigsby is available. Interested?' },
  ]);
  const [draft, setDraft] = useState('');
  const [building, setBuilding] = useState(false);

  if (building) {
    return (
      <TradeBuilder
        manager={manager}
        title="Send trade"
        subtitle={`To ${manager.name}`}
        synced={synced}
        platform={platform}
        onBack={() => setBuilding(false)}
        onSent={() => {
          setMessages((m) => [...m, { from: 'me', trade: { give: ['Travis Kelce'], receive: ['Tank Bigsby'] } }]);
          setBuilding(false);
        }}
      />
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onBack}><Text className="text-[14px] font-semibold text-success">← Trade</Text></Pressable>
        <View className="items-center">
          <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">Private</Text>
          <Text className="text-[15px] font-semibold tracking-tightish">{manager.name}</Text>
        </View>
        <View className="w-12" />
      </View>
      <Card>
        <View className="gap-3 p-5">
          {messages.map((m, i) => (
            <View key={i} className={cn('flex-row', m.from === 'me' ? 'justify-end' : 'justify-start')}>
              {m.trade ? (
                <View className={cn('max-w-[80%] rounded-2xl px-4 py-3', m.from === 'me' ? 'bg-foreground' : 'bg-muted')}>
                  <Text className={cn('text-[10px] uppercase tracking-widest', m.from === 'me' ? 'text-background/70' : 'text-muted-foreground')}>Trade proposal</Text>
                  <Text className={cn('mt-1 text-[13px] font-semibold', m.from === 'me' ? 'text-background' : 'text-foreground')}>You give: {m.trade.give.join(', ')}</Text>
                  <Text className={cn('text-[13px] font-semibold', m.from === 'me' ? 'text-background' : 'text-foreground')}>You get: {m.trade.receive.join(', ')}</Text>
                </View>
              ) : (
                <View className={cn('max-w-[75%] rounded-2xl px-4 py-2', m.from === 'me' ? 'bg-foreground' : 'bg-muted')}>
                  <Text className={cn('text-[14px]', m.from === 'me' ? 'text-background' : 'text-foreground')}>{m.text}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <View className="flex-row items-center gap-2 border-t border-hairline p-3">
          <Pressable onPress={() => setBuilding(true)} className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
            <Repeat size={16} color={c.foreground} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
            placeholderTextColor={c.mutedForeground}
            className="h-11 flex-1 rounded-full bg-muted px-4 text-[14px] text-foreground"
          />
          <Pressable
            onPress={() => {
              if (!draft.trim()) return;
              setMessages((m) => [...m, { from: 'me', text: draft }]);
              setDraft('');
            }}
            className="h-11 w-11 items-center justify-center rounded-full bg-foreground"
          >
            <Send size={16} color={c.background} />
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

// ====================== Waivers pane ======================
type Claim = { id: string; add: string; pos: string; team: string; drop: string; bid: number; priority: number };

function WaiversPane({ synced, platform, onPlayer }: { synced: boolean; platform?: string; onPlayer: (p: PlayerDetail) => void }) {
  const c = useColors();
  const [claims, setClaims] = useState<Claim[]>([
    { id: 'c1', add: 'Tank Bigsby', pos: 'RB', team: 'JAX', drop: 'M. Pittman', bid: 22, priority: 1 },
    { id: 'c2', add: 'Tyler Conklin', pos: 'TE', team: 'NYJ', drop: 'D. Goedert', bid: 8, priority: 2 },
    { id: 'c3', add: 'Rams DEF', pos: 'DEF', team: 'LAR', drop: 'Steelers DEF', bid: 3, priority: 3 },
  ]);
  const faabTotal = 100;
  const faabSpent = claims.reduce((s, claim) => s + claim.bid, 0);
  const faabRemaining = Math.max(0, faabTotal - faabSpent);
  const hosted = !synced;
  const adjustBid = (id: string, delta: number) => setClaims((cs) => cs.map((claim) => (claim.id === id ? { ...claim, bid: Math.max(0, claim.bid + delta) } : claim)));
  const removeClaim = (id: string) => setClaims((cs) => cs.filter((claim) => claim.id !== id));

  return (
    <View className="gap-5">
      <TeamSection title="FAAB budget">
        <Card>
          <View className="flex-row items-center justify-between px-6 py-5">
            <View>
              <Text className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Remaining</Text>
              <Text className="mt-1 text-[28px] font-semibold tracking-tighter2">${faabRemaining}</Text>
              <Text className="text-[12px] text-muted-foreground">of ${faabTotal} season budget</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-foreground">
              <Wallet size={20} color={c.background} />
            </View>
          </View>
          <View className="border-t border-hairline px-6 py-4">
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View className="h-full rounded-full bg-foreground" style={{ width: `${(faabSpent / faabTotal) * 100}%` }} />
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[12px] text-muted-foreground">Bids placed ${faabSpent}</Text>
              <Text className="text-[12px] text-muted-foreground">{claims.length} pending</Text>
            </View>
          </View>
        </Card>
      </TeamSection>

      <TeamSection title="Pending claims" caption={hosted ? 'Adjust or remove' : `Manage in ${platform}`}>
        <Card>
          {claims.length === 0 ? (
            <EmptyState icon={Wallet} title="No pending claims" sub="Add players from the pool below." />
          ) : (
            claims.map((claim, i) => (
              <View key={claim.id} className={cn('px-5 py-4', i > 0 ? 'border-t border-hairline' : '')}>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Text className="text-[12px] font-semibold">{claim.priority}</Text>
                  </View>
                  <Pressable onPress={() => onPlayer({ name: claim.add, pos: claim.pos, team: claim.team })} className="min-w-0 flex-1">
                    <Text className="text-[14px] tracking-tightish" numberOfLines={1}>Add <Text className="font-semibold">{claim.add}</Text></Text>
                    <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>Drop {claim.drop}</Text>
                  </Pressable>
                  {hosted ? (
                    <Pressable onPress={() => removeClaim(claim.id)} className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
                      <X size={16} color={c.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <View className="mt-3 flex-row items-center gap-2">
                  <Text className="text-[11px] uppercase tracking-widest text-muted-foreground">FAAB</Text>
                  {hosted ? (
                    <View className="flex-row items-center gap-2 rounded-full bg-muted px-1.5 py-1">
                      <Pressable onPress={() => adjustBid(claim.id, -1)} className="h-7 w-7 items-center justify-center rounded-full bg-background">
                        <Minus size={14} color={c.foreground} />
                      </Pressable>
                      <Text className="min-w-[40px] text-center text-[14px] font-semibold tabular-nums">${claim.bid}</Text>
                      <Pressable onPress={() => adjustBid(claim.id, 1)} className="h-7 w-7 items-center justify-center rounded-full bg-background">
                        <Plus size={14} color={c.foreground} />
                      </Pressable>
                    </View>
                  ) : (
                    <View className="rounded-full bg-foreground/5 px-3 py-1"><Text className="text-[12px] font-semibold">${claim.bid}</Text></View>
                  )}
                </View>
              </View>
            ))
          )}
        </Card>
      </TeamSection>

      <TeamSection title="Available players" caption="Free-agent pool">
        <Card>
          {AVAILABLE_PLAYERS.map((p, i) => (
            <View key={p.name} className={cn('flex-row items-center gap-3 px-5 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
              <Pressable onPress={() => onPlayer(p)} className="min-w-0 flex-1 flex-row items-center gap-3">
                <View className="h-9 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Text className="text-[11px] font-semibold tracking-wider text-muted-foreground">{p.pos}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{p.team} · {p.ownership} rostered</Text>
                </View>
                <Text className="w-12 text-right text-[15px] font-semibold tabular-nums tracking-tightish">{p.proj?.toFixed(1)}</Text>
              </Pressable>
              <Pressable
                onPress={() => setClaims((cs) => [...cs, { id: `c${Date.now()}`, add: p.name, pos: p.pos, team: p.team, drop: '—', bid: 1, priority: cs.length + 1 }])}
                className="h-9 w-9 items-center justify-center rounded-full bg-foreground"
              >
                <UserPlus size={16} color={c.background} />
              </Pressable>
            </View>
          ))}
        </Card>
      </TeamSection>

      <TeamSection title="AI top targets">
        <View className="gap-3">
          {waiverTargets.map((w) => (
            <WaiverCard key={w.id} target={w} synced={synced} platform={platform} />
          ))}
        </View>
      </TeamSection>
    </View>
  );
}

function WaiverCard({ target, synced, platform }: { target: WaiverTarget; synced: boolean; platform?: string }) {
  return (
    <View className="rounded-[30px] bg-surface-elevated p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-foreground/5">
          <Text className="text-[11px] font-semibold">{target.pos}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <ConfidencePill confidence={target.confidence} />
            <Text className="text-[11px] text-muted-foreground">{target.team}</Text>
          </View>
          <Text className="mt-1 text-[15px] font-semibold tracking-tightish">{target.add}</Text>
          <Text className="text-[12px] text-muted-foreground">Drop {target.drop} · {target.projectedImpact}</Text>
          <Text className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{target.reason}</Text>
        </View>
        <View className="items-end">
          <Text className="text-[18px] font-semibold tabular-nums">{target.opportunity}</Text>
          <Text className="text-[9px] uppercase tracking-widest text-muted-foreground">Opp</Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <View className="rounded-full bg-foreground/5 px-3 py-1.5"><Text className="text-[11px] font-semibold">FAAB ${target.faab}</Text></View>
        <Pressable className="flex-1 items-center rounded-full bg-foreground py-2">
          <Text className="text-[12px] font-semibold text-background">{synced ? `Open in ${platform}` : 'Add Waiver Claim'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ====================== Player profile sheet ======================
const PROFILE_GAME_LOG = [
  { wk: 1, opp: 'vs NYJ', pts: 18.4 },
  { wk: 2, opp: '@ MIN', pts: 12.1 },
  { wk: 3, opp: 'vs LAR', pts: 24.6 },
  { wk: 4, opp: '@ ARI', pts: 16.2 },
  { wk: 5, opp: 'vs SEA', pts: 29.1 },
  { wk: 6, opp: '@ KC', pts: 14.8 },
  { wk: 7, opp: 'vs DAL', pts: 21.3 },
];

type ProfileTab = 'overview' | 'performance' | 'health' | 'community';

function PlayerSheet({
  player,
  onClose,
  synced,
  platform,
  canDrop,
  onRequestDrop,
}: {
  player: PlayerDetail | null;
  onClose: () => void;
  synced: boolean;
  platform?: string;
  canDrop?: boolean;
  onRequestDrop?: (p: PlayerDetail) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ProfileTab>('overview');
  if (!player) return null;
  return (
    <Modal visible={!!player} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-muted">
            <X size={16} color={c.foreground} />
          </Pressable>
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Player profile</Text>
          <View className="h-9 w-9" />
        </View>
        <View className="flex-1 px-5">
          <View className="rounded-[28px] bg-surface-elevated p-5">
            <View className="flex-row items-start gap-3">
              <AvatarImage src={playerAvatar(player.name + player.team)} name={player.name} className="h-14 w-14" />
              <View className="min-w-0 flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {player.pos} · {player.team}{player.rank ? ` · ${player.rank}` : ''}
                </Text>
                <Text className="text-[22px] font-semibold tracking-tighter2" numberOfLines={1}>{player.name}</Text>
                {player.opp ? <Text className="mt-0.5 text-[12px] text-muted-foreground">{player.opp}</Text> : null}
              </View>
              <View className="items-end">
                <Text className="text-[24px] font-semibold tabular-nums">{player.proj?.toFixed(1) ?? '—'}</Text>
                <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">proj</Text>
              </View>
            </View>

            {player.status === 'q' ? (
              <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-warning/15 px-3 py-2">
                <AlertTriangle size={14} color={c.warning} />
                <Text className="text-[12px] font-medium">Questionable</Text>
                {player.note ? <Text className="text-[12px] text-muted-foreground">· {player.note}</Text> : null}
              </View>
            ) : null}
            {player.status === 'o' ? (
              <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-danger/15 px-3 py-2">
                <AlertTriangle size={14} color={c.danger} />
                <Text className="text-[12px] font-medium text-danger">Out</Text>
              </View>
            ) : null}

            <View className="mt-4 flex-row gap-2">
              <Pressable className="h-11 flex-1 items-center justify-center rounded-full bg-background">
                <Text className="text-[13px] font-semibold">Compare</Text>
              </Pressable>
              <Pressable className="h-11 flex-1 items-center justify-center rounded-full bg-foreground">
                <Text className="text-[13px] font-semibold text-background">{synced ? `Open in ${platform}` : 'Edit lineup'}</Text>
              </Pressable>
            </View>
            {canDrop ? (
              <Pressable onPress={() => onRequestDrop?.(player)} className="mt-2 h-11 w-full flex-row items-center justify-center gap-1.5 rounded-full bg-destructive/10">
                <X size={16} color={c.destructive} />
                <Text className="text-[13px] font-semibold text-destructive">Drop player</Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-4">
            <Segmented tabs={(['overview', 'performance', 'health', 'community'] as ProfileTab[]).map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1) }))} value={tab} onChange={setTab} />
          </View>

          <View className="mt-4 flex-1">
            {tab === 'overview' ? <ProfileOverview player={player} /> : null}
            {tab === 'performance' ? <ProfilePerformance /> : null}
            {tab === 'health' ? <ProfileHealth player={player} /> : null}
            {tab === 'community' ? <ProfileCommunity player={player} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileOverview({ player }: { player: PlayerDetail }) {
  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <SheetStat label="Proj" value={player.proj?.toFixed(1) ?? '—'} />
        <SheetStat label="Avg" value={player.avg?.toFixed(1) ?? '—'} />
        <SheetStat label="Total" value={player.seasonPts?.toFixed(0) ?? '—'} />
        <SheetStat label="Value" value={player.value?.toString() ?? '—'} />
      </View>
      {player.ownership ? (
        <View className="flex-row items-center justify-between rounded-2xl bg-surface-elevated px-4 py-3">
          <Text className="text-[12px] text-muted-foreground">Rostered</Text>
          <Text className="text-[12px] font-semibold">{player.ownership}</Text>
        </View>
      ) : null}
      <View className="rounded-2xl bg-surface-elevated p-4">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fantasy outlook</Text>
        <Text className="mt-1 text-[13px] leading-snug tracking-tightish">
          High-floor producer with consistent volume regardless of game script. Schedule turns favorable through the playoff stretch.
        </Text>
      </View>
    </View>
  );
}

function ProfilePerformance() {
  const c = useColors();
  const log = PROFILE_GAME_LOG;
  const avg = log.reduce((s, g) => s + g.pts, 0) / log.length;
  const n = log.length;
  const sumX = log.reduce((s, g) => s + g.wk, 0);
  const sumY = log.reduce((s, g) => s + g.pts, 0);
  const sumXY = log.reduce((s, g) => s + g.wk * g.pts, 0);
  const sumXX = log.reduce((s, g) => s + g.wk * g.wk, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const W = 320, H = 160, padL = 28, padR = 12, padT = 12, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xs = log.map((g) => g.wk);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const yMax = Math.ceil(Math.max(...log.map((g) => g.pts), avg) / 5) * 5;
  const xFor = (wk: number) => padL + ((wk - minX) / Math.max(1, maxX - minX)) * innerW;
  const yFor = (pts: number) => padT + innerH - (pts / yMax) * innerH;
  const trendDir = slope >= 0 ? 'up' : 'down';
  const yTicks = [0, yMax / 2, yMax];

  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-surface-elevated p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Points per week</Text>
            <Text className="mt-0.5 text-[13px] tracking-tightish">
              Trend <Text className={trendDir === 'up' ? 'text-success' : 'text-danger'}>{trendDir === 'up' ? '▲' : '▼'} {Math.abs(slope).toFixed(2)} pts/wk</Text>
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[18px] font-semibold tabular-nums">{avg.toFixed(1)}</Text>
            <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">avg</Text>
          </View>
        </View>
        <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={176}>
          {yTicks.map((t) => (
            <SvgLine key={t} x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke={c.foreground} strokeOpacity={0.08} />
          ))}
          <SvgLine x1={padL} x2={W - padR} y1={yFor(avg)} y2={yFor(avg)} stroke={c.foreground} strokeOpacity={0.25} strokeDasharray="3 3" />
          {log.slice(1).map((g, i) => {
            const prev = log[i];
            const up = g.pts >= prev.pts;
            return (
              <SvgLine key={`seg-${g.wk}`} x1={xFor(prev.wk)} y1={yFor(prev.pts)} x2={xFor(g.wk)} y2={yFor(g.pts)} stroke={up ? c.success : c.danger} strokeWidth={2} strokeLinecap="round" />
            );
          })}
          {log.map((g, i) => {
            const prev = i > 0 ? log[i - 1] : null;
            const fill = prev == null ? c.foreground : g.pts >= prev.pts ? c.success : c.danger;
            return (
              <Circle key={g.wk} cx={xFor(g.wk)} cy={yFor(g.pts)} r={4.5} fill={fill} />
            );
          })}
          {log.map((g) => (
            <SvgText key={`l-${g.wk}`} x={xFor(g.wk)} y={H - 6} textAnchor="middle" fill={c.mutedForeground} fontSize={9}>W{g.wk}</SvgText>
          ))}
        </Svg>
      </View>

      <View className="overflow-hidden rounded-2xl bg-surface-elevated">
        {log.map((g, i) => (
          <View key={g.wk} className={cn('flex-row items-center justify-between px-4 py-2.5', i > 0 ? 'border-t border-foreground/5' : '')}>
            <Text className="w-10 text-[13px] text-muted-foreground tabular-nums">W{g.wk}</Text>
            <Text className="flex-1 text-[13px] text-muted-foreground">{g.opp}</Text>
            <Text className="text-[13px] font-semibold tabular-nums">{g.pts.toFixed(1)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileHealth({ player }: { player: PlayerDetail }) {
  const injured = player.status === 'q' || player.status === 'o';
  return (
    <View className="gap-4">
      <View className="rounded-2xl bg-surface-elevated p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Fantasy doctor</Text>
            <Text className="mt-0.5 text-[15px] font-semibold tracking-tightish">{injured ? 'Monitor closely' : 'Cleared to play'}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[22px] font-semibold tabular-nums">{injured ? '72%' : '97%'}</Text>
            <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">to play</Text>
          </View>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <SheetStat label="Body part" value={injured ? 'Calf' : '—'} half />
          <SheetStat label="Severity" value={injured ? 'Mild' : 'None'} half />
          <SheetStat label="Practice" value={injured ? 'Limited' : 'Full'} half />
          <SheetStat label="Reinjury risk" value={injured ? 'Moderate' : 'Low'} half />
        </View>
      </View>
      {player.note ? (
        <View className="rounded-2xl bg-surface-elevated p-4">
          <Text className="text-[13px] leading-snug tracking-tightish">{player.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ProfileCommunity({ player }: { player: PlayerDetail }) {
  const c = useColors();
  return (
    <View className="rounded-2xl bg-surface-elevated p-4">
      <MessageCircle size={16} color={c.mutedForeground} />
      <Text className="mt-2 text-[13px] leading-snug tracking-tightish text-muted-foreground">
        Community discussion for {player.name} will appear here. Share takes, ask questions, and react.
      </Text>
    </View>
  );
}

function SheetStat({ label, value, half }: { label: string; value: string; half?: boolean }) {
  return (
    <View className={cn('items-center rounded-2xl bg-background px-3 py-2.5', half ? 'w-[48%]' : 'flex-1')}>
      <Text className="text-[18px] font-semibold tracking-tighter2 tabular-nums">{value}</Text>
      <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Text>
    </View>
  );
}

// ====================== Swap sheet ======================
function SwapSheet({
  open,
  slot,
  currentStarter,
  bench,
  onClose,
  onPick,
}: {
  open: boolean;
  slot: string;
  currentStarter: PlayerDetail | null;
  bench: (PlayerDetail & { trend: string })[];
  onClose: () => void;
  onPick: (benchIdx: number) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open && !!currentStarter} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-[28px] bg-background pt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="items-center pb-3"><View className="h-1.5 w-10 rounded-full bg-foreground/15" /></View>
          <View className="flex-row items-center justify-between px-5 pb-3">
            <View>
              <Text className="text-[10px] uppercase tracking-widest text-muted-foreground">Swap {slot}</Text>
              <Text className="text-[17px] font-semibold tracking-tighter2">{currentStarter?.name}</Text>
            </View>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-foreground/5">
              <X size={16} color={c.foreground} />
            </Pressable>
          </View>
          <View className="px-4 pb-4">
            <Text className="px-2 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Bench · eligible</Text>
            <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
              {bench.map((p, i) => {
                const eligible = slotEligible(slot, p.pos);
                return (
                  <Pressable key={p.name} disabled={!eligible} onPress={() => onPick(i)} className={cn(!eligible ? 'opacity-40' : '')}>
                    <View className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
                      <AvatarImage src={playerAvatar(p.name + p.team)} name={p.name} className="h-10 w-10" />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{p.name}</Text>
                        <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>{p.pos} · {p.team} · {eligible ? 'Eligible' : 'Not eligible'}</Text>
                      </View>
                      <Text className="w-12 text-right text-[15px] font-semibold tabular-nums">{p.proj?.toFixed(1)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ====================== Confirm drop ======================
function ConfirmDropDialog({ player, onCancel, onConfirm }: { player: PlayerDetail | null; onCancel: () => void; onConfirm: () => void }) {
  const c = useColors();
  return (
    <Modal visible={!!player} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 items-center justify-center bg-black/60 px-6">
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[360px] overflow-hidden rounded-[24px] bg-background">
          <View className="items-center gap-3 px-5 pb-4 pt-5">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle size={20} color={c.destructive} />
            </View>
            <Text className="text-[17px] font-semibold tracking-tighter2">Drop {player?.name}?</Text>
            <Text className="text-center text-[13px] leading-snug text-muted-foreground">
              They'll return to the free-agent pool. This roster spot will be empty until you add a replacement.
            </Text>
          </View>
          <View className="flex-row border-t border-hairline">
            <Pressable onPress={onCancel} className="h-12 flex-1 items-center justify-center">
              <Text className="text-[14px] font-semibold tracking-tightish">Cancel</Text>
            </Pressable>
            <View className="w-px bg-hairline" />
            <Pressable onPress={onConfirm} className="h-12 flex-1 items-center justify-center">
              <Text className="text-[14px] font-semibold tracking-tightish text-destructive">Drop</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
