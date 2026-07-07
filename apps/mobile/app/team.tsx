import { useState, type ReactNode, useMemo } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TextInput } from 'react-native';
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
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Card, Divider } from '@/components/ui/Card';
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
import { useMyTeamRoster, usePatchMyTeamRoster } from '@/lib/team-roster-api';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';

// ====================== Player data ======================
type LiveStatus = 'field' | 'redzone' | 'scored';
type PlayerDetail = {
  id?: string;
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
  imageUrl?: string;
  points?: number;
  slot?: string;
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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { active } = useLeague();
  const [tab, setTab] = useState<TabKey>('lineup');
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [confirmDrop, setConfirmDrop] = useState<PlayerDetail | null>(null);
  const isSynced = active?.type === 'synced';
  const isHosted = active?.type === 'hosted';
  const { data: rosterData, isLoading: rosterLoading, isError: rosterError } = useMyTeamRoster(
    active?.id,
    isSynced,
  );
  const patchRoster = usePatchMyTeamRoster(active?.id);

  if (!active) return null;

  const starterSlots = rosterData?.starterSlots?.length ? rosterData.starterSlots : STARTER_SLOTS;
  const starters = rosterData?.starters ?? [];
  const bench = rosterData?.bench ?? [];
  const ir = rosterData?.reserve ?? [];
  const teamName = rosterData?.teamName ?? active.teamName ?? `${active.shortName} Squad`;

  const onMyTeam = (p: PlayerDetail | null) =>
    !!p &&
    (starters.some((x) => x.id === p.id || x.name === p.name) ||
      bench.some((x) => x.id === p.id || x.name === p.name) ||
      ir.some((x) => x.id === p.id || x.name === p.name));

  const handleDrop = (p: PlayerDetail) => {
    if (!isHosted || !p.id) return;
    patchRoster.mutate({ action: 'drop', playerId: p.id });
    setConfirmDrop(null);
    setPlayer(null);
  };

  const swapStarter = (slotIdx: number, benchIdx: number) => {
    if (!isHosted) return;
    patchRoster.mutate({ action: 'swap', starterIndex: slotIdx, benchIndex: benchIdx });
  };

  return (
    <Screen>
      <View style={layout.screen}>
        <TeamHeader
          teamName={teamName}
          record={active.record}
          projectedFinish={`Proj #${Math.max(1, Math.min(active.members, active.rank || 3))}`}
          rank={`#${active.rank || '—'} of ${active.members}`}
          editable={isHosted}
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

        {rosterLoading && tab === 'lineup' ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator color={hex.primary} />
          </View>
        ) : null}

        {rosterError && tab === 'lineup' ? (
          <View style={[surfaces.roundedCard, { padding: 16, marginTop: 8 }]}>
            <Text variant="bodySm">
              Could not load your roster{isSynced ? ` from ${active.platform}` : ''}.
            </Text>
            {isSynced ? (
              <Text variant="bodyMuted" style={{ marginTop: 4 }}>
                Try refreshing sync from Commissioner → Settings.
              </Text>
            ) : null}
          </View>
        ) : null}

        {tab === 'lineup' && !rosterLoading ? (
          <>
            {!rosterLoading && starters.length === 0 && !rosterError ? (
              <View style={[surfaces.roundedCard, { padding: 16, marginTop: 8 }]}>
                <Text variant="bodySm">No players on your roster yet.</Text>
              </View>
            ) : null}
            {starters.length > 0 ? (
          <LineupPane
            isSynced={isSynced}
            editable={isHosted}
            showPoints={isSynced || isHosted}
            platform={active.platform}
            leagueId={active.id}
            onPlayer={setPlayer}
            starters={starters}
            bench={bench}
            starterSlots={starterSlots}
            onSwap={swapStarter}
          />
            ) : null}
          </>
        ) : null}
        {tab === 'health' ? (
          <HealthPane onPlayer={setPlayer} starters={starters} bench={bench} ir={ir} />
        ) : null}
        {tab === 'trade' ? <TradePane synced={isSynced} platform={active.platform} onPlayer={setPlayer} /> : null}
        {tab === 'waivers' ? <WaiversPane synced={isSynced} platform={active.platform} onPlayer={setPlayer} /> : null}
      </View>

      <PlayerSheet
        player={player}
        onClose={() => setPlayer(null)}
        synced={isSynced}
        platform={active.platform}
        canDrop={isHosted && onMyTeam(player)}
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const [name, setName] = useState(teamName);
  const [editing, setEditing] = useState(false);
  return (
    <View style={layout.intro}>
      {editing && editable ? (
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onBlur={() => setEditing(false)}
          style={S.heroInput}
        />
      ) : (
        <Text variant="hero" onPress={() => editable && setEditing(true)}>
          {name}
        </Text>
      )}
      <Text variant="subtitle" style={{ marginTop: 8 }}>
        {record} · {projectedFinish} · {rank}
      </Text>
    </View>
  );
}

function TeamSection({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={layout.sectionBlock}>
      <View style={layout.sectionHeader}>
        <Text variant="sectionTitle">{title}</Text>
        {caption ? <Text variant="caption">{caption}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function LiveDot({ status }: { status?: LiveStatus }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  if (!status) return null;
  const color =
    status === 'scored' ? hex.warning : status === 'redzone' ? hex.danger : hex.success;
  return <View style={[S.liveDot, { backgroundColor: color }]} />;
}

// ====================== Lineup pane ======================
function LineupPane({
  isSynced,
  editable,
  showPoints,
  platform,
  leagueId,
  onPlayer,
  starters,
  bench,
  starterSlots,
  onSwap,
}: {
  isSynced: boolean;
  editable: boolean;
  showPoints: boolean;
  platform?: string;
  leagueId: string;
  onPlayer: (p: PlayerDetail) => void;
  starters: PlayerDetail[];
  bench: (PlayerDetail & { trend: string })[];
  starterSlots: string[];
  onSwap: (slotIdx: number, benchIdx: number) => void;
}) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { active } = useLeague();
  const starterProj = starters.reduce((s, r) => s + (r.proj ?? r.points ?? 0), 0);
  const coaching = teamCoaching(active!);
  const [editing, setEditing] = useState(false);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);
  void leagueId;

  return (
    <View style={layout.section}>
      <TeamSection title="Weekly matchup">
        <Card>
          <View style={layout.row}>
            <Side label="You" score="118.4" proj="126.2" remaining="5 to play" />
            <View style={S.vDivider} />
            <Side label="Steel Curtain" score="104.1" proj="112.4" remaining="6 to play" />
          </View>
          <Divider />
          <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
            <View style={[layout.rowBetween, { marginBottom: 8 }]}>
              <Text variant="eyebrow">Win probability</Text>
              <Text variant="bodySm" style={{ color: hex.success }}>72%</Text>
            </View>
            <View style={S.progressTrackLg}>
              <View style={[S.progressFill, { width: '72%', backgroundColor: hex.success }]} />
            </View>
          </View>
        </Card>
      </TeamSection>

      <TeamSection
        title="Starting lineup"
        caption={isSynced ? `Recommended · ${platform}` : editing ? 'Tap a slot to swap' : 'Tap Edit to swap starters'}
      >
        <Card>
          <View style={[layout.rowBetween, { paddingHorizontal: 24, paddingVertical: 20 }]}>
            <View>
              <Text variant="eyebrow">Projected</Text>
              <Text variant="scoreLG" style={{ marginTop: 4 }}>{starterProj.toFixed(1)}</Text>
            </View>
            <View style={[layout.row, { gap: 8 }]}>
              <View style={surfaces.pillSuccess}>
                <Text variant="captionSuccess">72% win</Text>
              </View>
              {editable ? (
                <Pressable
                  onPress={() => setEditing((v) => !v)}
                  style={[S.editPill, editing ? S.editPillActive : S.editPillIdle]}
                >
                  <Text variant="caption" style={{ color: editing ? hex.background : hex.foreground }}>
                    {editing ? 'Done' : 'Edit'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Divider />
          <View>
            {starters.map((r, i) => (
              <PlayerRow
                key={(r.id ?? r.name) + (starterSlots[i] ?? i)}
                slot={starterSlots[i] ?? r.slot ?? r.pos}
                player={r}
                divided={i > 0}
                editing={editing}
                onPress={() => (editing ? setSwapSlot(i) : onPlayer(r))}
                showPoints={showPoints}
              />
            ))}
          </View>
          {isSynced ? <PlatformAction label={`Set lineup in ${platform}`} sub="Changes apply on platform" /> : null}
        </Card>
      </TeamSection>

      <TeamSection title="Bench">
        <Card>
          {bench.map((p, i) => (
            <BenchRow key={p.id ?? p.name} player={p} divided={i > 0} onPress={() => onPlayer(p)} showPoints={showPoints} />
          ))}
        </Card>
      </TeamSection>

      <SwapSheet
        open={swapSlot !== null}
        slot={swapSlot !== null ? starterSlots[swapSlot] ?? '' : ''}
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
    </View>
  );
}

function Side({ label, score, proj, remaining }: { label: string; score: string; proj: string; remaining: string }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={S.matchSide}>
      <Text variant="eyebrow">{label}</Text>
      <Text variant="scoreLG" style={{ marginTop: 4 }}>{score}</Text>
      <Text variant="bodyMuted" style={{ marginTop: 4 }}>Proj {proj}</Text>
      <Text variant="bodyMuted">{remaining}</Text>
    </View>
  );
}

function PlatformAction({ label, sub }: { label: string; sub: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <View>
      <Divider />
      <View style={layout.cardFooter}>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="body">{label}</Text>
          <Text variant="bodyMuted">{sub}</Text>
        </View>
        <ArrowUpRight size={20} color={c.mutedForeground} />
      </View>
    </View>
  );
}

function PlayerRow({
  slot,
  player,
  divided,
  editing,
  onPress,
  showPoints,
}: {
  slot: string;
  player: PlayerDetail;
  divided?: boolean;
  editing?: boolean;
  onPress?: () => void;
  showPoints?: boolean;
}) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      {divided ? <Divider /> : null}
      <View style={layout.listRow}>
        <View style={S.slotBadge}>
          <Text variant="caption">{slot}</Text>
        </View>
        <View style={S.avatarWrap}>
          <AvatarImage
            src={playerAvatar({ playerId: player.id, name: player.name, team: player.team, imageUrl: player.imageUrl })}
            name={player.name}
            size={36}
          />
          {player.live ? (
            <View style={S.liveDotBadge}>
              <LiveDot status={player.live} />
            </View>
          ) : null}
        </View>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="body" numberOfLines={1}>{player.name}</Text>
          <Text variant="bodyMuted" numberOfLines={1}>
            {player.liveNote ?? `${player.pos} · ${player.team} · ${player.opp}`}
          </Text>
        </View>
        {player.status === 'q' ? (
          <View style={[S.statusPill, { backgroundColor: toneBg.warning }]}>
            <Text variant="caption">Q</Text>
          </View>
        ) : null}
        {player.status === 'o' ? (
          <View style={[S.statusPill, { backgroundColor: toneBg.danger }]}>
            <Text variant="caption" style={{ color: toneFg.danger }}>Out</Text>
          </View>
        ) : null}
        <Text variant="body" style={S.scoreCol}>
          {showPoints
            ? player.points != null
              ? player.points.toFixed(1)
              : '—'
            : player.proj != null
              ? player.proj.toFixed(1)
              : '—'}
        </Text>
        {editing ? <Repeat size={16} color={c.foreground} /> : <ChevronRight size={16} color={c.mutedForeground} />}
      </View>
    </Pressable>
  );
}

function BenchRow({
  player,
  divided,
  onPress,
  showPoints,
}: {
  player: PlayerDetail & { trend: string };
  divided?: boolean;
  onPress?: () => void;
  showPoints?: boolean;
}) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const TrendIcon = player.trend === 'up' ? TrendingUp : player.trend === 'down' ? TrendingDown : Activity;
  const trendColor = player.trend === 'up' ? c.success : player.trend === 'down' ? c.danger : c.mutedForeground;
  return (
    <Pressable onPress={onPress}>
      {divided ? <Divider /> : null}
      <View style={layout.listRow}>
        <View style={S.slotBadge}>
          <Text variant="caption">BN</Text>
        </View>
        <View style={S.avatarWrap}>
          <AvatarImage
            src={playerAvatar({ playerId: player.id, name: player.name, team: player.team, imageUrl: player.imageUrl })}
            name={player.name}
            size={36}
          />
          {player.live ? (
            <View style={S.liveDotBadge}>
              <LiveDot status={player.live} />
            </View>
          ) : null}
        </View>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="body" numberOfLines={1}>{player.name}</Text>
          <Text variant="bodyMuted" numberOfLines={1}>{player.pos} · {player.team} · {player.opp}</Text>
        </View>
        <TrendIcon size={16} color={trendColor} />
        {player.status === 'q' ? (
          <View style={[S.statusPill, { backgroundColor: toneBg.warning }]}>
            <Text variant="caption">Q</Text>
          </View>
        ) : null}
        <Text variant="body" style={S.scoreCol}>
          {showPoints
            ? player.points != null
              ? player.points.toFixed(1)
              : '—'
            : player.proj != null
              ? player.proj.toFixed(1)
              : '—'}
        </Text>
      </View>
    </Pressable>
  );
}

// ====================== Health pane ======================
function HealthPane({
  onPlayer,
  starters,
  bench,
  ir,
}: {
  onPlayer: (p: PlayerDetail) => void;
  starters: PlayerDetail[];
  bench: (PlayerDetail & { trend: string })[];
  ir: PlayerDetail[];
}) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const injured = [...starters, ...bench].filter((p) => p.status === 'q' || p.status === 'o');
  const healthy = [...starters, ...bench].filter((p) => !p.status || p.status === 'ok').length;
  const questionable = [...starters, ...bench].filter((p) => p.status === 'q').length;
  const out = [...starters, ...bench].filter((p) => p.status === 'o').length;
  return (
    <View style={layout.section}>
      <TeamSection title="Roster health">
        <Card>
          <View style={layout.healthRow}>
            <Tile value={String(healthy)} label="Healthy" tone="success" first />
            <Tile value={String(questionable)} label="Quest." tone="warning" />
            <Tile value={String(out)} label="Out" tone="danger" />
            <Tile value={String(ir.length)} label="IR" tone="muted" />
          </View>
          <Divider />
          <View style={layout.cardFooter}>
            <View>
              <Text variant="bodySm">Health score</Text>
              <Text variant="bodyMuted">Above league average</Text>
            </View>
            <Text variant="statValue" style={{ color: hex.success }}>82</Text>
          </View>
        </Card>
      </TeamSection>

      <TeamSection title="Injured players" caption={`${injured.length} flagged`}>
        <Card>
          {injured.map((p, i) => (
            <Pressable key={p.name} onPress={() => onPlayer(p)}>
              {i > 0 ? <Divider /> : null}
              <View style={[layout.listRow, { alignItems: 'flex-start' }]}>
                <View style={[surfaces.iconBox, { backgroundColor: toneBg.warning }]}>
                  <AlertTriangle size={16} color={c.warning} />
                </View>
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="body" numberOfLines={1}>{p.name}</Text>
                  <Text variant="bodyMuted" numberOfLines={1}>
                    {p.pos} · {p.team} · {p.status === 'o' ? 'Out' : 'Questionable'}
                  </Text>
                  {p.note ? <Text variant="bodyMuted" style={{ marginTop: 4 }}>{p.note}</Text> : null}
                </View>
                <ChevronRight size={16} color={c.mutedForeground} />
              </View>
            </Pressable>
          ))}
        </Card>
      </TeamSection>

      <TeamSection title="Injured reserve">
        <Card>
          {ir.length === 0 ? (
            <EmptyState icon={HeartPulse} title="No one on IR" sub="A healthy roster is a happy roster." />
          ) : (
            ir.map((p, i) => (
              <Pressable key={p.name} onPress={() => onPlayer(p)}>
                {i > 0 ? <Divider /> : null}
                <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                  <View style={layout.row}>
                    <View style={[S.slotBadge, { height: 36, borderRadius: 12 }]}>
                      <Text variant="caption">IR</Text>
                    </View>
                    <View style={[layout.flex1, { minWidth: 0, marginLeft: 12 }]}>
                      <Text variant="body" numberOfLines={1}>{p.name}</Text>
                      <Text variant="bodyMuted" numberOfLines={1}>{p.pos} · {p.team}</Text>
                    </View>
                    <ChevronRight size={16} color={c.mutedForeground} />
                  </View>
                  {p.note ? <Text variant="bodySm" style={{ marginTop: 12, color: hex.mutedForeground }}>{p.note}</Text> : null}
                </View>
              </Pressable>
            ))
          )}
        </Card>
      </TeamSection>

      <TeamSection title="Team analytics">
        <Card>
          <View style={[layout.rowWrap, layout.cardPad]}>
            {[
              ['Snap reliability', '91%'],
              ['Injury risk', 'Low'],
              ['Avg games missed', '0.4'],
              ['Bye-week pain', 'Wk 10'],
              ['Depth score', 'B+'],
              ['Backup readiness', 'High'],
            ].map(([l, v]) => (
              <View key={l} style={layout.half}>
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
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const fgTone = tone === 'muted' ? 'neutral' : tone;
  return (
    <View style={first ? layout.healthCell : layout.healthCellBorder}>
      <Text variant="scoreLG" style={{ color: toneFg[fgTone] }}>{value}</Text>
      <Text variant="eyebrow" style={{ marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="eyebrow">{label}</Text>
      <Text variant="titleLg" style={{ marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon: IconComp, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 40 }}>
      <View style={[surfaces.iconBox, { backgroundColor: hex.muted }]}>
        <IconComp size={20} color={c.mutedForeground} />
      </View>
      <Text variant="body">{title}</Text>
      <Text variant="bodyMuted">{sub}</Text>
    </View>
  );
}

// ====================== Trade pane ======================
type TradeMode = 'hub' | 'pickManager' | 'machine';
type Prefill = { mgrId: string; give: string[]; receive: string[] } | null;

function TradePane({ synced, platform, onPlayer }: { synced: boolean; platform?: string; onPlayer: (p: PlayerDetail) => void }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
      <View style={layout.sectionBlock}>
        <View style={S.navBar}>
          <Pressable onPress={() => setMode('hub')}><Text variant="bodySm" style={{ color: hex.success }}>← Trade</Text></Pressable>
          <Text variant="body">Send a trade</Text>
          <View style={S.navSpacer} />
        </View>
        <Card>
          {LEAGUE_MANAGERS.map((m, i) => (
            <View key={m.id}>
              {i > 0 ? <Divider /> : null}
              <View style={layout.listRow}>
                <AvatarImage src={personAvatar(m.id + m.name)} name={m.name} size={40} />
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="body" numberOfLines={1}>{m.name}</Text>
                  <Text variant="bodyMuted" numberOfLines={1}>{m.team}</Text>
                </View>
                <Pressable onPress={() => setChatWith(m.id)} style={S.iconCircle}>
                  <MessageCircle size={16} color={c.foreground} />
                </Pressable>
                <Pressable onPress={() => setProposeTo(m.id)} style={S.proposeBtn}>
                  <Text variant="caption" style={{ color: hex.background }}>Propose</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </View>
    );
  }

  return (
    <View style={layout.section}>
      <View style={[layout.row, { gap: 12 }]}>
        <Pressable onPress={() => setMode('pickManager')} style={S.tradeTile}>
          <View style={S.tradeTileIcon}>
            <Send size={20} color={c.background} />
          </View>
          <Text variant="titleMd" style={{ marginTop: 16 }}>Send a trade</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4 }}>Pick a manager, chat privately, or build a proposal.</Text>
        </Pressable>
        <Pressable onPress={() => setMode('machine')} style={S.tradeTile}>
          <View style={S.tradeTileIcon}>
            <Repeat size={20} color={c.background} />
          </View>
          <Text variant="titleMd" style={{ marginTop: 16 }}>Mock trade machine</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4 }}>Explore needs, generate trades, send when one fits.</Text>
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
                {i > 0 ? <Divider /> : null}
                <View style={layout.listRow}>
                  <View style={[S.slotBadge, { height: 36, borderRadius: 12 }]}>
                    <Text variant="caption">{p.pos}</Text>
                  </View>
                  <View style={[layout.flex1, { minWidth: 0 }]}>
                    <Text variant="body" numberOfLines={1}>{p.name}</Text>
                    <Text variant="bodyMuted" numberOfLines={1}>{p.team}</Text>
                  </View>
                  <TrendIcon size={16} color={trendColor} />
                  <Text variant="body" style={S.scoreCol}>{p.value}</Text>
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
    <View style={layout.sectionBlock}>
      <View style={S.navBar}>
        <Pressable onPress={onBack}><Text variant="bodySm" style={{ color: hex.success }}>← Trade</Text></Pressable>
        <Text variant="body">Mock trade machine</Text>
        <View style={S.navSpacer} />
      </View>

      <TeamSection title="Your roster" caption="Tap to include in mock">
        <Card>
          <View style={[layout.healthRow, { paddingHorizontal: 4, paddingVertical: 12 }]}>
            {(['QB', 'RB', 'WR', 'TE'] as Need[]).map((pos, i) => (
              <View key={pos} style={i > 0 ? layout.healthCellBorder : layout.healthCell}>
                <Text variant="caption">{pos}</Text>
                <Text variant="body" style={{ marginTop: 2 }}>{byPos[pos] ?? 0}</Text>
              </View>
            ))}
          </View>
          <Divider />
          {MY_PLAYERS.map((p, i) => {
            const picked = include.includes(p.id);
            return (
              <Pressable key={p.id} onPress={() => toggleInclude(p.id)}>
                {i > 0 ? <Divider /> : null}
                <View style={layout.listRow}>
                  <View style={[surfaces.iconBox, { backgroundColor: hex.muted }]}>
                    <Text variant="caption">{p.pos}</Text>
                  </View>
                  <View style={[layout.flex1, { minWidth: 0 }]}>
                    <Text variant="body" numberOfLines={1}>{p.name}</Text>
                    <Text variant="bodyMuted">Value {p.value}</Text>
                  </View>
                  <View style={[S.selectPill, picked ? S.selectPillOn : S.selectPillOff]}>
                    <Text variant="caption" style={{ color: picked ? hex.background : hex.mutedForeground }}>
                      {picked ? 'Included' : 'Include'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Card>
      </TeamSection>

      <TeamSection title="Trade builder" caption="Tag positions to shape the trade">
        <Card>
          <View style={{ gap: 16, padding: 20 }}>
            <View>
              <Text variant="eyebrow" style={{ marginBottom: 8 }}>Position tags</Text>
              <View style={[layout.row, { gap: 8 }]}>
                {(['QB', 'RB', 'WR', 'TE'] as Need[]).map((n) => {
                  const on = needs.includes(n);
                  return (
                    <Pressable key={n} onPress={() => toggleNeed(n)} style={[S.needTag, on ? S.needTagOn : S.needTagOff]}>
                      <Text variant="body" style={{ color: on ? hex.background : hex.foreground }}>{n}</Text>
                      <Text variant="caption" style={{ color: on ? 'rgba(252,252,252,0.7)' : hex.mutedForeground }}>
                        {on ? 'Targeted' : 'Tap'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable onPress={generate} style={S.generateBtn}>
              <Text variant="button" style={{ color: hex.background }}>{generated.length ? 'Mock again' : 'Generate'}</Text>
            </Pressable>
          </View>
        </Card>
      </TeamSection>

      {generated.length > 0 ? (
        <TeamSection title="Generated trades" caption={`Round ${seed}`}>
          <View style={layout.stackSm}>
            {generated.map((t) => (
              <Card key={t.id}>
                <View style={{ padding: 16 }}>
                  <View style={layout.row}>
                    <AvatarImage src={personAvatar(t.mgrId + t.mgrName)} name={t.mgrName} size={36} />
                    <View style={[layout.flex1, { minWidth: 0, marginLeft: 12 }]}>
                      <Text variant="bodySm" numberOfLines={1}>{t.mgrName}</Text>
                      <Text variant="bodyMuted" numberOfLines={1}>{t.team}</Text>
                    </View>
                    <View
                      style={[
                        S.gradeBadge,
                        { backgroundColor: t.grade === 'A' ? hex.success : t.grade === 'B' ? hex.warning : hex.danger },
                      ]}
                    >
                      <Text variant="bodySm" style={{ color: hex.background, fontWeight: '700' }}>{t.grade}</Text>
                    </View>
                  </View>
                  <View style={[layout.row, { gap: 8, marginTop: 12 }]}>
                    <View style={S.tradeCol}>
                      <Text variant="caption">You give</Text>
                      {t.give.map((p) => (
                        <Text key={p.id} variant="bodySm" style={{ marginTop: 4 }}>{p.name} · {p.pos} {p.value}</Text>
                      ))}
                    </View>
                    <View style={S.tradeCol}>
                      <Text variant="caption">You receive</Text>
                      {t.receive.map((p) => (
                        <Text key={p.id} variant="bodySm" style={{ marginTop: 4 }}>{p.name} · {p.pos} {p.value}</Text>
                      ))}
                    </View>
                  </View>
                  <Text variant="bodySm" style={{ marginTop: 12, color: hex.mutedForeground }}>{t.why}</Text>
                  <Pressable
                    onPress={() => onSendTrade({ mgrId: t.mgrId, give: t.give.map((p) => p.id).filter((id) => MY_PLAYERS.some((m) => m.id === id)), receive: t.receive.map((p) => p.id) })}
                    style={S.sendBtn}
                  >
                    <Text variant="button" style={{ color: hex.background }}>Send trade</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        </TeamSection>
      ) : (
        <Text variant="bodyMuted" style={{ paddingHorizontal: 8 }}>Choose positions above, then generate to see trade ideas.</Text>
      )}
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const [give, setGive] = useState<string[]>(initialGive ?? []);
  const [receive, setReceive] = useState<string[]>(initialReceive ?? []);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    set((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const evaluation = evaluateTrade({ give, receive });
  const recBg =
    evaluation.recommendation === 'Accept'
      ? hex.success
      : evaluation.recommendation === 'Counter'
        ? hex.warning
        : hex.danger;
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
    <View style={layout.sectionBlock}>
      <View style={S.navBar}>
        <Pressable onPress={onBack}><Text variant="bodySm" style={{ color: hex.success }}>← Trade</Text></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="caption">{subtitle ?? (activeMgr ? `To ${activeMgr.name}` : 'Builder')}</Text>
          <Text variant="body">{title}</Text>
        </View>
        <View style={S.navSpacer} />
      </View>

      <View style={[layout.row, { gap: 8, paddingHorizontal: 4 }]}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[layout.row, layout.flex1, { gap: 8 }]}>
            <View style={[S.stepDot, step >= s ? S.stepDotActive : S.stepDotIdle]}>
              <Text variant="caption" style={{ color: step >= s ? hex.background : hex.mutedForeground }}>{s}</Text>
            </View>
            <Text variant="caption" style={{ color: step === s ? hex.foreground : hex.mutedForeground }}>
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
              <View style={layout.row}>
                <View style={[layout.flex1, { padding: 16 }]}>
                  <Text variant="caption">You give</Text>
                  <Text variant="statValue" style={{ marginTop: 4 }}>{giveTotal}</Text>
                  {MY_PLAYERS.filter((p) => give.includes(p.id)).map((p) => (
                    <Text key={p.id} variant="bodySm" style={{ marginTop: 4 }}>{p.name} · {p.pos}</Text>
                  ))}
                  {give.length === 0 ? <Text variant="bodyMuted" style={{ marginTop: 4 }}>None</Text> : null}
                </View>
                <View style={S.vDivider} />
                <View style={[layout.flex1, { padding: 16 }]}>
                  <Text variant="caption">You receive</Text>
                  <Text variant="statValue" style={{ marginTop: 4 }}>{recvTotal}</Text>
                  {theirPool.filter((p) => receive.includes(p.id)).map((p) => (
                    <Text key={p.id} variant="bodySm" style={{ marginTop: 4 }}>{p.name} · {p.pos}</Text>
                  ))}
                  {receive.length === 0 ? <Text variant="bodyMuted" style={{ marginTop: 4 }}>None</Text> : null}
                </View>
              </View>
            </Card>
          </TeamSection>

          <TeamSection title="AI insights" caption="Pitch for both sides">
            <Card>
              <View style={{ padding: 20 }}>
                <View style={layout.rowBetween}>
                  <View style={[S.statusPill, { backgroundColor: recBg, paddingHorizontal: 12, paddingVertical: 4 }]}>
                    <Text variant="bodySm" style={{ color: hex.background }}>{evaluation.recommendation}</Text>
                  </View>
                  <ConfidencePill confidence={evaluation.confidence} />
                </View>
                <Text variant="bodySm" style={{ marginTop: 12 }}>{pitch}</Text>
                <View style={[layout.rowWrap, { gap: 8, marginTop: 16 }]}>
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

      <View style={S.actionRow}>
        <Pressable onPress={() => (step === 1 ? onBack() : setStep((s) => (s - 1) as 1 | 2 | 3))} style={[S.actionBtn, S.actionBtnSecondary]}>
          <Text variant="button">{step === 1 ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        {step < 3 ? (
          <Pressable
            onPress={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={step === 1 ? give.length === 0 : receive.length === 0}
            style={[S.actionBtn, S.actionBtnPrimary, (step === 1 ? give.length === 0 : receive.length === 0) ? S.actionBtnDisabled : null]}
          >
            <Text variant="button" style={{ color: hex.background }}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={sent || give.length === 0 || receive.length === 0}
            style={[S.actionBtn, S.actionBtnPrimary, sent || give.length === 0 || receive.length === 0 ? S.actionBtnDisabled : null]}
          >
            <Text variant="button" style={{ color: hex.background }}>{sent ? 'Sent ✓' : synced ? `Send via ${platform}` : 'Send proposal'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RosterPickRow({ name, pos, value, selected, divided, onPress }: { name: string; pos: string; value: number; selected: boolean; divided?: boolean; onPress: () => void }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <Pressable onPress={onPress}>
      {divided ? <Divider /> : null}
      <View style={layout.listRow}>
        <View style={[surfaces.iconBox, { backgroundColor: hex.muted }]}>
          <Text variant="caption">{pos}</Text>
        </View>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="body" numberOfLines={1}>{name}</Text>
          <Text variant="bodyMuted">Value {value}</Text>
        </View>
        <View style={[S.selectPill, selected ? S.selectPillOn : S.selectPillOff, { minWidth: 72 }]}>
          <Text variant="caption" style={{ color: selected ? hex.background : hex.mutedForeground }}>
            {selected ? 'Selected' : 'Select'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EvalCell({ label, value }: { label: string; value: string }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={S.evalCell}>
      <Text variant="caption">{label}</Text>
      <Text variant="bodySm" style={{ marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function TradeIdeaCard({ idea, synced, platform }: { idea: TradeIdea; synced: boolean; platform?: string }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={S.ideaCard}>
      <View style={layout.rowBetween}>
        <Text variant="caption">{idea.type}</Text>
        <Text variant="caption">{idea.likelihood}% likely</Text>
      </View>
      <Text variant="body" style={{ marginTop: 4 }}>Target: {idea.target}</Text>
      <Text variant="bodyMuted">Offer: {idea.offer}</Text>
      <Text variant="bodyMuted" style={{ marginTop: 8 }}>{idea.reason}</Text>
      <Pressable style={[S.editPillIdle, { marginTop: 12, alignItems: 'center', paddingVertical: 8 }]}>
        <Text variant="caption">{synced ? `Build in ${platform}` : 'Propose trade'}</Text>
      </Pressable>
    </View>
  );
}

function PrivateChat({ manager, onBack, synced, platform }: { manager: { id: string; name: string; team: string }; onBack: () => void; synced: boolean; platform?: string }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
    <View style={layout.sectionBlock}>
      <View style={S.navBar}>
        <Pressable onPress={onBack}><Text variant="bodySm" style={{ color: hex.success }}>← Trade</Text></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text variant="caption">Private</Text>
          <Text variant="body">{manager.name}</Text>
        </View>
        <View style={S.navSpacer} />
      </View>
      <Card>
        <View style={{ gap: 12, padding: 20 }}>
          {messages.map((m, i) => (
            <View key={i} style={[layout.row, { justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }]}>
              {m.trade ? (
                <View style={[S.chatBubble, m.from === 'me' ? S.chatBubbleMe : S.chatBubbleThem, { maxWidth: '80%' }]}>
                  <Text variant="caption" style={{ color: m.from === 'me' ? 'rgba(252,252,252,0.7)' : hex.mutedForeground }}>Trade proposal</Text>
                  <Text variant="bodySm" style={{ marginTop: 4, color: m.from === 'me' ? hex.background : hex.foreground }}>
                    You give: {m.trade.give.join(', ')}
                  </Text>
                  <Text variant="bodySm" style={{ color: m.from === 'me' ? hex.background : hex.foreground }}>
                    You get: {m.trade.receive.join(', ')}
                  </Text>
                </View>
              ) : (
                <View style={[S.chatBubble, m.from === 'me' ? S.chatBubbleMe : S.chatBubbleThem, { maxWidth: '75%', paddingVertical: 8 }]}>
                  <Text variant="bodySm" style={{ color: m.from === 'me' ? hex.background : hex.foreground }}>{m.text}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <View style={S.chatInputRow}>
          <Pressable onPress={() => setBuilding(true)} style={[S.iconCircle, { width: 44, height: 44 }]}>
            <Repeat size={16} color={c.foreground} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message..."
            placeholderTextColor={c.mutedForeground}
            style={S.chatInput}
          />
          <Pressable
            onPress={() => {
              if (!draft.trim()) return;
              setMessages((m) => [...m, { from: 'me', text: draft }]);
              setDraft('');
            }}
            style={[S.primaryCircle, { width: 44, height: 44 }]}
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
    <View style={layout.section}>
      <TeamSection title="FAAB budget">
        <Card>
          <View style={[layout.rowBetween, { paddingHorizontal: 24, paddingVertical: 20 }]}>
            <View>
              <Text variant="eyebrow">Remaining</Text>
              <Text variant="scoreLG" style={{ marginTop: 4 }}>${faabRemaining}</Text>
              <Text variant="bodyMuted">of ${faabTotal} season budget</Text>
            </View>
            <View style={S.walletIcon}>
              <Wallet size={20} color={c.background} />
            </View>
          </View>
          <Divider />
          <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
            <View style={S.progressTrackLg}>
              <View style={[S.progressFill, { width: `${(faabSpent / faabTotal) * 100}%`, backgroundColor: hex.foreground }]} />
            </View>
            <View style={[layout.rowBetween, { marginTop: 8 }]}>
              <Text variant="bodyMuted">Bids placed ${faabSpent}</Text>
              <Text variant="bodyMuted">{claims.length} pending</Text>
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
              <View key={claim.id}>
                {i > 0 ? <Divider /> : null}
                <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                  <View style={layout.row}>
                    <View style={[S.iconCircle, { width: 36, height: 36 }]}>
                      <Text variant="bodySm">{claim.priority}</Text>
                    </View>
                    <Pressable onPress={() => onPlayer({ name: claim.add, pos: claim.pos, team: claim.team })} style={[layout.flex1, { minWidth: 0, marginLeft: 12 }]}>
                      <Text variant="bodySm" numberOfLines={1}>
                        Add <Text variant="bodySm">{claim.add}</Text>
                      </Text>
                      <Text variant="bodyMuted" numberOfLines={1}>Drop {claim.drop}</Text>
                    </Pressable>
                    {hosted ? (
                      <Pressable onPress={() => removeClaim(claim.id)} style={S.dangerIconBtn}>
                        <X size={16} color={c.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={[layout.row, { gap: 8, marginTop: 12 }]}>
                    <Text variant="eyebrow">FAAB</Text>
                    {hosted ? (
                      <View style={S.faabStepper}>
                        <Pressable onPress={() => adjustBid(claim.id, -1)} style={S.faabStepBtn}>
                          <Minus size={14} color={c.foreground} />
                        </Pressable>
                        <Text variant="bodySm" style={{ minWidth: 40, textAlign: 'center' }}>${claim.bid}</Text>
                        <Pressable onPress={() => adjustBid(claim.id, 1)} style={S.faabStepBtn}>
                          <Plus size={14} color={c.foreground} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={surfaces.pillMuted}><Text variant="bodySm">${claim.bid}</Text></View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>
      </TeamSection>

      <TeamSection title="Available players" caption="Free-agent pool">
        <Card>
          {AVAILABLE_PLAYERS.map((p, i) => (
            <View key={p.name}>
              {i > 0 ? <Divider /> : null}
              <View style={layout.listRow}>
                <Pressable onPress={() => onPlayer(p)} style={[layout.row, layout.flex1, { minWidth: 0 }]}>
                  <View style={[S.slotBadge, { height: 36, borderRadius: 12 }]}>
                    <Text variant="caption">{p.pos}</Text>
                  </View>
                  <View style={[layout.flex1, { minWidth: 0, marginLeft: 12 }]}>
                    <Text variant="body" numberOfLines={1}>{p.name}</Text>
                    <Text variant="bodyMuted" numberOfLines={1}>{p.team} · {p.ownership} rostered</Text>
                  </View>
                  <Text variant="body" style={S.scoreCol}>{p.proj?.toFixed(1)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setClaims((cs) => [...cs, { id: `c${Date.now()}`, add: p.name, pos: p.pos, team: p.team, drop: '—', bid: 1, priority: cs.length + 1 }])}
                  style={S.primaryCircle}
                >
                  <UserPlus size={16} color={c.background} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </TeamSection>

      <TeamSection title="AI top targets">
        <View style={layout.stackSm}>
          {waiverTargets.map((w) => (
            <WaiverCard key={w.id} target={w} synced={synced} platform={platform} />
          ))}
        </View>
      </TeamSection>
    </View>
  );
}

function WaiverCard({ target, synced, platform }: { target: WaiverTarget; synced: boolean; platform?: string }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  return (
    <View style={S.waiverCard}>
      <View style={layout.rowStart}>
        <View style={[surfaces.iconBox, { backgroundColor: `rgba(${ink},0.06)` }]}>
          <Text variant="caption">{target.pos}</Text>
        </View>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <View style={[layout.row, { gap: 8 }]}>
            <ConfidencePill confidence={target.confidence} />
            <Text variant="caption">{target.team}</Text>
          </View>
          <Text variant="body" style={{ marginTop: 4 }}>{target.add}</Text>
          <Text variant="bodyMuted">Drop {target.drop} · {target.projectedImpact}</Text>
          <Text variant="bodyMuted" style={{ marginTop: 8 }}>{target.reason}</Text>
        </View>
        <View style={layout.alignEnd}>
          <Text variant="titleLg">{target.opportunity}</Text>
          <Text variant="caption">Opp</Text>
        </View>
      </View>
      <View style={[layout.row, { gap: 8, marginTop: 12 }]}>
        <View style={surfaces.pillMuted}><Text variant="caption">FAAB ${target.faab}</Text></View>
        <Pressable style={[S.sendBtn, layout.flex1, { marginTop: 0, height: 36 }]}>
          <Text variant="caption" style={{ color: hex.background }}>{synced ? `Open in ${platform}` : 'Add Waiver Claim'}</Text>
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ProfileTab>('overview');
  if (!player) return null;
  return (
    <Modal visible={!!player} animationType="slide" onRequestClose={onClose}>
      <View style={[S.sheetRoot, { paddingTop: insets.top }]}>
        <View style={S.sheetHeader}>
          <Pressable onPress={onClose} style={S.iconCircleSm}>
            <X size={16} color={c.foreground} />
          </Pressable>
          <Text variant="eyebrow">Player profile</Text>
          <View style={{ width: 36, height: 36 }} />
        </View>
        <View style={S.sheetBody}>
          <View style={S.profileCard}>
            <View style={layout.rowStart}>
              <AvatarImage
                src={playerAvatar({ playerId: player.id, name: player.name, team: player.team, imageUrl: player.imageUrl })}
                name={player.name}
                size={56}
              />
              <View style={[layout.flex1, { minWidth: 0 }]}>
                <Text variant="eyebrow">
                  {player.pos} · {player.team}{player.rank ? ` · ${player.rank}` : ''}
                </Text>
                <Text variant="statValue" numberOfLines={1}>{player.name}</Text>
                {player.opp ? <Text variant="bodyMuted" style={{ marginTop: 2 }}>{player.opp}</Text> : null}
              </View>
              <View style={layout.alignEnd}>
                <Text variant="scoreLG">{player.proj?.toFixed(1) ?? '—'}</Text>
                <Text variant="caption">proj</Text>
              </View>
            </View>

            {player.status === 'q' ? (
              <View style={[layout.row, { gap: 8, marginTop: 12, borderRadius: 16, backgroundColor: toneBg.warning, paddingHorizontal: 12, paddingVertical: 8 }]}>
                <AlertTriangle size={14} color={c.warning} />
                <Text variant="bodyMuted">Questionable</Text>
                {player.note ? <Text variant="bodyMuted">· {player.note}</Text> : null}
              </View>
            ) : null}
            {player.status === 'o' ? (
              <View style={[layout.row, { gap: 8, marginTop: 12, borderRadius: 16, backgroundColor: toneBg.danger, paddingHorizontal: 12, paddingVertical: 8 }]}>
                <AlertTriangle size={14} color={c.danger} />
                <Text variant="bodyMuted" style={{ color: toneFg.danger }}>Out</Text>
              </View>
            ) : null}

            <View style={S.profileActions}>
              <Pressable style={[S.profileBtn, { backgroundColor: hex.background }]}>
                <Text variant="button">Compare</Text>
              </Pressable>
              <Pressable style={[S.profileBtn, { backgroundColor: hex.foreground }]}>
                <Text variant="button" style={{ color: hex.background }}>{synced ? `Open in ${platform}` : 'Edit lineup'}</Text>
              </Pressable>
            </View>
            {canDrop ? (
              <Pressable onPress={() => onRequestDrop?.(player)} style={S.dropBtn}>
                <X size={16} color={c.destructive} />
                <Text variant="button" style={{ color: c.destructive }}>Drop player</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ marginTop: 16 }}>
            <Segmented tabs={(['overview', 'performance', 'health', 'community'] as ProfileTab[]).map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1) }))} value={tab} onChange={setTab} />
          </View>

          <View style={[layout.fill, { marginTop: 16 }]}>
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={layout.sectionBlock}>
      <View style={[layout.row, { gap: 8 }]}>
        <SheetStat label="Proj" value={player.proj?.toFixed(1) ?? '—'} />
        <SheetStat label="Avg" value={player.avg?.toFixed(1) ?? '—'} />
        <SheetStat label="Total" value={player.seasonPts?.toFixed(0) ?? '—'} />
        <SheetStat label="Value" value={player.value?.toString() ?? '—'} />
      </View>
      {player.ownership ? (
        <View style={S.rosteredRow}>
          <Text variant="bodyMuted">Rostered</Text>
          <Text variant="bodySm">{player.ownership}</Text>
        </View>
      ) : null}
      <View style={S.outlookCard}>
        <Text variant="eyebrow">Fantasy outlook</Text>
        <Text variant="bodySm" style={{ marginTop: 4 }}>
          High-floor producer with consistent volume regardless of game script. Schedule turns favorable through the playoff stretch.
        </Text>
      </View>
    </View>
  );
}

function ProfilePerformance() {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
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
    <View style={layout.sectionBlock}>
      <View style={S.chartCard}>
        <View style={[layout.rowBetween, { marginBottom: 12 }]}>
          <View>
            <Text variant="eyebrow">Points per week</Text>
            <Text variant="bodySm" style={{ marginTop: 2 }}>
              Trend{' '}
              <Text variant="bodySm" style={{ color: trendDir === 'up' ? hex.success : hex.danger }}>
                {trendDir === 'up' ? '▲' : '▼'} {Math.abs(slope).toFixed(2)} pts/wk
              </Text>
            </Text>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="titleLg">{avg.toFixed(1)}</Text>
            <Text variant="caption">avg</Text>
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

      <View style={surfaces.roundedCard}>
        {log.map((g, i) => (
          <View key={g.wk}>
            {i > 0 ? <View style={S.logRowBorder} /> : null}
            <View style={S.logRow}>
              <Text variant="bodySm" style={{ width: 40, color: hex.mutedForeground }}>W{g.wk}</Text>
              <Text variant="bodySm" style={[layout.flex1, { color: hex.mutedForeground }]}>{g.opp}</Text>
              <Text variant="bodySm">{g.pts.toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileHealth({ player }: { player: PlayerDetail }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const injured = player.status === 'q' || player.status === 'o';
  return (
    <View style={layout.sectionBlock}>
      <View style={S.chartCard}>
        <View style={layout.rowBetween}>
          <View>
            <Text variant="eyebrow">Fantasy doctor</Text>
            <Text variant="body" style={{ marginTop: 2 }}>{injured ? 'Monitor closely' : 'Cleared to play'}</Text>
          </View>
          <View style={layout.alignEnd}>
            <Text variant="statValue">{injured ? '72%' : '97%'}</Text>
            <Text variant="caption">to play</Text>
          </View>
        </View>
        <View style={[layout.rowWrap, { gap: 8, marginTop: 12 }]}>
          <SheetStat label="Body part" value={injured ? 'Calf' : '—'} half />
          <SheetStat label="Severity" value={injured ? 'Mild' : 'None'} half />
          <SheetStat label="Practice" value={injured ? 'Limited' : 'Full'} half />
          <SheetStat label="Reinjury risk" value={injured ? 'Moderate' : 'Low'} half />
        </View>
      </View>
      {player.note ? (
        <View style={S.outlookCard}>
          <Text variant="bodySm">{player.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ProfileCommunity({ player }: { player: PlayerDetail }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <View style={S.outlookCard}>
      <MessageCircle size={16} color={c.mutedForeground} />
      <Text variant="bodySm" style={{ marginTop: 8, color: hex.mutedForeground }}>
        Community discussion for {player.name} will appear here. Share takes, ask questions, and react.
      </Text>
    </View>
  );
}

function SheetStat({ label, value, half }: { label: string; value: string; half?: boolean }) {
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={[S.sheetStat, half ? S.sheetStatHalf : S.sheetStatFlex]}>
      <Text variant="titleLg">{value}</Text>
      <Text variant="caption">{label}</Text>
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open && !!currentStarter} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[S.swapSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={S.swapHandle}>
            <View style={S.swapHandleBar} />
          </View>
          <View style={[layout.rowBetween, { paddingHorizontal: 20, paddingBottom: 12 }]}>
            <View>
              <Text variant="caption">Swap {slot}</Text>
              <Text variant="titleLg">{currentStarter?.name}</Text>
            </View>
            <Pressable onPress={onClose} style={S.iconCircleSm}>
              <X size={16} color={c.foreground} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text variant="eyebrow" style={{ paddingHorizontal: 8, paddingBottom: 8 }}>Bench · eligible</Text>
            <View style={surfaces.roundedCard}>
              {bench.map((p, i) => {
                const eligible = slotEligible(slot, p.pos);
                return (
                  <Pressable key={p.name} disabled={!eligible} onPress={() => onPick(i)} style={!eligible ? { opacity: 0.4 } : undefined}>
                    {i > 0 ? <Divider /> : null}
                    <View style={[layout.listRow, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                      <AvatarImage src={playerAvatar(p.name + p.team)} name={p.name} size={40} />
                      <View style={[layout.flex1, { minWidth: 0 }]}>
                        <Text variant="body" numberOfLines={1}>{p.name}</Text>
                        <Text variant="bodyMuted" numberOfLines={1}>{p.pos} · {p.team} · {eligible ? 'Eligible' : 'Not eligible'}</Text>
                      </View>
                      <Text variant="body" style={S.scoreCol}>{p.proj?.toFixed(1)}</Text>
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
  const S = useTeamStyles();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <Modal visible={!!player} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24 }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />
        <View style={S.confirmDialog}>
          <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 20 }}>
            <View style={S.confirmIcon}>
              <AlertTriangle size={20} color={c.destructive} />
            </View>
            <Text variant="titleLg">Drop {player?.name}?</Text>
            <Text variant="bodySm" style={{ textAlign: 'center', color: hex.mutedForeground }}>
              They'll return to the free-agent pool. This roster spot will be empty until you add a replacement.
            </Text>
          </View>
          <View style={layout.row}>
            <Pressable onPress={onCancel} style={[S.confirmAction, layout.flex1]}>
              <Text variant="bodySm">Cancel</Text>
            </Pressable>
            <View style={S.vDivider} />
            <Pressable onPress={onConfirm} style={[S.confirmAction, layout.flex1]}>
              <Text variant="bodySm" style={{ color: c.destructive }}>Drop</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function useTeamStyles() {
  const { hex, toneBg } = useThemeTokens();
  const { scheme } = useTheme();
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  return useMemo(() => StyleSheet.create({

  heroInput: {
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: hex.foreground,
  },
  matchSide: { flex: 1, paddingHorizontal: 24, paddingVertical: 20 },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: hex.hairline,
    alignSelf: 'stretch',
  },
  progressTrackLg: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 9999,
    backgroundColor: hex.muted,
  },
  progressFill: { height: '100%', borderRadius: 9999 },
  editPill: { borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 },
  editPillActive: { backgroundColor: hex.foreground },
  editPillIdle: { backgroundColor: `rgba(${ink},0.06)` },
  slotBadge: {
    height: 28,
    width: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: hex.muted,
  },
  avatarWrap: { position: 'relative' },
  liveDotBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 9999,
    backgroundColor: hex.background,
    padding: 2,
  },
  liveDot: { width: 10, height: 10, borderRadius: 9999 },
  scoreCol: { width: 48, textAlign: 'right' },
  statusPill: { borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navSpacer: { width: 48 },
  tradeTile: {
    flex: 1,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hex.hairline,
    backgroundColor: hex.surfaceElevated,
    padding: 20,
  },
  tradeTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hex.foreground,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.muted,
  },
  iconCircleSm: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.muted,
  },
  primaryCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.foreground,
  },
  proposeBtn: {
    borderRadius: 9999,
    backgroundColor: hex.foreground,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectPill: {
    height: 28,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    paddingHorizontal: 8,
  },
  selectPillOn: { backgroundColor: hex.foreground },
  selectPillOff: { backgroundColor: hex.muted },
  needTag: {
    height: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  needTagOn: { backgroundColor: hex.foreground },
  needTagOff: { backgroundColor: hex.muted },
  generateBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.foreground,
  },
  gradeBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  tradeCol: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: hex.muted,
    padding: 12,
  },
  sendBtn: {
    marginTop: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.foreground,
  },
  stepDot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  stepDotActive: { backgroundColor: hex.foreground },
  stepDotIdle: { backgroundColor: hex.muted },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    height: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  actionBtnSecondary: { backgroundColor: `rgba(${ink},0.06)` },
  actionBtnPrimary: { backgroundColor: hex.foreground },
  actionBtnDisabled: { opacity: 0.5 },
  evalCell: {
    width: '48%',
    borderRadius: 16,
    backgroundColor: hex.background,
    padding: 12,
  },
  ideaCard: {
    borderRadius: 30,
    backgroundColor: hex.surfaceElevated,
    padding: 16,
  },
  chatBubble: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  chatBubbleMe: { backgroundColor: hex.foreground },
  chatBubbleThem: { backgroundColor: hex.muted },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hex.hairline,
    padding: 12,
  },
  chatInput: {
    height: 44,
    flex: 1,
    borderRadius: 9999,
    backgroundColor: hex.muted,
    paddingHorizontal: 16,
    fontSize: 14,
    color: hex.foreground,
  },
  walletIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: hex.foreground,
  },
  faabStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    backgroundColor: hex.muted,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  faabStepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: hex.background,
  },
  dangerIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: toneBg.danger,
  },
  waiverCard: {
    borderRadius: 30,
    backgroundColor: hex.surfaceElevated,
    padding: 16,
  },
  sheetRoot: { flex: 1, backgroundColor: hex.background },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 16,
  },
  sheetBody: { flex: 1, paddingHorizontal: 20 },
  profileCard: {
    borderRadius: 28,
    backgroundColor: hex.surfaceElevated,
    padding: 20,
  },
  profileActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  profileBtn: {
    height: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  dropBtn: {
    marginTop: 8,
    height: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(238,55,52,0.1)',
  },
  rosteredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    backgroundColor: hex.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  outlookCard: {
    borderRadius: 16,
    backgroundColor: hex.surfaceElevated,
    padding: 16,
  },
  chartCard: {
    borderRadius: 16,
    backgroundColor: hex.surfaceElevated,
    padding: 16,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `rgba(${ink},0.05)`,
  },
  sheetStat: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: hex.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetStatHalf: { width: '48%' },
  sheetStatFlex: { flex: 1 },
  swapSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: hex.background,
    paddingTop: 8,
  },
  swapHandle: { alignItems: 'center', paddingBottom: 12 },
  swapHandleBar: {
    height: 6,
    width: 40,
    borderRadius: 9999,
    backgroundColor: `rgba(${ink},0.15)`,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: hex.background,
  },
  confirmIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: toneBg.danger,
  },
  confirmAction: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hex.hairline,
  },

  }), [hex, ink, toneBg]);
}
