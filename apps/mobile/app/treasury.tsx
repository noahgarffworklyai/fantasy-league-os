import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
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
import { useAuthStore } from '@/lib/auth-store';
import { startBuyInCheckout } from '@/lib/checkout';
import {
  executePayouts,
  fetchLeagueStandings,
  fetchTreasury,
  markMemberPaid,
  payoutTemplateToStructure,
  resetMemberPayment,
  structureToPayoutTemplate,
  updateTreasurySettings,
  type TreasuryData,
} from '@/lib/treasury-api';
import { useNav } from '@/lib/nav';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';

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

function formatPaidDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function mapTreasuryMembers(
  data: TreasuryData,
  currentUserId: string,
  isCommissioner: boolean,
  devMode?: boolean,
): Member[] {
  return data.members.map((m) => ({
    id: m.userId,
    name: m.displayName,
    handle: `@${m.displayName.split(/\s+/)[0]?.toLowerCase() ?? 'member'}`,
    status: m.paid ? ('paid' as PayState) : ('unpaid' as PayState),
    paidOn: formatPaidDate(m.paidAt),
    method: m.paid ? (devMode ? 'Dev mode' : 'Card') : undefined,
    isMe: m.userId === currentUserId,
    isCommish: m.userId === currentUserId && isCommissioner,
  }));
}

interface ActivityItem { id: string; title: string; when: string }

function formatActivityWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type TreasuryView = { kind: 'home' } | { kind: 'pay'; memberId: string } | { kind: 'review' } | { kind: 'settings' };

export default function TreasuryPage() {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { active, refreshLeagues } = useLeague();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const nav = useNav();
  const [view, setView] = useState<TreasuryView>({ kind: 'home' });
  const [structure, setStructure] = useState<PayoutStructure>('top3');
  const [buyIn, setBuyIn] = useState<number>(active?.buyIn ?? 100);
  const [savingSettings, setSavingSettings] = useState(false);

  const {
    data: treasury,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['treasury', active?.id],
    queryFn: () => fetchTreasury(active!.id),
    enabled: !!active?.id,
  });

  const members = useMemo(() => {
    if (!treasury || !currentUserId) return [];
    return mapTreasuryMembers(treasury, currentUserId, active?.role === 'commissioner', treasury.paymentsDevMode);
  }, [treasury, currentUserId, active?.role]);

  const activity = useMemo<ActivityItem[]>(() => {
    if (!treasury?.ledgerActivity?.length) return [];
    return treasury.ledgerActivity.map((a) => ({
      id: a.id,
      title: a.title,
      when: formatActivityWhen(a.when),
    }));
  }, [treasury?.ledgerActivity]);

  if (!active) return null;

  const buyInUsd = treasury ? treasury.buyInCents / 100 : buyIn;
  const platformFeeUsd = treasury ? treasury.platformFeeCents / 100 : Math.round(buyInUsd * 0.05);
  const collected = treasury ? treasury.potCents / 100 : 0;
  const totalDue = treasury ? buyInUsd * treasury.totalMemberCount : buyInUsd * (active.size ?? active.members ?? 12);
  const remaining = Math.max(0, totalDue - collected);
  const fee = treasury ? (treasury.platformFeeCents * treasury.paidMemberCount) / 100 : 0;
  const net = collected - fee;
  const fullyFunded = collected >= totalDue && totalDue > 0;
  const payoutStructure = treasury ? payoutTemplateToStructure(treasury.payoutTemplate) : structure;
  const paymentsDevMode = treasury?.paymentsDevMode ?? false;
  const payoutsExecuted = treasury?.ledgerActivity?.some((a) => a.type === 'payout') ?? false;

  const markPaid = async (userId: string) => {
    if (active.role !== 'commissioner') return;
    try {
      await markMemberPaid(active.id, userId);
      await refetch();
      await refreshLeagues();
    } catch (e) {
      Alert.alert('Could not mark paid', e instanceof Error ? e.message : 'Try again.');
    }
  };
  const sendReminder = (_id: string) =>
    Alert.alert('Reminder sent', 'Push notifications for reminders are coming soon.');
  const refund = (_id: string) =>
    Alert.alert('Refunds', 'Stripe refunds will be available when live payments are enabled.');

  const resetPayment = async (userId: string) => {
    try {
      await resetMemberPayment(active.id, userId);
      await refetch();
      await refreshLeagues();
    } catch (e) {
      Alert.alert('Could not reset', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const handlePay = async () => {
    if (view.kind !== 'pay') return;
    const member = members.find((m) => m.id === view.memberId);
    if (!member?.isMe) return;

    if (buyInUsd <= 0) {
      Alert.alert(
        'Set a buy-in first',
        'Commissioner → Treasury Settings → pick a buy-in amount, then try paying again.',
      );
      return;
    }

    try {
      const result = await startBuyInCheckout(active.id);
      if (!result.ok) {
        if (result.reason !== 'cancelled') {
          Alert.alert('Payment failed', 'Your payment could not be completed. Try again.');
        }
        return;
      }
      await refetch();
      await refreshLeagues();
      setView({ kind: 'home' });
      Alert.alert(
        result.devMode ? 'Payment recorded (dev mode)' : 'Payment complete',
        result.devMode
          ? 'No real money was charged. Your buy-in was recorded for testing.'
          : 'Your buy-in was recorded. A receipt is saved to your profile.',
      );
    } catch (e) {
      Alert.alert(
        'Payment failed',
        e instanceof Error ? e.message : 'Something went wrong. Check your connection and try again.',
      );
    }
  };

  const goBack = () => {
    if (view.kind !== 'home') setView({ kind: 'home' });
    else nav.back();
  };

  const title = view.kind === 'home' ? 'Treasury' : view.kind === 'pay' ? 'Payment' : view.kind === 'review' ? 'Payout Review' : 'Treasury Settings';

  if (isLoading && !treasury) {
    return (
      <Screen>
        <View style={[layout.screen, layout.centered]}>
          <ActivityIndicator color={hex.primary} />
          <Text variant="bodyMuted" style={{ marginTop: 12 }}>
            Loading treasury…
          </Text>
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={[layout.screen, layout.centered, { paddingHorizontal: 24 }]}>
          <Text variant="body">Could not load treasury.</Text>
          <Pressable onPress={() => refetch()} style={[surfaces.primaryButton, { marginTop: 16 }]}>
            <Text variant="button" style={{ color: hex.primaryForeground }}>
              Retry
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={layout.screen}>
        <TreasuryBar title={title} onBack={goBack} backLabel={view.kind === 'home' ? 'Home' : 'Treasury'} />

        {view.kind === 'home' ? (
          <TreasuryHome
            active={active}
            members={members}
            buyIn={buyInUsd}
            collected={collected}
            remaining={remaining}
            totalDue={totalDue}
            fee={fee}
            net={net}
            fullyFunded={fullyFunded}
            structure={payoutStructure}
            paymentsDevMode={paymentsDevMode}
            activity={activity}
            onMarkPaid={markPaid}
            onRemind={sendReminder}
            onRefund={refund}
            onResetPayment={resetPayment}
            onPay={(id) => setView({ kind: 'pay', memberId: id })}
            onReview={() => setView({ kind: 'review' })}
            onSettings={() => setView({ kind: 'settings' })}
            payoutsExecuted={payoutsExecuted}
          />
        ) : null}

        {view.kind === 'pay' ? (
          <PaymentPage
            member={members.find((m) => m.id === view.memberId)!}
            buyIn={buyInUsd}
            fee={platformFeeUsd}
            devMode={paymentsDevMode}
            onComplete={handlePay}
          />
        ) : null}

        {view.kind === 'review' ? (
          <PayoutReview
            leagueId={active.id}
            active={active}
            collected={collected}
            fee={fee}
            net={net}
            structure={payoutStructure}
            payoutPreview={treasury?.payoutPreview ?? []}
            paymentsDevMode={paymentsDevMode}
            payoutsExecuted={payoutsExecuted}
            onComplete={async () => {
              await refetch();
              setView({ kind: 'home' });
            }}
          />
        ) : null}

        {view.kind === 'settings' && active.role === 'commissioner' ? (
          <TreasurySettings
            active={active}
            buyIn={treasury ? treasury.buyInCents / 100 : buyIn}
            structure={payoutStructure}
            saving={savingSettings}
            onSave={async (nextBuyIn, nextStructure) => {
              setSavingSettings(true);
              try {
                await updateTreasurySettings(active.id, {
                  buyInCents: Math.round(nextBuyIn * 100),
                  payoutTemplate: structureToPayoutTemplate(nextStructure),
                  platformFeeCents: Math.max(500, Math.round(nextBuyIn * 100 * 0.05)),
                });
                setBuyIn(nextBuyIn);
                setStructure(nextStructure);
                await refetch();
                Alert.alert('Settings saved', `Buy-in set to $${nextBuyIn}. Members can pay from the pot tab.`);
                setView({ kind: 'home' });
              } catch (e) {
                Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
              } finally {
                setSavingSettings(false);
              }
            }}
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
  paymentsDevMode,
  activity,
  onMarkPaid,
  onRemind,
  onRefund,
  onResetPayment,
  onPay,
  onReview,
  onSettings,
  payoutsExecuted,
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
  paymentsDevMode: boolean;
  activity: ActivityItem[];
  onMarkPaid: (id: string) => void;
  onRemind: (id: string) => void;
  onRefund: (id: string) => void;
  onResetPayment: (id: string) => void;
  onPay: (id: string) => void;
  onReview: () => void;
  onSettings: () => void;
  payoutsExecuted: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<PotTab>('pot');
  const paidCount = members.filter((m) => m.status === 'paid').length;
  const pct = totalDue ? collected / totalDue : 0;
  const splits = computeSplits(net, structure);
  const seasonComplete = active.stage === 'offseason';
  const isCommish = active.role === 'commissioner';

  return (
    <>
      {paymentsDevMode ? (
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: toneFg.warning, backgroundColor: toneBg.warning, padding: 14 }]}>
          <Text variant="eyebrow" style={{ color: toneFg.warning }}>Dev mode · no real charges</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4, lineHeight: 18 }}>
            Payments complete instantly for testing. Leave STRIPE_SECRET_KEY empty on the API.
          </Text>
        </View>
      ) : null}

      <View style={surfaces.roundedCardLg}>
        <View style={[layout.rowStart, { justifyContent: 'space-between' }]}>
          <View style={[layout.flex1, { minWidth: 0 }]}>
            <Text variant="eyebrow">{active.name} · Live pot</Text>
            <Text variant="potAmount" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>${collected.toLocaleString()}</Text>
            <Text variant="subtitle" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>of ${totalDue.toLocaleString()} · {paidCount} of {members.length} paid</Text>
          </View>
          {isCommish ? (
            <Pressable onPress={onSettings} style={layout.iconButtonSm}>
              <Settings size={16} color={c.foreground} />
            </Pressable>
          ) : null}
        </View>
        <View style={[surfaces.progressTrack, { marginTop: 20, height: 6, backgroundColor: hex.background }]}>
          <View style={[surfaces.progressFill, { width: `${Math.min(100, pct * 100)}%`, backgroundColor: hex.success }]} />
        </View>
        <View style={[layout.rowWrap, { marginTop: 12, alignItems: 'center', gap: 8 }]}>
          <View style={[layout.row, { gap: 4, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 }, fullyFunded ? { backgroundColor: toneBg.success } : { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline, backgroundColor: hex.background }]}>
            {fullyFunded ? <CheckCircle2 size={12} color={c.success} /> : <CircleDot size={12} color={c.mutedForeground} />}
            <Text variant="eyebrow" style={{ color: fullyFunded ? hex.success : hex.mutedForeground }}>{fullyFunded ? 'Fully funded' : 'Collecting dues'}</Text>
          </View>
          <View style={{ borderRadius: 9999, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline, backgroundColor: hex.background, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text variant="eyebrow">Week {active.week || '—'}</Text>
          </View>
          <Text variant="caption" muted>{seasonComplete ? 'Season complete' : 'Updates weekly'}</Text>
        </View>
      </View>

      <View style={surfaces.segmented}>
        {[
          { key: 'pot' as const, label: 'League Pot' },
          { key: 'payout' as const, label: 'Payout Structure' },
        ].map((t) => {
          const isActive = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={isActive ? surfaces.segmentedTabActive : surfaces.segmentedTab}>
              <Text variant="tab" style={{ color: isActive ? hex.primaryForeground : hex.mutedForeground }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'pot' ? (
        <PotPane active={active} members={members} buyIn={buyIn} collected={collected} remaining={remaining} fee={fee} net={net} isCommish={isCommish} paymentsDevMode={paymentsDevMode} activity={activity} onMarkPaid={onMarkPaid} onRemind={onRemind} onRefund={onRefund} onResetPayment={onResetPayment} onPay={onPay} />
      ) : (
        <PayoutPane
          active={active}
          members={members}
          splits={splits}
          net={net}
          seasonComplete={seasonComplete}
          isCommish={isCommish}
          paymentsDevMode={paymentsDevMode}
          payoutsExecuted={payoutsExecuted}
          onReview={onReview}
          onSettings={onSettings}
        />
      )}

      <View style={[layout.rowStart, { paddingHorizontal: 8, paddingTop: 4 }]}>
        <Lock size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
        <Text variant="caption" muted style={[layout.flex1, { lineHeight: 16 }]}>Payments processed securely. Receipts and transaction history are saved to every member's profile.</Text>
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
  paymentsDevMode,
  activity,
  onMarkPaid,
  onRemind,
  onRefund,
  onResetPayment,
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
  paymentsDevMode: boolean;
  activity: ActivityItem[];
  onMarkPaid: (id: string) => void;
  onRemind: (id: string) => void;
  onRefund: (id: string) => void;
  onResetPayment: (id: string) => void;
  onPay: (id: string) => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <>
      <AISection title="Treasury insights" caption="AI-powered">
        {treasuryInsights(active).map((r) => (
          <AICard key={r.id} rec={r} />
        ))}
      </AISection>

      <Section title="Finances">
        <View style={[layout.rowWrap, { gap: 8 }]}>
          <Stat label="Collected" value={`$${collected.toLocaleString()}`} />
          <Stat label="Remaining" value={`$${remaining.toLocaleString()}`} accent={remaining > 0} />
          <Stat label="Platform fee" value={`-$${fee.toLocaleString()}`} sub="2.9%" />
          <Stat label="Net prize pool" value={`$${net.toLocaleString()}`} />
        </View>
      </Section>

      <Section title="Member payments">
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          {members.map((m, i) => (
            <MemberRow key={m.id} member={m} buyIn={buyIn} isCommish={isCommish} paymentsDevMode={paymentsDevMode} onMarkPaid={() => onMarkPaid(m.id)} onRemind={() => onRemind(m.id)} onRefund={() => onRefund(m.id)} onResetPayment={() => onResetPayment(m.id)} onPay={() => onPay(m.id)} isFirst={i === 0} />
          ))}
        </View>
      </Section>

      <Section title="Recent activity">
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          {activity.length === 0 ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text variant="bodyMuted">No payments yet. Set a buy-in in Settings, then tap Pay.</Text>
            </View>
          ) : (
            activity.map((a, i) => (
              <View key={a.id} style={[layout.rowStart, { paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
                <View style={{ marginTop: 4, height: 8, width: 8, flexShrink: 0, borderRadius: 9999, backgroundColor: hex.success }} />
                <Text variant="bodySm" style={[layout.flex1, { minWidth: 0 }]}>{a.title}</Text>
                <Text variant="caption" muted>{a.when}</Text>
              </View>
            ))
          )}
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
  paymentsDevMode,
  payoutsExecuted,
  onReview,
  onSettings,
}: {
  active: League;
  members: Member[];
  splits: { place: string; amount: number; pct: number }[];
  net: number;
  seasonComplete: boolean;
  isCommish: boolean;
  paymentsDevMode: boolean;
  payoutsExecuted: boolean;
  onReview: () => void;
  onSettings: () => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const ranked = useMemo(
    () => members.map((m, i) => ({ id: m.id, name: m.isMe ? (active.teamName ?? m.name) : m.name, isMe: !!m.isMe, seed: i })),
    [members, active.teamName],
  );

  return (
    <>
      <Section title={seasonComplete ? 'Final payouts' : 'Live payout projection'} action={<Text variant="eyebrow">{seasonComplete ? 'Final' : 'Updates weekly'}</Text>}>
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          <View style={[layout.rowBetween, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: hex.hairline, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <Text variant="bodyMuted">Net prize pool</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>${net.toLocaleString()}</Text>
          </View>
          {splits.map((s, i) => {
            const m = ranked[i];
            return (
              <View key={s.place} style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }, i > 0 && layout.listRowBorder]}>
                <View style={[layout.iconButtonSm, { width: 36, height: 36 }]}>
                  <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
                </View>
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="body" numberOfLines={1}>
                    {m?.name ?? `Place ${i + 1}`}
                    {m?.isMe ? <Text variant="eyebrow" style={{ textTransform: 'none' }}> You</Text> : null}
                  </Text>
                  <Text variant="bodyMuted">{s.pct}% of pool · {s.place}</Text>
                </View>
                <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>${s.amount.toLocaleString()}</Text>
              </View>
            );
          })}
          <View style={[layout.rowStart, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <CircleDot size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
            <Text variant="caption" muted style={[layout.flex1, { lineHeight: 16 }]}>
              {seasonComplete ? 'Distributes automatically after commissioner review.' : 'Recalculates each week from live standings. Locks in and pays out when the season ends.'}
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Payout slots" action={isCommish ? <Pressable onPress={onSettings}><Text variant="captionSuccess">Edit</Text></Pressable> : undefined}>
        <View style={[layout.rowWrap, { gap: 8 }]}>
          {splits.map((s) => (
            <View key={s.place} style={[surfaces.roundedCard, { width: '31%', padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
              <View style={layout.rowBetween}>
                <Trophy size={16} color={c.mutedForeground} />
                <Text variant="eyebrow">{s.place}</Text>
              </View>
              <Text variant="sectionTitle" style={{ marginTop: 12, fontSize: 22, fontVariant: ['tabular-nums'] }}>${s.amount.toLocaleString()}</Text>
              <Text variant="caption" muted>{s.pct}% of pool</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Payout status">
        <View style={[surfaces.roundedCard, { padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          {payoutsExecuted ? (
            <>
              <View style={[layout.row, { gap: 8 }]}>
                <CheckCircle2 size={12} color={c.success} />
                <Text variant="eyebrow">Payouts distributed</Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }}>
                Winnings were recorded in the treasury ledger. Members can see payout activity below.
              </Text>
            </>
          ) : seasonComplete || active.stage === 'playoffs' || paymentsDevMode ? (
            <>
              <View style={[layout.row, { gap: 8 }]}>
                <CheckCircle2 size={12} color={c.success} />
                <Text variant="eyebrow">
                  {seasonComplete ? 'Season complete' : paymentsDevMode ? 'Dev mode testing' : 'Playoffs in progress'}
                </Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }}>
                {seasonComplete
                  ? 'Final standings imported. Review payouts before they distribute.'
                  : paymentsDevMode
                    ? 'Test the full payout flow anytime in dev mode — no real money moves.'
                    : 'Standings are firming up. Projected payouts will lock once the final week ends.'}
              </Text>
              {isCommish && (seasonComplete || paymentsDevMode) ? (
                <Pressable onPress={onReview} style={[layout.row, { marginTop: 16, gap: 6, alignSelf: 'flex-start', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: hex.foreground }]}>
                  <Text variant="button" style={{ color: hex.background }}>Review payouts</Text>
                  <ChevronRight size={14} color={c.background} />
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <View style={[layout.row, { gap: 8 }]}>
                <CircleDot size={12} color={c.mutedForeground} />
                <Text variant="eyebrow">Waiting for season completion</Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }}>Payouts distribute automatically after the final week of the playoffs. No action needed.</Text>
              <View style={[layout.row, { marginTop: 16, gap: 8 }]}>
                {['Season', 'Review', 'Payout'].map((step, i) => (
                  <View key={step} style={[layout.flex1, layout.centered, { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline, backgroundColor: hex.background, paddingVertical: 10 }]}>
                    <Text variant="eyebrow" style={{ fontSize: 10 }}>{step}</Text>
                    <Text variant="caption" style={{ marginTop: 4, fontWeight: '600' }}>{i === 0 ? 'In progress' : '—'}</Text>
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
  paymentsDevMode,
  isFirst,
  onMarkPaid,
  onRemind,
  onRefund,
  onResetPayment,
  onPay,
}: {
  member: Member;
  buyIn: number;
  isCommish: boolean;
  paymentsDevMode: boolean;
  isFirst: boolean;
  onMarkPaid: () => void;
  onRemind: () => void;
  onRefund: () => void;
  onResetPayment: () => void;
  onPay: () => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={!isFirst ? layout.listRowBorder : undefined}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 12 }]}>
          <Avatar name={m.name} />
          <View style={[layout.flex1, { minWidth: 0 }]}>
            <View style={[layout.row, { gap: 6 }]}>
              <Text variant="body" numberOfLines={1}>{m.name}</Text>
              {m.isMe ? <Text variant="eyebrow" style={{ textTransform: 'none' }}>You</Text> : null}
              {m.isCommish ? (
                <View style={[surfaces.pillMuted, { paddingHorizontal: 6, paddingVertical: 2 }]}>
                  <Text variant="pill" muted style={{ fontSize: 9, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>Commish</Text>
                </View>
              ) : null}
            </View>
            <Text variant="bodyMuted" numberOfLines={1}>
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
          <View style={[layout.row, { gap: 8 }]}>
            <StatusPill status={m.status} amount={buyIn} />
            <ChevronRight size={16} color={c.mutedForeground} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
          </View>
        </View>
      </Pressable>

      {open ? (
        <View style={[layout.rowWrap, { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, paddingHorizontal: 16, paddingVertical: 12 }]}>
          {m.isMe && m.status !== 'paid' && m.status !== 'refunded' ? <ChipBtn primary onPress={onPay} icon={Wallet}>Pay ${buyIn}</ChipBtn> : null}
          {m.status === 'paid' ? <ChipBtn icon={Receipt}>View receipt</ChipBtn> : null}
          {paymentsDevMode && m.status === 'paid' ? (
            <ChipBtn icon={RefreshCw} onPress={onResetPayment}>Reset payment (dev)</ChipBtn>
          ) : null}
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
function PaymentPage({
  member,
  buyIn,
  fee,
  devMode,
  onComplete,
}: {
  member: Member;
  buyIn: number;
  fee: number;
  devMode?: boolean;
  onComplete: () => Promise<void>;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [method, setMethod] = useState<'apple' | 'google' | 'card' | 'ach'>('apple');
  const [processing, setProcessing] = useState(false);

  const submit = async () => {
    setProcessing(true);
    try {
      await onComplete();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={[surfaces.roundedCardLg, { borderWidth: 0, backgroundColor: hex.foreground, padding: 24 }]}>
        <Text variant="eyebrow" style={{ color: 'rgba(252,252,252,0.6)' }}>Pay league dues</Text>
        <Text variant="bodySm" style={{ marginTop: 4, color: 'rgba(252,252,252,0.7)' }}>{member.name}</Text>
        <Text variant="potAmount" style={{ marginTop: 16, color: hex.background, fontVariant: ['tabular-nums'] }}>${buyIn + fee}</Text>
        <Text variant="bodyMuted" style={{ marginTop: 8, color: 'rgba(252,252,252,0.6)', fontVariant: ['tabular-nums'] }}>Buy-in ${buyIn} + processing ${fee}</Text>
      </View>

      <Section title="Payment method">
        <View style={surfaces.roundedCard}>
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
                <View style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }, i > 0 && layout.listRowBorder]}>
                  <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: hex.background }]}>
                    <Icon size={16} color={c.foreground} />
                  </View>
                  <Text variant="body" style={layout.flex1}>{opt.label}</Text>
                  <View style={{ height: 20, width: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 9999, borderWidth: 2, borderColor: isActive ? hex.foreground : hex.border }}>
                    {isActive ? <View style={{ height: 10, width: 10, borderRadius: 9999, backgroundColor: hex.foreground }} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Timeline">
        <View style={surfaces.roundedCard}>
          {[
            { t: 'Now', what: 'Submit payment' },
            { t: 'Instant', what: 'Receipt issued and recorded' },
            { t: 'End of season', what: 'Auto payout if you place' },
          ].map((row, i) => (
            <View key={i} style={[layout.rowStart, { paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
              <Text variant="eyebrow" style={{ width: 80, flexShrink: 0 }}>{row.t}</Text>
              <Text variant="bodyMuted" style={[layout.flex1, { fontSize: 13 }]}>{row.what}</Text>
            </View>
          ))}
        </View>
      </Section>

      <View style={[layout.rowStart, { paddingHorizontal: 8 }]}>
        <ShieldCheck size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
        <Text variant="caption" muted style={[layout.flex1, { lineHeight: 16 }]}>
          {devMode
            ? 'Dev mode: no card required. Payment is recorded instantly for testing.'
            : 'Secured by Commissioner Payments. Your payment method is encrypted and stored only with your consent.'}
        </Text>
      </View>

      <Pressable onPress={submit} disabled={processing} style={[surfaces.primaryButton, { height: 52, opacity: processing ? 0.5 : 1 }]}>
        <Text variant="body" style={{ color: hex.background }}>
          {processing ? 'Processing…' : devMode ? `Record $${buyIn + fee} (dev)` : `Pay $${buyIn + fee}`}
        </Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------ PAYOUT REVIEW ------------------------------ */
function PayoutReview({
  leagueId,
  active,
  collected,
  fee,
  net,
  structure,
  payoutPreview,
  paymentsDevMode,
  payoutsExecuted,
  onComplete,
}: {
  leagueId: string;
  active: League;
  collected: number;
  fee: number;
  net: number;
  structure: PayoutStructure;
  payoutPreview: Array<{ place: number; percent: number; amountCents: number }>;
  paymentsDevMode: boolean;
  payoutsExecuted: boolean;
  onComplete: () => Promise<void>;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const splits = computeSplits(net, structure);
  const [approved, setApproved] = useState(payoutsExecuted);
  const [executing, setExecuting] = useState(false);

  const { data: standingsData, isLoading, isError } = useQuery({
    queryKey: ['standings', leagueId, 'payout-review'],
    queryFn: () => fetchLeagueStandings(leagueId),
    enabled: !!leagueId,
  });

  const podium = useMemo(() => {
    const standings = standingsData?.standings ?? [];
    const previewByPlace = new Map(payoutPreview.map((p) => [p.place, p]));
    return splits.map((split, i) => {
      const standing = standings[i];
      const preview = previewByPlace.get(i + 1);
      return {
        place: split.place,
        name: standing?.teamName ?? standing?.ownerName ?? `Place ${i + 1}`,
        pct: split.pct,
        amount: preview ? preview.amountCents / 100 : split.amount,
        userId: standing?.teamExternalId,
      };
    });
  }, [standingsData?.standings, splits, payoutPreview]);

  const handleApprove = async () => {
    const standings = standingsData?.standings ?? [];
    if (!standings.length) {
      Alert.alert('No standings', 'Standings are required before payouts can be distributed.');
      return;
    }

    const payload = standings
      .slice(0, splits.length)
      .map((s) => ({
        place: s.rank,
        userId: s.teamExternalId,
        teamName: s.teamName ?? s.ownerName ?? undefined,
      }));

    setExecuting(true);
    try {
      await executePayouts(leagueId, payload);
      setApproved(true);
      await onComplete();
      Alert.alert(
        paymentsDevMode ? 'Payouts recorded (dev mode)' : 'Payouts distributed',
        paymentsDevMode
          ? 'Payout amounts were written to the treasury ledger for testing.'
          : 'Winners have been paid according to your payout structure.',
      );
    } catch (e) {
      Alert.alert('Could not distribute', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <View style={[surfaces.roundedCardLg, { borderWidth: 0, padding: 20 }]}>
        <Text variant="eyebrow">{active.name} · {paymentsDevMode ? 'Dev payout test' : 'Final standings'}</Text>
        <Text variant="sectionTitle" style={{ marginTop: 4 }}>{payoutsExecuted ? 'Payouts complete' : 'Review & approve'}</Text>
        <Text variant="subtitle" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>${collected.toLocaleString()} collected · ${fee.toLocaleString()} fee · ${net.toLocaleString()} net</Text>
      </View>

      <Section title="Recommended payouts">
        {isLoading ? (
          <View style={[surfaces.roundedCard, layout.centered, { padding: 24 }]}>
            <ActivityIndicator color={hex.primary} />
          </View>
        ) : isError ? (
          <View style={[surfaces.roundedCard, { padding: 16 }]}>
            <Text variant="bodySm">Could not load standings for payout review.</Text>
          </View>
        ) : (
        <View style={surfaces.roundedCard}>
          {podium.map((row, i) => (
              <View key={row.place} style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }, i > 0 && layout.listRowBorder]}>
                <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: hex.background }]}>
                  <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
                </View>
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="body" numberOfLines={1}>{row.name}</Text>
                  <Text variant="bodyMuted">{row.pct}% of net pool</Text>
                </View>
                <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>${row.amount.toLocaleString()}</Text>
              </View>
            ))}
        </View>
        )}
      </Section>

      {paymentsDevMode ? (
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: toneFg.warning, backgroundColor: toneBg.warning, padding: 14 }]}>
          <Text variant="eyebrow" style={{ color: toneFg.warning }}>Dev mode</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4, lineHeight: 18 }}>
            Approving writes payout ledger entries only — no Stripe transfers.
          </Text>
        </View>
      ) : null}

      <Section title="Review window">
        <View style={surfaces.roundedCard}>
          {[
            { t: 'Today', what: 'Recommendations generated', done: true },
            { t: '+3 days', what: 'Member review window', done: approved },
            { t: '+4 days', what: paymentsDevMode ? 'Ledger payout recorded' : 'Auto distribution to bank or card', done: approved },
          ].map((row, i) => (
            <View key={i} style={[layout.rowStart, { paddingHorizontal: 16, paddingVertical: 12 }, i > 0 && layout.listRowBorder]}>
              <Text variant="eyebrow" style={{ width: 80, flexShrink: 0 }}>{row.t}</Text>
              <Text variant="bodyMuted" style={[layout.flex1, { fontSize: 13 }]}>{row.what}</Text>
              {row.done ? <CheckCircle2 size={16} color={c.success} /> : null}
            </View>
          ))}
        </View>
      </Section>

      <Pressable
        onPress={handleApprove}
        disabled={approved || executing || isLoading || isError}
        style={[surfaces.primaryButton, { height: 52, backgroundColor: approved ? hex.success : hex.foreground, opacity: approved || executing ? 0.7 : 1 }]}
      >
        <Text variant="body" style={{ color: hex.background }}>
          {approved ? 'Payouts distributed' : executing ? 'Distributing…' : 'Approve payouts'}
        </Text>
      </Pressable>

      <Text variant="caption" muted style={{ paddingHorizontal: 8 }}>Every payout is auditable. Members can view receipts and confirmations from their profile.</Text>
    </View>
  );
}

/* ------------------------------ SETTINGS ------------------------------ */
function TreasurySettings({
  active,
  buyIn,
  structure,
  saving,
  onSave,
}: {
  active: League;
  buyIn: number;
  structure: PayoutStructure;
  saving: boolean;
  onSave: (buyIn: number, structure: PayoutStructure) => Promise<void>;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [localBuyIn, setLocalBuyIn] = useState(buyIn);
  const [localStructure, setLocalStructure] = useState(structure);
  const [reminder, setReminder] = useState<'off' | 'weekly' | 'daily'>('weekly');
  const [autoPayout, setAutoPayout] = useState(true);
  const [offline, setOffline] = useState(true);

  return (
    <View style={{ gap: 20 }}>
      <Section title="Buy-in">
        <View style={[layout.row, { gap: 8 }]}>
          {[25, 50, 100, 200, 500].map((n) => (
            <Pressable
              key={n}
              onPress={() => setLocalBuyIn(n)}
              style={[layout.flex1, layout.centered, surfaces.pill, { paddingHorizontal: 8, paddingVertical: 10, backgroundColor: localBuyIn === n ? hex.foreground : hex.surfaceElevated }]}
            >
              <Text variant="tab" style={{ color: localBuyIn === n ? hex.background : hex.mutedForeground, fontVariant: ['tabular-nums'] }}>${n}</Text>
            </Pressable>
          ))}
        </View>
        <Text variant="caption" muted style={{ paddingHorizontal: 8, marginTop: 8 }}>Each of {active.members ?? 10} members owes ${localBuyIn}.</Text>
      </Section>

      <Section title="Prize structure">
        <View style={{ gap: 8 }}>
          {([
            { id: 'all', label: 'Winner takes all' },
            { id: 'top2', label: 'Top two' },
            { id: 'top3', label: 'Top three' },
            { id: 'top4', label: 'Top four' },
            { id: 'custom', label: 'Custom' },
          ] as const).map((opt) => {
            const isActive = localStructure === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setLocalStructure(opt.id)}
                style={[layout.rowBetween, surfaces.roundedCard, { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: isActive ? hex.foreground : hex.surfaceElevated }]}
              >
                <Text variant="bodySm" style={{ color: isActive ? hex.background : hex.foreground }}>{opt.label}</Text>
                {isActive ? <CheckCircle2 size={16} color={c.background} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Reminders">
        <Text variant="bodyMuted" style={{ paddingHorizontal: 8, paddingBottom: 8 }}>Reminder frequency</Text>
        <View style={surfaces.segmented}>
          {[
            { id: 'off', label: 'Off' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'daily', label: 'Daily' },
          ].map((o) => (
            <Pressable
              key={o.id}
              onPress={() => setReminder(o.id as typeof reminder)}
              style={reminder === o.id ? surfaces.segmentedTabActive : surfaces.segmentedTab}
            >
              <Text variant="tab" style={{ color: reminder === o.id ? hex.primaryForeground : hex.mutedForeground }}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Payouts">
        <View style={surfaces.roundedCard}>
          <ToggleRow label="Auto payout" sub="Distribute winnings after review window" value={autoPayout} onChange={setAutoPayout} />
          <ToggleRow label="Allow offline payments" sub="Mark members as paid outside Commissioner" value={offline} onChange={setOffline} divider />
        </View>
      </Section>

      <Section title="Deadlines">
        <View style={surfaces.roundedCard}>
          <ReadRow label="Payment deadline" value="Sep 1, 2026" />
          <ReadRow label="Payout timing" value="Within 24 hrs of approval" divider />
        </View>
      </Section>

      <Pressable
        onPress={() => onSave(localBuyIn, localStructure)}
        disabled={saving}
        style={[surfaces.primaryButton, { height: 52, opacity: saving ? 0.5 : 1 }]}
      >
        <Text variant="body" style={{ color: hex.background }}>{saving ? 'Saving…' : 'Save treasury settings'}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------ ATOMS ------------------------------ */
function TreasuryBar({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <View style={[layout.rowBetween, { paddingHorizontal: 4, paddingTop: 8 }]}>
      <Pressable onPress={onBack} style={[layout.row, { gap: 4, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 6 }]}>
        <ChevronLeft size={16} color={c.mutedForeground} />
        <Text variant="link" muted>{backLabel}</Text>
      </Pressable>
      <Text variant="eyebrow">{title}</Text>
      <View style={{ width: 48 }} />
    </View>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={layout.sectionBlock}>
      <View style={[layout.rowBetween, { paddingHorizontal: 8 }]}>
        <Text variant="eyebrow" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={[surfaces.roundedCard, { width: '48%', padding: 16, borderRadius: 20 }]}>
      <Text variant="eyebrow" style={{ fontSize: 10 }}>{label}</Text>
      <Text variant="statValue" style={{ marginTop: 4, fontVariant: ['tabular-nums'], color: accent ? hex.warning : hex.foreground }}>{value}</Text>
      {sub ? <Text variant="caption" muted>{sub}</Text> : null}
    </View>
  );
}

function StatusPill({ status, amount }: { status: PayState; amount: number }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const map: Record<PayState, { label: string; bg: string; fg: string }> = {
    paid: { label: `Paid · $${amount}`, bg: toneBg.success, fg: hex.success },
    pending: { label: 'Pending', bg: toneBg.neutral, fg: hex.foreground },
    overdue: { label: 'Overdue', bg: toneBg.danger, fg: hex.danger },
    failed: { label: 'Failed', bg: toneBg.danger, fg: hex.danger },
    refunded: { label: 'Refunded', bg: toneBg.neutral, fg: hex.mutedForeground },
    unpaid: { label: 'Unpaid', bg: toneBg.neutral, fg: hex.mutedForeground },
  };
  const s = map[status];
  return (
    <View style={[surfaces.pill, { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: s.bg }]}>
      <Text variant="eyebrow" style={{ color: s.fg, textTransform: 'none', letterSpacing: 0.5 }}>{s.label}</Text>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <View style={[surfaces.iconBoxSm, { flexShrink: 0, borderRadius: 9999, backgroundColor: hex.background }]}>
      <Text variant="bodySm" style={{ fontSize: 12 }}>{initials}</Text>
    </View>
  );
}

function ChipBtn({ children, onPress, icon: Icon, primary }: { children: ReactNode; onPress?: () => void; icon: LucideIcon; primary?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[layout.row, { gap: 6, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: primary ? hex.foreground : hex.background }]}
    >
      <Icon size={14} color={primary ? c.background : c.foreground} />
      <Text variant="button" style={{ color: primary ? hex.background : hex.foreground }}>{children}</Text>
    </Pressable>
  );
}

function ToggleRow({ label, sub, value, onChange, divider }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; divider?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }, divider && layout.listRowBorder]}>
      <View style={[layout.flex1, { minWidth: 0 }]}>
        <Text variant="bodySm">{label}</Text>
        {sub ? <Text variant="bodyMuted">{sub}</Text> : null}
      </View>
      <Toggle on={value} onChange={onChange} />
    </View>
  );
}

function ReadRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  return (
    <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 14 }, divider && layout.listRowBorder]}>
      <Text variant="bodyMuted" style={{ fontSize: 13 }}>{label}</Text>
      <Text variant="body">{value}</Text>
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
