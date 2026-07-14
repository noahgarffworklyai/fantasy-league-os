import { computePlatformFeeCents, PAYOUT_TEMPLATES } from '@flos/shared';
import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Lock,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { HeaderAvatarButton } from '@/components/AppChrome';
import { PageIntro } from '@/components/ui/PageIntro';
import { SegmentedTabLabel } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { useLeague, type League } from '@/lib/league-context';
import { useAuthStore } from '@/lib/auth-store';
import { startBuyInCheckout } from '@/lib/checkout';
import {
  executePayouts,
  fetchLeagueStandings,
  fetchTreasury,
  payoutTemplateToStructure,
  resetMemberPayment,
  structureToPayoutTemplate,
  updateTreasurySettings,
  type TreasuryData,
  type TreasuryLedgerActivity,
  type TreasuryPayoutSlot,
} from '@/lib/treasury-api';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';
import { lightHex } from '@/lib/colors';
import { personAvatar } from '@/lib/avatars';
import { useLeagueMates } from '@/lib/league-mates-api';

type PayState = 'paid' | 'pending' | 'overdue' | 'failed' | 'refunded' | 'unpaid';
type PayoutStructure = 'all' | 'top2' | 'top3' | 'top4' | 'custom';

interface Member {
  id: string;
  userId: string | null;
  name: string;
  teamName: string | null;
  providerTeamId: string | null;
  handle: string;
  status: PayState;
  paidOn?: string;
  method?: string;
  reminded?: number;
  isMe?: boolean;
  isCommish?: boolean;
  isAppMember: boolean;
  rank: number | null;
  avatarUrl: string | null;
  ownerExternalId: string | null;
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
  testMode?: boolean,
): Member[] {
  return data.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.displayName,
    teamName: m.teamName,
    providerTeamId: m.providerTeamId,
    handle: `@${(m.displayName.split(/\s+/)[0] ?? 'member').toLowerCase()}`,
    status: m.paid ? ('paid' as PayState) : ('unpaid' as PayState),
    paidOn: formatPaidDate(m.paidAt),
    method: m.paid ? (devMode ? 'Dev mode' : testMode ? 'Stripe test' : 'Stripe') : undefined,
    isMe: m.userId === currentUserId,
    isCommish: m.userId === currentUserId && isCommissioner,
    isAppMember: m.isAppMember,
    rank: m.rank,
    avatarUrl: m.ownerAvatarUrl,
    ownerExternalId: m.ownerExternalId,
  }));
}

type TreasuryView = { kind: 'home' } | { kind: 'pay'; memberId: string } | { kind: 'review' } | { kind: 'settings' };

export default function TreasuryPage() {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { active, refreshLeagues } = useLeague();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [view, setView] = useState<TreasuryView>({ kind: 'home' });
  const [structure, setStructure] = useState<PayoutStructure>('top3');
  const [buyIn, setBuyIn] = useState<number>(active?.buyIn ?? 100);
  const [savingSettings, setSavingSettings] = useState(false);
  const [paymentSuccessOpen, setPaymentSuccessOpen] = useState(false);

  const isSynced = active?.type === 'synced';

  const {
    data: treasury,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['treasury', active?.id, isSynced],
    queryFn: () => fetchTreasury(active!.id, { sync: isSynced }),
    enabled: !!active?.id,
  });

  const members = useMemo(() => {
    if (!treasury || !currentUserId) return [];
    return mapTreasuryMembers(
      treasury,
      currentUserId,
      active?.role === 'commissioner',
      treasury.paymentsDevMode,
      treasury.paymentsTestMode,
    );
  }, [treasury, currentUserId, active?.role]);

  if (!active) return null;

  const buyInUsd = treasury ? treasury.buyInCents / 100 : buyIn;
  const platformFeeUsd = treasury ? computePlatformFeeCents(treasury.buyInCents) / 100 : computePlatformFeeCents(Math.round(buyIn * 100)) / 100;
  const collected = treasury ? treasury.potCents / 100 : 0;
  const memberCount = treasury?.totalMemberCount ?? active.size ?? active.members ?? members.length;
  const paidCount = treasury?.paidMemberCount ?? members.filter((m) => m.status === 'paid').length;
  const totalDue = treasury ? buyInUsd * memberCount : buyInUsd * (active.size ?? active.members ?? 12);
  const remaining = Math.max(0, totalDue - collected);
  const fee = treasury ? (computePlatformFeeCents(treasury.buyInCents) * treasury.paidMemberCount) / 100 : 0;
  const net = collected - fee;
  const fullyFunded = collected >= totalDue && totalDue > 0;
  const payoutStructure = treasury ? payoutTemplateToStructure(treasury.payoutTemplate) : structure;
  const paymentsDevMode = treasury?.paymentsDevMode ?? false;
  const paymentsTestMode = treasury?.paymentsTestMode ?? false;
  const canResetPayment = paymentsDevMode || paymentsTestMode;
  const payoutsExecuted = treasury?.ledgerActivity?.some((a) => a.type === 'payout') ?? false;

  const handlePay = async () => {
    if (view.kind !== 'pay') return;
    const member = members.find((m) => m.id === view.memberId);
    if (!member?.isMe || !member.userId) return;

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
      setPaymentSuccessOpen(true);
    } catch (e) {
      Alert.alert(
        'Payment failed',
        e instanceof Error ? e.message : 'Something went wrong. Check your connection and try again.',
      );
    }
  };

  const handleResetPayment = async (userId?: string) => {
    if (!active?.id || !canResetPayment) return;
    try {
      await resetMemberPayment(active.id, userId);
      await refetch();
      await refreshLeagues();
      Alert.alert('Payment reset', 'You can pay again to retest the checkout flow.');
    } catch (e) {
      Alert.alert('Could not reset', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const goBack = () => {
    if (view.kind !== 'home') setView({ kind: 'home' });
  };

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
        {view.kind === 'home' ? (
          <PageIntro title="Treasury" trailing={<HeaderAvatarButton />} />
        ) : (
          <TreasuryBar onBack={goBack} showBack />
        )}

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
            payoutSlots={treasury?.payoutSlots ?? []}
            payoutPreview={treasury?.payoutPreview ?? []}
            payoutTemplate={treasury?.payoutTemplate ?? 'standard'}
            ledgerActivity={treasury?.ledgerActivity ?? []}
            paidCount={paidCount}
            memberCount={memberCount}
            platformFee={platformFeeUsd}
            paymentsDevMode={paymentsDevMode}
            paymentsTestMode={paymentsTestMode}
            canResetPayment={canResetPayment}
            onResetPayment={handleResetPayment}
            onPay={(id) => setView({ kind: 'pay', memberId: id })}
            onReview={() => setView({ kind: 'review' })}
            onSettings={() => setView({ kind: 'settings' })}
            payoutsExecuted={payoutsExecuted}
          />
        ) : null}

        {view.kind === 'pay' ? (
          <PaymentPage
            buyIn={buyInUsd}
            platformFee={platformFeeUsd}
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
            payoutSlots={treasury?.payoutSlots ?? []}
            members={members}
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
                  platformFeeCents: computePlatformFeeCents(Math.round(nextBuyIn * 100)),
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
      <PaymentSuccessDialog open={paymentSuccessOpen} onClose={() => setPaymentSuccessOpen(false)} />
    </Screen>
  );
}

function PaymentSuccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hex, layout, surfaces } = useThemeTokens();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[layout.flex1, layout.centered, { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 32 }]}>
        <View
          style={[
            surfaces.roundedCardLg,
            {
              width: '100%',
              maxWidth: 320,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: 20,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.hairline,
              alignItems: 'center',
            },
          ]}
        >
          <CheckCircle2 size={40} color={hex.success} strokeWidth={2} />
          <Text variant="titleLg" style={{ marginTop: 16, textAlign: 'center' }}>
            Payment Complete
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            Your buy-in was recorded.
          </Text>
          <Pressable
            onPress={onClose}
            style={[
              surfaces.primaryButton,
              layout.centered,
              { marginTop: 24, width: '100%', paddingVertical: 14, borderRadius: 999 },
            ]}
          >
            <Text variant="button" style={{ color: hex.primaryForeground }}>
              OK
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------ HOME ------------------------------ */
type PotTab = 'pot' | 'payout';

const TREASURY_GOLD = '#D4AF37';
const TREASURY_GOLD_RING = 'rgba(212, 175, 55, 0.35)';
const TREASURY_GOLD_FILL = 'rgba(212, 175, 55, 0.12)';
const LIVE_POT_SIZE = 220;

function formatPotDollars(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function LivePotCircle({
  amount,
  total,
  paidCount,
  totalCount,
  myPaid,
  fullyFunded,
}: {
  amount: number;
  total: number;
  paidCount: number;
  totalCount: number;
  myPaid: boolean;
  fullyFunded: boolean;
}) {
  const { hex, layout } = useThemeTokens();
  const showTotal = total > 0 && !fullyFunded;

  const state = fullyFunded ? 'full' : myPaid ? 'paid' : 'pending';
  const accent = state === 'pending' ? TREASURY_GOLD : hex.success;
  const accentRing = state === 'pending' ? TREASURY_GOLD_RING : `${hex.success}40`;
  const accentFill = state === 'pending' ? TREASURY_GOLD_FILL : hex.surfaceElevated;
  const label = state === 'full' ? 'Fully funded' : 'Live pot';

  if (state === 'full') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: LIVE_POT_SIZE,
            height: LIVE_POT_SIZE,
            borderRadius: LIVE_POT_SIZE / 2,
            borderWidth: 2,
            borderColor: `${hex.success}66`,
            backgroundColor: hex.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Trophy size={15} color={TREASURY_GOLD} strokeWidth={2.25} />
            <Text variant="eyebrow" style={{ color: hex.success, letterSpacing: 1.2 }}>
              {label}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 40,
              fontWeight: '700',
              letterSpacing: -1,
              fontVariant: ['tabular-nums'],
              color: hex.foreground,
            }}
          >
            {formatPotDollars(amount)}
          </Text>
          <View style={[layout.row, { alignItems: 'center', gap: 5, marginTop: 10 }]}>
            <CheckCircle2 size={14} color={hex.success} strokeWidth={2.5} />
            <Text variant="bodySm" style={{ color: hex.mutedForeground, fontVariant: ['tabular-nums'] }}>
              {paidCount}/{totalCount} paid · {formatPotDollars(total)} pot
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: LIVE_POT_SIZE,
          height: LIVE_POT_SIZE,
          borderRadius: LIVE_POT_SIZE / 2,
          borderWidth: 3,
          borderColor: accent,
          backgroundColor: accentFill,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: LIVE_POT_SIZE - 18,
            height: LIVE_POT_SIZE - 18,
            borderRadius: (LIVE_POT_SIZE - 18) / 2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: accentRing,
          }}
        />
        <Text variant="eyebrow" style={{ color: accent, letterSpacing: 1.4 }}>
          {label}
        </Text>
        <Text
          variant="potAmount"
          style={{
            marginTop: 6,
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
            color: accent,
            fontSize: showTotal ? 28 : undefined,
            lineHeight: showTotal ? 32 : undefined,
            fontWeight: '600',
          }}
        >
          {showTotal ? `${formatPotDollars(amount)} / ${formatPotDollars(total)}` : formatPotDollars(amount)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
          <Text
            variant="bodySm"
            style={{
              fontVariant: ['tabular-nums'],
              color: accent,
              opacity: 0.9,
            }}
          >
            {paidCount}/{totalCount} paid
          </Text>
        </View>
      </View>
    </View>
  );
}

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
  payoutSlots,
  payoutPreview,
  payoutTemplate,
  ledgerActivity,
  paidCount,
  memberCount,
  platformFee,
  paymentsDevMode,
  paymentsTestMode,
  canResetPayment,
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
  payoutSlots: TreasuryPayoutSlot[];
  payoutPreview: Array<{ place: number; percent: number; amountCents: number }>;
  payoutTemplate: string;
  ledgerActivity: TreasuryLedgerActivity[];
  paidCount: number;
  memberCount: number;
  platformFee: number;
  paymentsDevMode: boolean;
  paymentsTestMode: boolean;
  canResetPayment: boolean;
  onResetPayment: (userId?: string) => Promise<void>;
  onPay: (id: string) => void;
  onReview: () => void;
  onSettings: () => void;
  payoutsExecuted: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<PotTab>('pot');
  const seasonComplete = active.stage === 'offseason';
  const isCommish = active.role === 'commissioner';
  const myPaid = members.some((m) => m.isMe && m.status === 'paid');
  const potAccent = fullyFunded ? hex.success : myPaid ? hex.success : TREASURY_GOLD;

  return (
    <>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 20 }}>
        <LivePotCircle
          amount={collected}
          total={totalDue}
          paidCount={paidCount}
          totalCount={memberCount}
          myPaid={myPaid}
          fullyFunded={fullyFunded}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          padding: 5,
          marginBottom: 20,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: `${potAccent}59`,
          backgroundColor: `${potAccent}14`,
        }}
      >
        {[
          { key: 'pot' as const, label: 'League Pot' },
          { key: 'payout' as const, label: 'Payout Structure' },
        ].map((t) => {
          const isActive = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: isActive ? hex.surfaceElevated : 'transparent',
                borderWidth: isActive ? StyleSheet.hairlineWidth : 0,
                borderColor: isActive ? `${potAccent}59` : 'transparent',
                shadowColor: isActive ? potAccent : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isActive ? 0.18 : 0,
                shadowRadius: 8,
                elevation: isActive ? 3 : 0,
              }}
            >
              <Text
                variant="tab"
                style={{
                  color: isActive ? potAccent : hex.mutedForeground,
                  fontWeight: isActive ? '600' : '500',
                  textAlign: 'center',
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'pot' ? (
        <PotPane
          active={active}
          members={members}
          buyIn={buyIn}
          platformFee={platformFee}
          paymentsDevMode={paymentsDevMode}
          paymentsTestMode={paymentsTestMode}
          canResetPayment={canResetPayment}
          onResetPayment={onResetPayment}
          onPay={onPay}
        />
      ) : (
        <PayoutPane
          active={active}
          members={members}
          payoutPreview={payoutPreview}
          payoutTemplate={payoutTemplate}
          payoutSlots={payoutSlots}
          collected={collected}
          fee={fee}
          paidCount={paidCount}
          memberCount={memberCount}
          ledgerActivity={ledgerActivity}
          seasonComplete={seasonComplete}
          isCommish={isCommish}
          paymentsDevMode={paymentsDevMode}
          payoutsExecuted={payoutsExecuted}
          onReview={onReview}
          onSettings={onSettings}
        />
      )}

      <View style={[layout.rowStart, { paddingHorizontal: 8, paddingTop: 8 }]}>
        <Lock size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
        <Text variant="caption" muted style={[layout.flex1, { lineHeight: 16 }]}>Payments processed securely. Receipts and transaction history are saved to every member's profile.</Text>
      </View>

      {paymentsDevMode ? (
        <View
          style={[
            surfaces.roundedCard,
            {
              marginTop: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: toneFg.warning,
              backgroundColor: toneBg.warning,
              padding: 14,
              gap: 10,
            },
          ]}
        >
          <Text variant="eyebrow" style={{ color: toneFg.warning }}>Dev mode · no real charges</Text>
          <Text variant="bodyMuted" style={{ lineHeight: 18 }}>
            Payments complete instantly. Add STRIPE_SECRET_KEY=sk_test_... to apps/api/.env and restart the API for real Stripe Checkout.
          </Text>
          {canResetPayment && members.some((m) => m.isMe && m.status === 'paid') ? (
            <Pressable
              onPress={() => {
                const me = members.find((m) => m.isMe);
                if (me?.userId) void onResetPayment(me.userId);
              }}
              style={[surfaces.pill, { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: hex.background }]}
            >
              <Text variant="button">Reset my payment to unpaid</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function formatDuesAmount(amount: number) {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return `$${amount.toLocaleString()}`;
}

function PayDuesCard({ total, onPress }: { total: number; onPress: () => void }) {
  const { hex, layout } = useThemeTokens();

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: TREASURY_GOLD_RING,
        backgroundColor: hex.surfaceElevated,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 4,
      }}
    >
      <View style={[layout.rowBetween, { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 22, gap: 16 }]}>
        <View style={[layout.flex1, { minWidth: 0, gap: 6 }]}>
          <Text variant="eyebrow" style={{ color: hex.mutedForeground, letterSpacing: 1.2 }}>
            League dues
          </Text>
          <Text
            style={{
              color: hex.foreground,
              fontSize: 34,
              fontWeight: '600',
              letterSpacing: -0.5,
              fontVariant: ['tabular-nums'],
            }}
          >
            ${total.toLocaleString()}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: TREASURY_GOLD,
            paddingHorizontal: 22,
            paddingVertical: 14,
            borderRadius: 999,
          }}
        >
          <Text variant="button" style={{ color: lightHex.foreground }}>
            Pay
          </Text>
          <ChevronRight size={18} color={lightHex.foreground} strokeWidth={2.5} />
        </View>
      </View>
    </Pressable>
  );
}

function PaidDuesCard({ total }: { total: number }) {
  const { hex, layout } = useThemeTokens();
  const successRing = `${hex.success}59`;

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: successRing,
        backgroundColor: hex.surfaceElevated,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 4,
      }}
    >
      <View style={[layout.rowBetween, { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 22, gap: 16 }]}>
        <View style={[layout.flex1, { minWidth: 0, gap: 6 }]}>
          <Text variant="eyebrow" style={{ color: hex.mutedForeground, letterSpacing: 1.2 }}>
            You're all set
          </Text>
          <Text
            style={{
              color: hex.foreground,
              fontSize: 34,
              fontWeight: '600',
              letterSpacing: -0.5,
              fontVariant: ['tabular-nums'],
            }}
          >
            ${total.toLocaleString()}
          </Text>
          <Text variant="bodySm" style={{ color: hex.mutedForeground, marginTop: 2 }}>
            Dues paid · ready for the season
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: hex.success,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 999,
          }}
        >
          <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text variant="button" style={{ color: '#FFFFFF' }}>
            Paid
          </Text>
        </View>
      </View>
    </View>
  );
}

function DuesCardShell({
  tone,
  onPress,
  children,
}: {
  tone: 'danger' | 'success' | 'neutral';
  onPress?: () => void;
  children: ReactNode;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const toneStyle =
    tone === 'danger'
      ? { backgroundColor: toneBg.danger, borderColor: toneFg.danger }
      : tone === 'success'
        ? { backgroundColor: toneBg.success, borderColor: toneFg.success }
        : { backgroundColor: hex.surfaceElevated, borderColor: hex.hairline };

  const content = (
    <View
      style={[
        surfaces.cardBorder,
        layout.row,
        {
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderWidth: StyleSheet.hairlineWidth,
          ...toneStyle,
        },
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ width: '100%' }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

function MyLeagueDuesCard({
  member,
  buyIn,
  platformFee,
  paymentsDevMode,
  paymentsTestMode,
  canResetPayment,
  onPay,
  onResetPayment,
}: {
  member: Member | undefined;
  buyIn: number;
  platformFee: number;
  paymentsDevMode: boolean;
  paymentsTestMode: boolean;
  canResetPayment: boolean;
  onPay: () => void;
  onResetPayment: () => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const total = buyIn + platformFee;

  if (!member) {
    return (
      <DuesCardShell tone="neutral">
        <View style={[layout.flex1, { minWidth: 0, gap: 4 }]}>
          <Text variant="body" style={{ fontSize: 16 }}>
            Your roster slot was not found
          </Text>
          <Text variant="bodyMuted">
            Sync the league or join with the invite link to pay dues here.
          </Text>
        </View>
      </DuesCardShell>
    );
  }

  if (member.status === 'paid') {
    return (
      <PaidDuesCard total={total} />
    );
  }

  if (!member.isAppMember) {
    return (
      <DuesCardShell tone="neutral">
        <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: hex.background }]}>
          <Wallet size={18} color={c.mutedForeground} />
        </View>
        <View style={[layout.flex1, { minWidth: 0, gap: 4 }]}>
          <Text variant="body" style={{ fontSize: 16 }}>
            Join to pay league dues
          </Text>
          <Text variant="bodyMuted">
            Accept your league invite in the app to pay {formatDuesAmount(total)} into the pot.
          </Text>
        </View>
      </DuesCardShell>
    );
  }

  if (buyIn <= 0) {
    return (
      <DuesCardShell tone="neutral">
        <View style={[surfaces.iconBoxSm, { borderRadius: 9999, backgroundColor: hex.background }]}>
          <CircleDot size={18} color={c.mutedForeground} />
        </View>
        <View style={[layout.flex1, { minWidth: 0, gap: 4 }]}>
          <Text variant="body" style={{ fontSize: 16 }}>
            Buy-in not set
          </Text>
          <Text variant="bodyMuted">The commissioner needs to set a buy-in before you can pay.</Text>
        </View>
      </DuesCardShell>
    );
  }

  return (
    <PayDuesCard total={total} onPress={onPay} />
  );
}

function PotPane({
  active,
  members,
  buyIn,
  platformFee,
  paymentsDevMode,
  paymentsTestMode,
  canResetPayment,
  onResetPayment,
  onPay,
}: {
  active: League;
  members: Member[];
  buyIn: number;
  platformFee: number;
  paymentsDevMode: boolean;
  paymentsTestMode: boolean;
  canResetPayment: boolean;
  onResetPayment: (userId?: string) => Promise<void>;
  onPay: (id: string) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const myMember = members.find((m) => m.isMe);
  const isSynced = active.type === 'synced';
  const { data: mates } = useLeagueMates(active.id, isSynced);

  const membersWithAvatars = useMemo(() => {
    const avatarByTeam = new Map(mates?.map((mate) => [mate.id, mate.avatarUrl]) ?? []);
    const avatarByUser = new Map(mates?.map((mate) => [mate.userId, mate.avatarUrl]) ?? []);
    const withAvatars = !mates?.length
      ? members
      : members.map((member) => ({
          ...member,
          avatarUrl:
            member.avatarUrl ??
            (member.providerTeamId ? avatarByTeam.get(member.providerTeamId) ?? null : null) ??
            (member.ownerExternalId ? avatarByUser.get(member.ownerExternalId) ?? null : null),
        }));
    return [...withAvatars].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [members, mates]);

  return (
    <>
      <MyLeagueDuesCard
        member={myMember}
        buyIn={buyIn}
        platformFee={platformFee}
        paymentsDevMode={paymentsDevMode}
        paymentsTestMode={paymentsTestMode}
        canResetPayment={canResetPayment}
        onPay={() => {
          if (myMember) onPay(myMember.id);
        }}
        onResetPayment={() => {
          if (myMember?.userId) void onResetPayment(myMember.userId);
        }}
      />

      <Section title="Member payments">
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          {membersWithAvatars.map((m, i) => (
            <MemberPaymentRow
              key={m.id}
              member={m}
              isFirst={i === 0}
              canReset={canResetPayment && m.status === 'paid' && (m.isMe || active.role === 'commissioner')}
              onReset={
                canResetPayment && m.userId
                  ? () => void onResetPayment(m.userId!)
                  : undefined
              }
            />
          ))}
        </View>
      </Section>
    </>
  );
}

function formatPayoutPlace(place: number): string {
  const suffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th';
  return `${place}${suffix}`;
}

function payoutTemplateLabel(template: string): string {
  const entry = PAYOUT_TEMPLATES[template as keyof typeof PAYOUT_TEMPLATES];
  return entry?.label ?? 'Custom';
}

function trophyAccent(place: number, hex: { success: string; mutedForeground: string }): string {
  if (place === 1) return TREASURY_GOLD;
  if (place === 2) return hex.mutedForeground;
  if (place === 3) return '#B87333';
  return hex.mutedForeground;
}

type PayoutProjectionRow = {
  place: number;
  placeLabel: string;
  name: string;
  teamName: string | null;
  pct: number;
  amount: number;
  isMe: boolean;
  isAppMember: boolean;
  avatarUrl: string | null;
  avatarSeed: string;
  record: string | null;
  pointsFor: number | null;
};

function buildPayoutProjectionRows(
  payoutPreview: Array<{ place: number; percent: number; amountCents: number }>,
  payoutSlots: TreasuryPayoutSlot[],
  members: Member[],
  standings: Array<{
    rank: number;
    teamExternalId: string;
    teamName?: string;
    ownerName?: string | null;
    wins: number;
    losses: number;
    ties?: number;
    pointsFor: number;
  }>,
): PayoutProjectionRow[] {
  const slotsByPlace = new Map(payoutSlots.map((slot) => [slot.place, slot]));
  const standingByRank = new Map(standings.map((row) => [row.rank, row]));

  return payoutPreview.map((preview) => {
    const slot = slotsByPlace.get(preview.place);
    const standing = standingByRank.get(preview.place);
    const member =
      members.find((m) => slot?.userId && m.userId === slot.userId) ??
      members.find((m) => slot?.teamExternalId && m.providerTeamId === slot.teamExternalId) ??
      members.find((m) => standing && m.providerTeamId === standing.teamExternalId) ??
      members.find((m) => m.rank === preview.place);

    const name =
      slot?.ownerName ??
      slot?.teamName ??
      standing?.ownerName?.trim() ??
      standing?.teamName ??
      member?.name ??
      `Place ${preview.place}`;

    const teamName = slot?.teamName ?? standing?.teamName ?? member?.teamName ?? null;
    const avatarSeed =
      member?.ownerExternalId ??
      member?.providerTeamId ??
      slot?.teamExternalId ??
      standing?.teamExternalId ??
      `${preview.place}-${name}`;

    const record = standing
      ? `${standing.wins}-${standing.losses}${standing.ties ? `-${standing.ties}` : ''}`
      : null;

    return {
      place: preview.place,
      placeLabel: formatPayoutPlace(preview.place),
      name,
      teamName,
      pct: preview.percent,
      amount: preview.amountCents / 100,
      isMe: !!member?.isMe,
      isAppMember: member?.isAppMember ?? !!slot?.userId,
      avatarUrl: member?.avatarUrl ?? null,
      avatarSeed,
      record,
      pointsFor: standing?.pointsFor ?? null,
    };
  });
}

function PayoutPane({
  active,
  members,
  payoutPreview,
  payoutTemplate,
  payoutSlots,
  collected,
  fee,
  paidCount,
  memberCount,
  ledgerActivity,
  seasonComplete,
  isCommish,
  paymentsDevMode,
  payoutsExecuted,
  onReview,
  onSettings,
}: {
  active: League;
  members: Member[];
  payoutPreview: Array<{ place: number; percent: number; amountCents: number }>;
  payoutTemplate: string;
  payoutSlots: TreasuryPayoutSlot[];
  collected: number;
  fee: number;
  paidCount: number;
  memberCount: number;
  ledgerActivity: TreasuryLedgerActivity[];
  seasonComplete: boolean;
  isCommish: boolean;
  paymentsDevMode: boolean;
  payoutsExecuted: boolean;
  onReview: () => void;
  onSettings: () => void;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const isSynced = active.type === 'synced';
  const structureLabel = payoutTemplateLabel(payoutTemplate);
  const prizePool = collected;
  const hasLiveNames = payoutSlots.some((slot) => slot.ownerName || slot.teamName);

  const { data: standingsData, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', active.id, 'payout-pane'],
    queryFn: () => fetchLeagueStandings(active.id),
    enabled: isSynced,
  });

  const { data: mates } = useLeagueMates(active.id, isSynced);

  const projectionRows = useMemo(() => {
    const standings = standingsData?.standings ?? [];
    const rows = buildPayoutProjectionRows(payoutPreview, payoutSlots, members, standings);

    if (!mates?.length) return rows;

    const avatarByTeam = new Map(mates.map((mate) => [mate.id, mate.avatarUrl]));
    const avatarByUser = new Map(mates.map((mate) => [mate.userId, mate.avatarUrl]));

    return rows.map((row) => {
      const member = members.find((m) => m.name === row.name || m.teamName === row.teamName);
      const avatarUrl =
        row.avatarUrl ??
        (member?.providerTeamId ? avatarByTeam.get(member.providerTeamId) ?? null : null) ??
        (member?.ownerExternalId ? avatarByUser.get(member.ownerExternalId) ?? null : null);

      return avatarUrl ? { ...row, avatarUrl } : row;
    });
  }, [payoutPreview, payoutSlots, members, standingsData?.standings, mates]);

  const currentWeek = standingsData?.currentWeek;
  const liveSubtitle = seasonComplete
    ? 'Final standings'
    : currentWeek
      ? `Week ${currentWeek} standings`
      : hasLiveNames
        ? 'Live standings'
        : 'Updates with standings';

  return (
    <>
      <Section
        title="Prize structure"
        action={
          isCommish ? (
            <Pressable onPress={onSettings}>
              <Text variant="captionSuccess">Edit</Text>
            </Pressable>
          ) : undefined
        }
      >
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">Split</Text>
            <Text variant="body">{structureLabel}</Text>
          </View>
          <View style={[layout.rowBetween, layout.listRowBorder, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">Collected dues</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>
              ${collected.toLocaleString()}
            </Text>
          </View>
          <View style={[layout.rowBetween, layout.listRowBorder, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">Processing fees</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>
              ${fee.toLocaleString()}
            </Text>
          </View>
          <View style={[layout.rowBetween, layout.listRowBorder, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">Prize pool</Text>
            <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>
              ${prizePool.toLocaleString()}
            </Text>
          </View>
          <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">Funding</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>
              {paidCount}/{memberCount} paid
            </Text>
          </View>
        </View>
      </Section>

      <Section
        title={seasonComplete ? 'Final payouts' : 'Live payout projection'}
        action={<Text variant="eyebrow">{liveSubtitle}</Text>}
      >
        {standingsLoading && isSynced ? (
          <View style={[surfaces.roundedCard, layout.centered, { padding: 28, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
            <ActivityIndicator color={hex.foreground} />
            <Text variant="bodyMuted" style={{ marginTop: 12 }}>
              Loading standings…
            </Text>
          </View>
        ) : projectionRows.length ? (
          <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
            {projectionRows.map((row, i) => (
              <PayoutProjectionRow key={row.place} row={row} isFirst={i === 0} />
            ))}
            <View style={[layout.rowStart, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hex.hairline, paddingHorizontal: 16, paddingVertical: 12 }]}>
              <CircleDot size={12} color={c.mutedForeground} style={{ marginTop: 2 }} />
              <Text variant="caption" muted style={[layout.flex1, { lineHeight: 16 }]}>
                {seasonComplete
                  ? 'Amounts lock to final standings. Commissioner review distributes winnings.'
                  : payoutsExecuted
                    ? 'Payouts were already recorded for this league.'
                    : isSynced
                      ? 'Projected winners and amounts update as standings change each week.'
                      : 'Connect a synced league to map payouts to live standings automatically.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[surfaces.roundedCard, { padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
            <Text variant="bodyMuted">Payout preview will appear once the prize pool and structure are set.</Text>
          </View>
        )}
      </Section>

      {payoutPreview.length ? (
        <Section title="Payout slots">
          <View style={[layout.rowWrap, { gap: 8 }]}>
            {payoutPreview.map((slot) => (
              <View
                key={slot.place}
                style={[
                  surfaces.roundedCard,
                  {
                    width: payoutPreview.length <= 2 ? '48%' : '31%',
                    padding: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: `${trophyAccent(slot.place, hex)}59`,
                    backgroundColor: `${trophyAccent(slot.place, hex)}14`,
                  },
                ]}
              >
                <View style={layout.rowBetween}>
                  <Trophy size={16} color={trophyAccent(slot.place, hex)} />
                  <Text variant="eyebrow">{formatPayoutPlace(slot.place)}</Text>
                </View>
                <Text variant="sectionTitle" style={{ marginTop: 12, fontSize: 22, fontVariant: ['tabular-nums'] }}>
                  ${(slot.amountCents / 100).toLocaleString()}
                </Text>
                <Text variant="caption" muted>
                  {slot.percent}% of pool
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {ledgerActivity.length ? (
        <Section title="Treasury activity">
          <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
            {ledgerActivity.slice(0, 5).map((entry, i) => (
              <View
                key={entry.id}
                style={[
                  layout.rowBetween,
                  { alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
                  i > 0 && layout.listRowBorder,
                ]}
              >
                <View style={[layout.flex1, { minWidth: 0, gap: 4 }]}>
                  <Text variant="body" numberOfLines={2}>
                    {entry.title}
                  </Text>
                  <Text variant="caption" muted>
                    {new Date(entry.when).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View
                  style={[
                    surfaces.pill,
                    {
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      backgroundColor:
                        entry.type === 'payout' ? toneBg.success : entry.type === 'buy_in' ? toneBg.warning : hex.muted,
                    },
                  ]}
                >
                  <Text variant="eyebrow" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                    {entry.type.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Payout status">
        <View style={[surfaces.roundedCard, { padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          {payoutsExecuted ? (
            <>
              <View style={[layout.row, { gap: 8 }]}>
                <CheckCircle2 size={12} color={c.success} />
                <Text variant="eyebrow">Payouts distributed</Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }}>
                Winnings were recorded in the treasury ledger. Members can see payout activity above.
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
                <Pressable
                  onPress={onReview}
                  style={[
                    layout.row,
                    {
                      marginTop: 16,
                      gap: 6,
                      alignSelf: 'flex-start',
                      borderRadius: 9999,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: hex.surfaceElevated,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: hex.hairline,
                    },
                  ]}
                >
                  <Text variant="button">Review payouts</Text>
                  <ChevronRight size={14} color={c.foreground} />
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <View style={[layout.row, { gap: 8 }]}>
                <CircleDot size={12} color={c.mutedForeground} />
                <Text variant="eyebrow">Waiting for season completion</Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }}>
                Payouts distribute automatically after the final week of the playoffs. No action needed.
              </Text>
              <View style={[layout.row, { marginTop: 16, gap: 8 }]}>
                {['Season', 'Review', 'Payout'].map((step, i) => (
                  <View
                    key={step}
                    style={[
                      layout.flex1,
                      layout.centered,
                      {
                        borderRadius: 16,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: hex.hairline,
                        backgroundColor: hex.surfaceElevated,
                        paddingVertical: 10,
                      },
                    ]}
                  >
                    <Text variant="eyebrow" style={{ fontSize: 10 }}>
                      {step}
                    </Text>
                    <Text variant="caption" style={{ marginTop: 4, fontWeight: '600' }}>
                      {i === 0 ? 'In progress' : '—'}
                    </Text>
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

function PayoutProjectionRow({ row, isFirst }: { row: PayoutProjectionRow; isFirst: boolean }) {
  const { hex, layout, surfaces, toneBg } = useThemeTokens();
  const accent = trophyAccent(row.place, hex);

  return (
    <View
      style={[
        layout.row,
        { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
        !isFirst && layout.listRowBorder,
      ]}
    >
      <View
        style={[
          layout.centered,
          {
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: `${accent}59`,
            backgroundColor: `${accent}14`,
          },
        ]}
      >
        <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'], color: accent, fontWeight: '600' }}>
          {row.place}
        </Text>
      </View>
      <AvatarImage
        src={personAvatar(row.avatarSeed, row.avatarUrl ?? undefined)}
        name={row.name}
        size={44}
      />
      <View style={[layout.flex1, { minWidth: 0, gap: 3 }]}>
        <Text variant="body" numberOfLines={1}>
          {row.name}
          {row.isMe ? (
            <Text variant="eyebrow" style={{ textTransform: 'none' }}>
              {' '}
              · You
            </Text>
          ) : null}
        </Text>
        <Text variant="bodyMuted" numberOfLines={1}>
          {row.teamName && row.teamName !== row.name ? `${row.teamName} · ` : ''}
          {row.record ? `${row.record}${row.pointsFor != null ? ` · ${row.pointsFor.toFixed(1)} pts` : ''}` : row.placeLabel}
          {!row.isAppMember ? ' · Not in app' : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>
          ${row.amount.toLocaleString()}
        </Text>
        <View style={[surfaces.pill, { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: toneBg.success }]}>
          <Text variant="eyebrow" style={{ color: hex.success, fontSize: 10 }}>
            {row.pct}%
          </Text>
        </View>
      </View>
    </View>
  );
}

function MemberPaymentRow({
  member,
  isFirst,
  canReset,
  onReset,
}: {
  member: Member;
  isFirst: boolean;
  canReset?: boolean;
  onReset?: () => void;
}) {
  const { hex, layout, surfaces, toneBg } = useThemeTokens();
  const isPaid = member.status === 'paid';
  const avatarSeed = member.ownerExternalId ?? member.providerTeamId ?? member.id;

  return (
    <View
      style={[
        layout.row,
        {
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 18,
        },
        !isFirst && layout.listRowBorder,
      ]}
    >
      <AvatarImage
        src={personAvatar(avatarSeed + member.name, member.avatarUrl ?? undefined)}
        name={member.name}
        size={48}
      />
      <View style={[layout.flex1, { minWidth: 0 }]}>
        <Text variant="body" numberOfLines={1} style={{ fontSize: 16 }}>
          {member.name}
          {member.isMe ? (
            <Text variant="eyebrow" style={{ textTransform: 'none' }}>
              {' '}
              · You
            </Text>
          ) : null}
        </Text>
        {canReset && onReset ? (
          <Pressable onPress={onReset} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
            <Text variant="captionSuccess">Reset to unpaid</Text>
          </Pressable>
        ) : null}
      </View>
      <View
        style={[
          surfaces.pill,
          {
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isPaid ? toneBg.success : toneBg.danger,
          },
        ]}
      >
        <Text
          variant="eyebrow"
          style={{
            color: isPaid ? hex.success : hex.danger,
            textTransform: 'capitalize',
            letterSpacing: 0.5,
          }}
        >
          {isPaid ? 'Paid' : 'Unpaid'}
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------ PAYMENT PAGE ------------------------------ */
function PaymentPage({
  buyIn,
  platformFee,
  devMode,
  onComplete,
}: {
  buyIn: number;
  platformFee: number;
  devMode?: boolean;
  onComplete: () => Promise<void>;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const [processing, setProcessing] = useState(false);
  const total = buyIn + platformFee;

  const submit = async () => {
    setProcessing(true);
    try {
      await onComplete();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={layout.screenStack}>
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 6 }}>
        <Text variant="eyebrow" muted style={{ letterSpacing: 1.2 }}>
          Total due
        </Text>
        <Text
          style={{
            fontSize: 44,
            fontWeight: '600',
            letterSpacing: -1,
            fontVariant: ['tabular-nums'],
            color: hex.foreground,
          }}
        >
          ${total.toLocaleString()}
        </Text>
      </View>

      <Section title="Breakdown">
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">League buy-in</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>
              ${buyIn.toLocaleString()}
            </Text>
          </View>
          <View style={[layout.rowBetween, layout.listRowBorder, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="bodyMuted">Processing fee (5%)</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>
              ${platformFee.toLocaleString()}
            </Text>
          </View>
        </View>
      </Section>

      <Pressable
        onPress={submit}
        disabled={processing}
        style={{
          marginTop: 8,
          borderRadius: 999,
          backgroundColor: hex.foreground,
          paddingVertical: 18,
          alignItems: 'center',
          opacity: processing ? 0.5 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 3,
        }}
      >
        <Text variant="button" style={{ color: hex.background, fontSize: 17 }}>
          {processing ? 'Processing…' : `Pay $${total.toLocaleString()}`}
        </Text>
      </Pressable>

      {devMode ? (
        <Text variant="caption" muted style={{ textAlign: 'center', lineHeight: 16 }}>
          Dev mode — payment records instantly with no card.
        </Text>
      ) : null}
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
  payoutSlots,
  members,
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
  payoutSlots: TreasuryPayoutSlot[];
  members: Member[];
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
    if (payoutSlots.length) {
      return payoutSlots.map((slot) => ({
        place: `${slot.place}${slot.place === 1 ? 'st' : slot.place === 2 ? 'nd' : slot.place === 3 ? 'rd' : 'th'}`,
        name: slot.ownerName ?? slot.teamName ?? `Place ${slot.place}`,
        pct: slot.percent,
        amount: slot.amountCents / 100,
      }));
    }

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
      };
    });
  }, [payoutSlots, standingsData?.standings, splits, payoutPreview]);

  const handleApprove = async () => {
    const standings = standingsData?.standings ?? [];
    if (!standings.length) {
      Alert.alert('No standings', 'Standings are required before payouts can be distributed.');
      return;
    }

    const payload: Array<{ place: number; userId: string; teamName?: string }> = [];
    for (const s of standings.slice(0, splits.length)) {
      const slot = payoutSlots.find((p) => p.place === s.rank);
      const rosterMember = members.find((m) => m.providerTeamId === s.teamExternalId);
      const userId = rosterMember?.userId ?? slot?.userId;
      if (!userId) continue;
      payload.push({
        place: s.rank,
        userId,
        teamName: s.teamName ?? s.ownerName ?? rosterMember?.teamName ?? undefined,
      });
    }

    if (payload.length === 0) {
      Alert.alert('No app members to pay', 'Winners must join the league in the app before payouts can be recorded.');
      return;
    }

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
    <View style={layout.screenStack}>
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
        style={[surfaces.primaryButton, { backgroundColor: approved ? hex.success : hex.foreground, opacity: approved || executing ? 0.7 : 1 }]}
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
    <View style={layout.screenStack}>
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
              <SegmentedTabLabel active={reminder === o.id}>{o.label}</SegmentedTabLabel>
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
        style={[surfaces.primaryButton, { opacity: saving ? 0.5 : 1 }]}
      >
        <Text variant="body" style={{ color: hex.background }}>{saving ? 'Saving…' : 'Save treasury settings'}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------ ATOMS ------------------------------ */
function TreasuryBar({ onBack, showBack }: { onBack: () => void; showBack: boolean }) {
  if (!showBack) return null;
  return (
    <View style={{ paddingHorizontal: 4, paddingTop: 8, marginBottom: 8 }}>
      <BackButton onPress={onBack} variant="muted" />
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
