import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CreditCard,
  Landmark,
  Lock,
  type LucideIcon,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Toggle } from '@/components/ui/Toggle';
import { AICard, AISection } from '@/components/ui/AICard';
import { useLeague, type League } from '@/lib/league-context';
import { treasuryInsights } from '@/lib/ai-intelligence';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

type PayState = 'paid' | 'pending' | 'overdue' | 'failed' | 'refunded' | 'unpaid';
type PayoutStructure = 'all' | 'top2' | 'top3' | 'top4' | 'custom';

interface Member {
  id: string;
  name: string;
  handle: string;
  status: PayState;
  paidOn?: string;
  method?: string;
  reminded?: number;
  isMe?: boolean;
  isCommish?: boolean;
}

const NAME_POOL: { name: string; handle: string }[] = [
  { name: 'Jackson Reed', handle: '@jackson' },
  { name: 'Mike Alvarez', handle: '@mike' },
  { name: 'Sarah Patel', handle: '@sarah' },
  { name: 'Devon Brooks', handle: '@dev' },
  { name: 'Priya Shah', handle: '@priya' },
  { name: 'Chris Nolan', handle: '@chris' },
  { name: 'Lena Park', handle: '@lena' },
  { name: 'Marcus Lee', handle: '@marcus' },
  { name: 'Eli Carter', handle: '@eli' },
  { name: 'Noah Singh', handle: '@noah' },
  { name: 'Taylor Quinn', handle: '@taylor' },
  { name: 'Riley Chen', handle: '@riley' },
  { name: 'Avery Diaz', handle: '@avery' },
  { name: 'Jordan Lee', handle: '@jordanl' },
];

function buildMembers(active: League): Member[] {
  const size = active.size ?? active.members ?? 12;
  const paid = active.paidCount ?? active.paid ?? size;
  const pending = active.pendingCount ?? 0;
  const unpaid = active.unpaidCount ?? Math.max(0, size - paid - pending);
  const list: Member[] = [];
  const myStatus: PayState = active.paymentStatus === 'unpaid' ? 'unpaid' : 'paid';
  list.push({
    id: 'me',
    name: 'Marc Jackson',
    handle: '@marcjackson',
    isMe: true,
    isCommish: active.role === 'commissioner',
    status: myStatus,
    paidOn: myStatus === 'paid' ? 'Aug 4' : undefined,
    method: myStatus === 'paid' ? 'Apple Pay' : undefined,
  });

  let paidLeft = paid - (myStatus === 'paid' ? 1 : 0);
  let pendingLeft = pending;
  let unpaidLeft = unpaid - (myStatus === 'unpaid' ? 1 : 0);
  let i = 0;
  const methods = ['Apple Pay', 'Card', 'ACH', 'Apple Pay', 'Card'];

  while (list.length < size && i < NAME_POOL.length) {
    const np = NAME_POOL[i++];
    let status: PayState = 'paid';
    let extras: Partial<Member> = { paidOn: `Aug ${4 + i}`, method: methods[i % methods.length] };
    if (paidLeft > 0) {
      status = 'paid';
      paidLeft--;
    } else if (pendingLeft > 0) {
      status = 'pending';
      extras = { reminded: 1 };
      pendingLeft--;
    } else if (unpaidLeft > 0) {
      const variants: PayState[] = ['overdue', 'failed', 'refunded', 'unpaid'];
      status = variants[unpaidLeft % variants.length];
      extras = { reminded: status === 'overdue' ? 2 : 1 };
      unpaidLeft--;
    } else {
      status = 'paid';
    }
    list.push({ id: np.handle, name: np.name, handle: np.handle, status, ...extras });
  }
  return list;
}

interface ActivityItem { id: string; title: string; when: string }
const ACTIVITY: ActivityItem[] = [
  { id: 'a1', title: 'Marcus paid league dues', when: '1d' },
  { id: 'a2', title: 'Reminder sent to Eli & Noah', when: '1d' },
  { id: 'a3', title: 'League is 8 of 10 funded', when: '2d' },
  { id: 'a4', title: 'Lena paid league dues', when: '3d' },
  { id: 'a5', title: 'Buy-in set to $100', when: '1w' },
];

type TreasuryView = { kind: 'home' } | { kind: 'pay'; memberId: string } | { kind: 'review' } | { kind: 'settings' };

export default function TreasuryPage() {
  const { active, updateLeague } = useLeague();
  const nav = useNav();
  const [view, setView] = useState<TreasuryView>({ kind: 'home' });
  const [members, setMembers] = useState<Member[]>(() => (active ? buildMembers(active) : []));
  const [localId, setLocalId] = useState<string | null>(active?.id ?? null);
  const [structure, setStructure] = useState<PayoutStructure>('top3');
  const [buyIn, setBuyIn] = useState<number>(active?.buyIn ?? 100);

  if (active && active.id !== localId) {
    setLocalId(active.id);
    setMembers(buildMembers(active));
    setBuyIn(active.buyIn ?? 100);
  }
  if (!active) return null;

  const totalDue = active.potTotal ?? buyIn * members.length;
  const collected = active.potCollected ?? members.filter((m) => m.status === 'paid').length * buyIn;
  const remaining = totalDue - collected;
  const fee = Math.round(collected * 0.029);
  const net = collected - fee;
  const fullyFunded = collected >= totalDue && totalDue > 0;

  const markPaid = (id: string) => setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'paid' as PayState, paidOn: 'Today', method: 'Apple Pay' } : m)));
  const sendReminder = (id: string) => setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, reminded: (m.reminded ?? 0) + 1 } : m)));
  const refund = (id: string) => setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'refunded' as PayState } : m)));

  const goBack = () => {
    if (view.kind !== 'home') setView({ kind: 'home' });
    else nav.back();
  };

  const title = view.kind === 'home' ? 'Treasury' : view.kind === 'pay' ? 'Payment' : view.kind === 'review' ? 'Payout Review' : 'Treasury Settings';

  return (
    <Screen>
      <View className="gap-5 px-4 pb-6 pt-3">
        <TreasuryBar title={title} onBack={goBack} backLabel={view.kind === 'home' ? 'Home' : 'Treasury'} />

        {view.kind === 'home' ? (
          <TreasuryHome
            active={active}
            members={members}
            buyIn={buyIn}
            collected={collected}
            remaining={remaining}
            totalDue={totalDue}
            fee={fee}
            net={net}
            fullyFunded={fullyFunded}
            structure={structure}
            onMarkPaid={markPaid}
            onRemind={sendReminder}
            onRefund={refund}
            onPay={(id) => setView({ kind: 'pay', memberId: id })}
            onReview={() => setView({ kind: 'review' })}
            onSettings={() => setView({ kind: 'settings' })}
          />
        ) : null}

        {view.kind === 'pay' ? (
          <PaymentPage
            member={members.find((m) => m.id === view.memberId)!}
            buyIn={buyIn}
            fee={Math.round(buyIn * 0.029)}
            onComplete={() => {
              markPaid(view.memberId);
              setView({ kind: 'home' });
            }}
          />
        ) : null}

        {view.kind === 'review' ? <PayoutReview active={active} collected={collected} fee={fee} net={net} structure={structure} members={members} /> : null}

        {view.kind === 'settings' && active.role === 'commissioner' ? (
          <TreasurySettings
            active={active}
            buyIn={buyIn}
            setBuyIn={(n) => {
              setBuyIn(n);
              updateLeague(active.id, { buyIn: n });
            }}
            structure={structure}
            setStructure={setStructure}
          />
        ) : null}
      </View>
    </Screen>
  );
}

/* ------------------------------ HOME ------------------------------ */
type PotTab = 'pot' | 'payout';

function TreasuryHome({
  active,
  members,
  buyIn,
  collected,
  remaining,
  totalDue,
  fee,
  net,
  fullyFunded,
  structure,
  onMarkPaid,
  onRemind,
  onRefund,
  onPay,
  onReview,
  onSettings,
}: {
  active: League;
  members: Member[];
  buyIn: number;
  collected: number;
  remaining: number;
  totalDue: number;
  fee: number;
  net: number;
  fullyFunded: boolean;
  structure: PayoutStructure;
  onMarkPaid: (id: string) => void;
  onRemind: (id: string) => void;
  onRefund: (id: string) => void;
  onPay: (id: string) => void;
  onReview: () => void;
  onSettings: () => void;
}) {
  const c = useColors();
  const [tab, setTab] = useState<PotTab>('pot');
  const paidCount = members.filter((m) => m.status === 'paid').length;
  const pct = totalDue ? collected / totalDue : 0;
  const splits = computeSplits(net, structure);
  const seasonComplete = active.stage === 'offseason';
  const isCommish = active.role === 'commissioner';

  return (
    <>
      <View className="rounded-[28px] border border-hairline bg-surface-elevated p-6">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{active.name} · Live pot</Text>
            <Text className="mt-1 text-[40px] font-semibold tracking-tighter2 tabular-nums">${collected.toLocaleString()}</Text>
            <Text className="mt-1 text-[13px] tabular-nums text-muted-foreground">of ${totalDue.toLocaleString()} · {paidCount} of {members.length} paid</Text>
          </View>
          {isCommish ? (
            <Pressable onPress={onSettings} className="h-9 w-9 items-center justify-center rounded-full border border-hairline bg-background">
              <Settings size={16} color={c.foreground} />
            </Pressable>
          ) : null}
        </View>
        <View className="mt-5 h-1.5 overflow-hidden rounded-full bg-background">
          <View className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, pct * 100)}%` }} />
        </View>
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <View className={cn('flex-row items-center gap-1 rounded-full px-2.5 py-1', fullyFunded ? 'bg-success/15' : 'border border-hairline bg-background')}>
            {fullyFunded ? <CheckCircle2 size={12} color={c.success} /> : <CircleDot size={12} color={c.mutedForeground} />}
            <Text className={cn('text-[11px] font-semibold uppercase tracking-widest', fullyFunded ? 'text-success' : 'text-muted-foreground')}>{fullyFunded ? 'Fully funded' : 'Collecting dues'}</Text>
          </View>
          <View className="rounded-full border border-hairline bg-background px-2.5 py-1">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Week {active.week || '—'}</Text>
          </View>
          <Text className="text-[11px] text-muted-foreground">{seasonComplete ? 'Season complete' : 'Updates weekly'}</Text>
        </View>
      </View>

      <View className="flex-row rounded-full border border-border bg-surface-elevated p-1">
        {[
          { key: 'pot' as const, label: 'League Pot' },
          { key: 'payout' as const, label: 'Payout Structure' },
        ].map((t) => {
          const isActive = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} className={cn('flex-1 rounded-full py-2', isActive ? 'bg-primary' : '')}>
              <Text className={cn('text-center text-[13px] font-semibold tracking-tightish', isActive ? 'text-primary-foreground' : 'text-muted-foreground')}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'pot' ? (
        <PotPane active={active} members={members} buyIn={buyIn} collected={collected} remaining={remaining} fee={fee} net={net} isCommish={isCommish} onMarkPaid={onMarkPaid} onRemind={onRemind} onRefund={onRefund} onPay={onPay} />
      ) : (
        <PayoutPane active={active} members={members} splits={splits} net={net} seasonComplete={seasonComplete} isCommish={isCommish} onReview={onReview} onSettings={onSettings} />
      )}

      <View className="flex-row items-start gap-2 px-2 pt-1">
        <Lock size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11px] leading-snug text-muted-foreground">Payments processed securely. Receipts and transaction history are saved to every member's profile.</Text>
      </View>
    </>
  );
}

function PotPane({
  active,
  members,
  buyIn,
  collected,
  remaining,
  fee,
  net,
  isCommish,
  onMarkPaid,
  onRemind,
  onRefund,
  onPay,
}: {
  active: League;
  members: Member[];
  buyIn: number;
  collected: number;
  remaining: number;
  fee: number;
  net: number;
  isCommish: boolean;
  onMarkPaid: (id: string) => void;
  onRemind: (id: string) => void;
  onRefund: (id: string) => void;
  onPay: (id: string) => void;
}) {
  return (
    <>
      <AISection title="Treasury insights" caption="AI-powered">
        {treasuryInsights(active).map((r) => (
          <AICard key={r.id} rec={r} />
        ))}
      </AISection>

      <Section title="Finances">
        <View className="flex-row flex-wrap gap-2">
          <Stat label="Collected" value={`$${collected.toLocaleString()}`} />
          <Stat label="Remaining" value={`$${remaining.toLocaleString()}`} accent={remaining > 0} />
          <Stat label="Platform fee" value={`-$${fee.toLocaleString()}`} sub="2.9%" />
          <Stat label="Net prize pool" value={`$${net.toLocaleString()}`} />
        </View>
      </Section>

      <Section title="Member payments">
        <View className="overflow-hidden rounded-[24px] border border-hairline bg-surface-elevated">
          {members.map((m, i) => (
            <MemberRow key={m.id} member={m} buyIn={buyIn} isCommish={isCommish} onMarkPaid={() => onMarkPaid(m.id)} onRemind={() => onRemind(m.id)} onRefund={() => onRefund(m.id)} onPay={() => onPay(m.id)} isFirst={i === 0} />
          ))}
        </View>
      </Section>

      <Section title="Recent activity">
        <View className="overflow-hidden rounded-[24px] border border-hairline bg-surface-elevated">
          {ACTIVITY.map((a, i) => (
            <View key={a.id} className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <View className="mt-1 h-2 w-2 shrink-0 rounded-full bg-success" />
              <Text className="min-w-0 flex-1 text-[14px] tracking-tightish">{a.title}</Text>
              <Text className="text-[11px] text-muted-foreground">{a.when}</Text>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

function PayoutPane({
  active,
  members,
  splits,
  net,
  seasonComplete,
  isCommish,
  onReview,
  onSettings,
}: {
  active: League;
  members: Member[];
  splits: { place: string; amount: number; pct: number }[];
  net: number;
  seasonComplete: boolean;
  isCommish: boolean;
  onReview: () => void;
  onSettings: () => void;
}) {
  const c = useColors();
  const ranked = useMemo(
    () => members.map((m, i) => ({ id: m.id, name: m.isMe ? (active.teamName ?? m.name) : m.name, isMe: !!m.isMe, seed: i })),
    [members, active.teamName],
  );

  return (
    <>
      <Section title={seasonComplete ? 'Final payouts' : 'Live payout projection'} action={<Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{seasonComplete ? 'Final' : 'Updates weekly'}</Text>}>
        <View className="overflow-hidden rounded-[24px] border border-hairline bg-surface-elevated">
          <View className="flex-row items-center justify-between border-b border-hairline px-4 py-3">
            <Text className="text-[12px] text-muted-foreground">Net prize pool</Text>
            <Text className="text-[15px] font-semibold tabular-nums">${net.toLocaleString()}</Text>
          </View>
          {splits.map((s, i) => {
            const m = ranked[i];
            return (
              <View key={s.place} className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
                <View className="h-9 w-9 items-center justify-center rounded-full border border-hairline bg-background">
                  <Text className="text-[13px] font-semibold tabular-nums">{i + 1}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold tracking-tightish" numberOfLines={1}>
                    {m?.name ?? `Place ${i + 1}`}
                    {m?.isMe ? <Text className="text-[11px] font-semibold text-muted-foreground"> You</Text> : null}
                  </Text>
                  <Text className="text-[12px] text-muted-foreground">{s.pct}% of pool · {s.place}</Text>
                </View>
                <Text className="text-[16px] font-semibold tabular-nums">${s.amount.toLocaleString()}</Text>
              </View>
            );
          })}
          <View className="flex-row items-start gap-2 border-t border-hairline px-4 py-3">
            <CircleDot size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-[11px] leading-snug text-muted-foreground">
              {seasonComplete ? 'Distributes automatically after commissioner review.' : 'Recalculates each week from live standings. Locks in and pays out when the season ends.'}
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Payout slots" action={isCommish ? <Pressable onPress={onSettings}><Text className="text-[12px] font-semibold tracking-tightish text-success">Edit</Text></Pressable> : undefined}>
        <View className="flex-row flex-wrap gap-2">
          {splits.map((s) => (
            <View key={s.place} className="w-[31%] rounded-[24px] border border-hairline bg-surface-elevated p-4">
              <View className="flex-row items-center justify-between">
                <Trophy size={16} color={c.mutedForeground} />
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.place}</Text>
              </View>
              <Text className="mt-3 text-[22px] font-semibold tracking-tighter2 tabular-nums">${s.amount.toLocaleString()}</Text>
              <Text className="text-[11px] text-muted-foreground">{s.pct}% of pool</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Payout status">
        <View className="rounded-[24px] border border-hairline bg-surface-elevated p-5">
          {seasonComplete || active.stage === 'playoffs' ? (
            <>
              <View className="flex-row items-center gap-2">
                <CheckCircle2 size={12} color={c.success} />
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{seasonComplete ? 'Season complete' : 'Playoffs in progress'}</Text>
              </View>
              <Text className="mt-2 text-[15px] tracking-tightish">
                {seasonComplete ? 'Final standings imported. Review payouts before they distribute automatically.' : 'Standings are firming up. Projected payouts will lock once the final week ends.'}
              </Text>
              {isCommish && seasonComplete ? (
                <Pressable onPress={onReview} className="mt-4 flex-row items-center gap-1.5 self-start rounded-full bg-foreground px-4 py-2">
                  <Text className="text-[13px] font-semibold text-background">Review payouts</Text>
                  <ChevronRight size={14} color={c.background} />
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-2">
                <CircleDot size={12} color={c.mutedForeground} />
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Waiting for season completion</Text>
              </View>
              <Text className="mt-2 text-[15px] tracking-tightish">Payouts distribute automatically after the final week of the playoffs. No action needed.</Text>
              <View className="mt-4 flex-row gap-2">
                {['Season', 'Review', 'Payout'].map((step, i) => (
                  <View key={step} className="flex-1 items-center rounded-[16px] border border-hairline bg-background py-2.5">
                    <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{step}</Text>
                    <Text className="mt-1 text-[12px] font-semibold tracking-tightish">{i === 0 ? 'In progress' : '—'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </Section>
    </>
  );
}

function MemberRow({
  member: m,
  buyIn,
  isCommish,
  isFirst,
  onMarkPaid,
  onRemind,
  onRefund,
  onPay,
}: {
  member: Member;
  buyIn: number;
  isCommish: boolean;
  isFirst: boolean;
  onMarkPaid: () => void;
  onRemind: () => void;
  onRefund: () => void;
  onPay: () => void;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View className={isFirst ? '' : 'border-t border-hairline'}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Avatar name={m.name} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[15px] font-medium tracking-tightish" numberOfLines={1}>{m.name}</Text>
              {m.isMe ? <Text className="text-[11px] font-semibold text-muted-foreground">You</Text> : null}
              {m.isCommish ? <View className="rounded-full bg-foreground/10 px-1.5 py-0.5"><Text className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Commish</Text></View> : null}
            </View>
            <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
              {m.status === 'paid'
                ? `${m.method ?? 'Paid'} · ${m.paidOn}`
                : m.status === 'overdue'
                  ? `Overdue · reminded ${m.reminded ?? 0}×`
                  : m.status === 'pending'
                    ? `Pending · reminded ${m.reminded ?? 0}×`
                    : m.status === 'refunded'
                      ? 'Refunded'
                      : 'Payment failed'}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <StatusPill status={m.status} amount={buyIn} />
            <ChevronRight size={16} color={c.mutedForeground} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
          </View>
        </View>
      </Pressable>

      {open ? (
        <View className="flex-row flex-wrap gap-2 border-t border-hairline px-4 py-3">
          {m.isMe && m.status !== 'paid' && m.status !== 'refunded' ? <ChipBtn primary onPress={onPay} icon={Wallet}>Pay ${buyIn}</ChipBtn> : null}
          {m.status === 'paid' ? <ChipBtn icon={Receipt}>View receipt</ChipBtn> : null}
          {isCommish && m.status !== 'paid' && m.status !== 'refunded' ? (
            <>
              <ChipBtn icon={Bell} onPress={onRemind}>Send reminder</ChipBtn>
              <ChipBtn icon={CheckCircle2} onPress={onMarkPaid}>Mark offline payment</ChipBtn>
            </>
          ) : null}
          {isCommish && m.status === 'paid' ? <ChipBtn icon={RefreshCw} onPress={onRefund}>Issue refund</ChipBtn> : null}
          <ChipBtn icon={Receipt}>Payment history</ChipBtn>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------ PAYMENT PAGE ------------------------------ */
function PaymentPage({ member, buyIn, fee, onComplete }: { member: Member; buyIn: number; fee: number; onComplete: () => void }) {
  const c = useColors();
  const [method, setMethod] = useState<'apple' | 'google' | 'card' | 'ach'>('apple');
  const [processing, setProcessing] = useState(false);

  const submit = () => {
    setProcessing(true);
    setTimeout(onComplete, 800);
  };

  return (
    <View className="gap-5">
      <View className="rounded-[28px] bg-foreground p-6">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-background/60">Pay league dues</Text>
        <Text className="mt-1 text-[14px] text-background/70">{member.name}</Text>
        <Text className="mt-4 text-[40px] font-semibold tracking-tighter2 tabular-nums text-background">${buyIn + fee}</Text>
        <Text className="mt-2 text-[12px] tabular-nums text-background/60">Buy-in ${buyIn} + processing ${fee}</Text>
      </View>

      <Section title="Payment method">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {[
            { id: 'apple' as const, label: 'Apple Pay', icon: CreditCard },
            { id: 'google' as const, label: 'Google Pay', icon: Wallet },
            { id: 'card' as const, label: 'Credit or debit card', icon: CreditCard },
            { id: 'ach' as const, label: 'Bank account (ACH)', icon: Landmark },
          ].map((opt, i) => {
            const Icon = opt.icon;
            const isActive = method === opt.id;
            return (
              <Pressable key={opt.id} onPress={() => setMethod(opt.id)}>
                <View className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
                    <Icon size={16} color={c.foreground} />
                  </View>
                  <Text className="flex-1 text-[15px] font-medium tracking-tightish">{opt.label}</Text>
                  <View className={cn('h-5 w-5 items-center justify-center rounded-full border-2', isActive ? 'border-foreground' : 'border-border')}>
                    {isActive ? <View className="h-2.5 w-2.5 rounded-full bg-foreground" /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Timeline">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {[
            { t: 'Now', what: 'Submit payment' },
            { t: 'Instant', what: 'Receipt issued and recorded' },
            { t: 'End of season', what: 'Auto payout if you place' },
          ].map((row, i) => (
            <View key={i} className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <Text className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{row.t}</Text>
              <Text className="flex-1 text-[13px] tracking-tightish">{row.what}</Text>
            </View>
          ))}
        </View>
      </Section>

      <View className="flex-row items-start gap-2 px-2">
        <ShieldCheck size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-[11px] leading-snug text-muted-foreground">Secured by Commissioner Payments. Your payment method is encrypted and stored only with your consent.</Text>
      </View>

      <Pressable onPress={submit} disabled={processing} className={cn('items-center rounded-full bg-foreground py-3.5', processing ? 'opacity-50' : '')}>
        <Text className="text-[15px] font-semibold tracking-tightish text-background">{processing ? 'Processing…' : `Pay $${buyIn + fee}`}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------ PAYOUT REVIEW ------------------------------ */
function PayoutReview({ active, collected, fee, net, structure, members }: { active: League; collected: number; fee: number; net: number; structure: PayoutStructure; members: Member[] }) {
  const c = useColors();
  const splits = computeSplits(net, structure);
  const podium = members.slice(0, splits.length);
  const [approved, setApproved] = useState(false);

  return (
    <View className="gap-5">
      <View className="rounded-[28px] bg-surface-elevated p-5">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{active.name} · Final standings</Text>
        <Text className="mt-1 text-[22px] font-semibold tracking-tighter2">Season complete</Text>
        <Text className="mt-1 text-[13px] tabular-nums text-muted-foreground">${collected.toLocaleString()} collected · ${fee.toLocaleString()} fee · ${net.toLocaleString()} net</Text>
      </View>

      <Section title="Recommended payouts">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {splits.map((s, i) => {
            const m = podium[i];
            return (
              <View key={s.place} className={cn('flex-row items-center gap-3 px-4 py-3.5', i > 0 ? 'border-t border-hairline' : '')}>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-background">
                  <Text className="text-[13px] font-semibold tabular-nums">{i + 1}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold tracking-tightish" numberOfLines={1}>{m?.name ?? `Place ${i + 1}`}</Text>
                  <Text className="text-[12px] text-muted-foreground">{s.pct}% of net pool</Text>
                </View>
                <Text className="text-[16px] font-semibold tabular-nums">${s.amount.toLocaleString()}</Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Review window">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          {[
            { t: 'Today', what: 'Recommendations generated', done: true },
            { t: '+3 days', what: 'Member review window', done: approved },
            { t: '+4 days', what: 'Auto distribution to bank or card', done: false },
          ].map((row, i) => (
            <View key={i} className={cn('flex-row items-start gap-3 px-4 py-3', i > 0 ? 'border-t border-hairline' : '')}>
              <Text className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{row.t}</Text>
              <Text className="flex-1 text-[13px] tracking-tightish">{row.what}</Text>
              {row.done ? <CheckCircle2 size={16} color={c.success} /> : null}
            </View>
          ))}
        </View>
      </Section>

      <Pressable onPress={() => setApproved(true)} disabled={approved} className={cn('items-center rounded-full py-3.5', approved ? 'bg-success' : 'bg-foreground')}>
        <Text className="text-[15px] font-semibold tracking-tightish text-background">{approved ? 'Approved · Distributing automatically' : 'Approve payouts'}</Text>
      </Pressable>

      <Text className="px-2 text-[11px] text-muted-foreground">Every payout is auditable. Members can view receipts and confirmations from their profile.</Text>
    </View>
  );
}

/* ------------------------------ SETTINGS ------------------------------ */
function TreasurySettings({
  active,
  buyIn,
  setBuyIn,
  structure,
  setStructure,
}: {
  active: League;
  buyIn: number;
  setBuyIn: (n: number) => void;
  structure: PayoutStructure;
  setStructure: (s: PayoutStructure) => void;
}) {
  const c = useColors();
  const [reminder, setReminder] = useState<'off' | 'weekly' | 'daily'>('weekly');
  const [autoPayout, setAutoPayout] = useState(true);
  const [offline, setOffline] = useState(true);

  return (
    <View className="gap-5">
      <Section title="Buy-in">
        <View className="flex-row gap-2">
          {[25, 50, 100, 200, 500].map((n) => (
            <Pressable key={n} onPress={() => setBuyIn(n)} className={cn('flex-1 items-center rounded-full px-2 py-2.5', buyIn === n ? 'bg-foreground' : 'bg-surface-elevated')}>
              <Text className={cn('text-[13px] font-semibold tabular-nums tracking-tightish', buyIn === n ? 'text-background' : 'text-muted-foreground')}>${n}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="px-2 text-[11px] text-muted-foreground">Each of {active.members ?? 10} members owes ${buyIn}.</Text>
      </Section>

      <Section title="Prize structure">
        <View className="gap-2">
          {([
            { id: 'all', label: 'Winner takes all' },
            { id: 'top2', label: 'Top two' },
            { id: 'top3', label: 'Top three' },
            { id: 'top4', label: 'Top four' },
            { id: 'custom', label: 'Custom' },
          ] as const).map((opt) => {
            const isActive = structure === opt.id;
            return (
              <Pressable key={opt.id} onPress={() => setStructure(opt.id)} className={cn('flex-row items-center justify-between rounded-[20px] px-4 py-3', isActive ? 'bg-foreground' : 'bg-surface-elevated')}>
                <Text className={cn('text-[14px] font-medium tracking-tightish', isActive ? 'text-background' : 'text-foreground')}>{opt.label}</Text>
                {isActive ? <CheckCircle2 size={16} color={c.background} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Reminders">
        <Text className="px-2 pb-2 text-[12px] text-muted-foreground">Reminder frequency</Text>
        <View className="flex-row rounded-full border border-border bg-surface-elevated p-1">
          {[
            { id: 'off', label: 'Off' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'daily', label: 'Daily' },
          ].map((o) => (
            <Pressable key={o.id} onPress={() => setReminder(o.id as typeof reminder)} className={cn('flex-1 rounded-full py-2', reminder === o.id ? 'bg-foreground' : '')}>
              <Text className={cn('text-center text-[13px] font-medium tracking-tightish', reminder === o.id ? 'text-background' : 'text-muted-foreground')}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Payouts">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          <ToggleRow label="Auto payout" sub="Distribute winnings after review window" value={autoPayout} onChange={setAutoPayout} />
          <ToggleRow label="Allow offline payments" sub="Mark members as paid outside Commissioner" value={offline} onChange={setOffline} divider />
        </View>
      </Section>

      <Section title="Deadlines">
        <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
          <ReadRow label="Payment deadline" value="Sep 1, 2026" />
          <ReadRow label="Payout timing" value="Within 24 hrs of approval" divider />
        </View>
      </Section>
    </View>
  );
}

/* ------------------------------ ATOMS ------------------------------ */
function TreasuryBar({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  const c = useColors();
  return (
    <View className="flex-row items-center justify-between px-1 pt-2">
      <Pressable onPress={onBack} className="flex-row items-center gap-1 rounded-full px-2 py-1.5">
        <ChevronLeft size={16} color={c.mutedForeground} />
        <Text className="text-[14px] text-muted-foreground">{backLabel}</Text>
      </Pressable>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</Text>
      <View className="w-12" />
    </View>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between px-2">
        <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <View className="w-[48%] rounded-[20px] bg-surface-elevated p-4">
      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className={cn('mt-1 text-[20px] font-semibold tabular-nums tracking-tighter2', accent ? 'text-warning' : '')}>{value}</Text>
      {sub ? <Text className="text-[11px] text-muted-foreground">{sub}</Text> : null}
    </View>
  );
}

function StatusPill({ status, amount }: { status: PayState; amount: number }) {
  const map: Record<PayState, { label: string; cls: string; text: string }> = {
    paid: { label: `Paid · $${amount}`, cls: 'bg-success/15', text: 'text-success' },
    pending: { label: 'Pending', cls: 'bg-foreground/10', text: 'text-foreground' },
    overdue: { label: 'Overdue', cls: 'bg-destructive/15', text: 'text-destructive' },
    failed: { label: 'Failed', cls: 'bg-destructive/15', text: 'text-destructive' },
    refunded: { label: 'Refunded', cls: 'bg-foreground/10', text: 'text-muted-foreground' },
    unpaid: { label: 'Unpaid', cls: 'bg-foreground/10', text: 'text-muted-foreground' },
  };
  const s = map[status];
  return (
    <View className={cn('rounded-full px-2.5 py-1', s.cls)}>
      <Text className={cn('text-[11px] font-semibold tracking-widest', s.text)}>{s.label}</Text>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background">
      <Text className="text-[12px] font-semibold tracking-tightish">{initials}</Text>
    </View>
  );
}

function ChipBtn({ children, onPress, icon: Icon, primary }: { children: ReactNode; onPress?: () => void; icon: LucideIcon; primary?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center gap-1.5 rounded-full px-3 py-1.5', primary ? 'bg-foreground' : 'bg-background')}>
      <Icon size={14} color={primary ? c.background : c.foreground} />
      <Text className={cn('text-[12px] font-semibold tracking-tightish', primary ? 'text-background' : 'text-foreground')}>{children}</Text>
    </Pressable>
  );
}

function ToggleRow({ label, sub, value, onChange, divider }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; divider?: boolean }) {
  return (
    <View className={cn('flex-row items-center gap-3 px-4 py-3.5', divider ? 'border-t border-hairline' : '')}>
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-medium tracking-tightish">{label}</Text>
        {sub ? <Text className="text-[12px] text-muted-foreground">{sub}</Text> : null}
      </View>
      <Toggle on={value} onChange={onChange} />
    </View>
  );
}

function ReadRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View className={cn('flex-row items-center justify-between px-4 py-3.5', divider ? 'border-t border-hairline' : '')}>
      <Text className="text-[13px] text-muted-foreground">{label}</Text>
      <Text className="text-[14px] font-medium tracking-tightish">{value}</Text>
    </View>
  );
}

/* ------------------------------ HELPERS ------------------------------ */
function computeSplits(net: number, structure: PayoutStructure): { place: string; amount: number; pct: number }[] {
  const places = ['1st', '2nd', '3rd', '4th'];
  let pcts: number[] = [];
  if (structure === 'all') pcts = [100];
  else if (structure === 'top2') pcts = [70, 30];
  else if (structure === 'top3') pcts = [70, 20, 10];
  else if (structure === 'top4') pcts = [60, 20, 12, 8];
  else pcts = [60, 25, 15];
  return pcts.map((p, i) => ({ place: places[i] ?? `${i + 1}th`, pct: p, amount: Math.round((net * p) / 100) }));
}
