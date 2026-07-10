import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CreditCard,
  Landmark,
  Lock,
  ShieldCheck,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { AvatarImage } from '@/components/ui/AvatarImage';
import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { PageIntro } from '@/components/ui/PageIntro';
import { Toggle } from '@/components/ui/Toggle';
import { useLeague, type League } from '@/lib/league-context';
import { useAuthStore } from '@/lib/auth-store';
import { startBuyInCheckout } from '@/lib/checkout';
import {
  executePayouts,
  fetchLeagueStandings,
  fetchTreasury,
  payoutTemplateToStructure,
  structureToPayoutTemplate,
  updateTreasurySettings,
  type TreasuryData,
  type TreasuryPayoutSlot,
} from '@/lib/treasury-api';
import { useColors, useTheme, useThemeTokens } from '@/lib/theme';
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
    method: m.paid ? (devMode ? 'Dev mode' : 'Stripe') : undefined,
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
    return mapTreasuryMembers(treasury, currentUserId, active?.role === 'commissioner', treasury.paymentsDevMode);
  }, [treasury, currentUserId, active?.role]);

  if (!active) return null;

  const buyInUsd = treasury ? treasury.buyInCents / 100 : buyIn;
  const platformFeeUsd = buyInUsd > 0 ? processingFeeFromBuyIn(buyInUsd) : 0;
  const collected = treasury ? treasury.potCents / 100 : 0;
  const memberCount = treasury?.totalMemberCount ?? active.size ?? active.members ?? members.length;
  const paidCount = treasury?.paidMemberCount ?? members.filter((m) => m.status === 'paid').length;
  const totalDue = treasury ? buyInUsd * memberCount : buyInUsd * (active.size ?? active.members ?? 12);
  const remaining = Math.max(0, totalDue - collected);
  const fee = treasury ? (treasury.platformFeeCents * treasury.paidMemberCount) / 100 : 0;
  const net = collected - fee;
  const fullyFunded = collected >= totalDue && totalDue > 0;
  const payoutStructure = treasury ? payoutTemplateToStructure(treasury.payoutTemplate) : structure;
  const paymentsDevMode = treasury?.paymentsDevMode ?? false;
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
          <PageIntro title="Treasury" />
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
            paidCount={paidCount}
            memberCount={memberCount}
            platformFee={platformFeeUsd}
            paymentsDevMode={paymentsDevMode}
            onPay={(id) => setView({ kind: 'pay', memberId: id })}
            onReview={() => setView({ kind: 'review' })}
            onSettings={() => setView({ kind: 'settings' })}
            payoutsExecuted={payoutsExecuted}
          />
        ) : null}

        {view.kind === 'pay' ? (
          <PaymentPage
            buyIn={buyInUsd}
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
                  platformFeeCents: platformFeeCentsFromBuyIn(nextBuyIn),
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

const TREASURY_GOLD = '#D4AF37';
const TREASURY_GOLD_RING = 'rgba(212, 175, 55, 0.35)';
const TREASURY_GOLD_FILL = 'rgba(212, 175, 55, 0.12)';
const LIVE_POT_SIZE = 220;

function LivePotCircle({
  amount,
  paidCount,
  totalCount,
}: {
  amount: number;
  paidCount: number;
  totalCount: number;
}) {
  return (
    <View
      style={{
        width: LIVE_POT_SIZE,
        height: LIVE_POT_SIZE,
        borderRadius: LIVE_POT_SIZE / 2,
        borderWidth: 3,
        borderColor: TREASURY_GOLD,
        backgroundColor: TREASURY_GOLD_FILL,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: TREASURY_GOLD,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
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
          borderColor: TREASURY_GOLD_RING,
        }}
      />
      <Text variant="eyebrow" style={{ color: TREASURY_GOLD, letterSpacing: 1.4 }}>
        Live pot
      </Text>
      <Text
        variant="potAmount"
        style={{
          marginTop: 6,
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
          color: TREASURY_GOLD,
        }}
      >
        ${amount.toLocaleString()}
      </Text>
      <Text
        variant="bodySm"
        style={{
          marginTop: 10,
          fontVariant: ['tabular-nums'],
          color: TREASURY_GOLD,
          opacity: 0.85,
        }}
      >
        {paidCount}/{totalCount} paid
      </Text>
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
  paidCount,
  memberCount,
  platformFee,
  paymentsDevMode,
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
  paidCount: number;
  memberCount: number;
  platformFee: number;
  paymentsDevMode: boolean;
  onPay: (id: string) => void;
  onReview: () => void;
  onSettings: () => void;
  payoutsExecuted: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const c = useColors();
  const [tab, setTab] = useState<PotTab>('pot');
  const splits = computeSplits(net, structure);
  const seasonComplete = active.stage === 'offseason';
  const isCommish = active.role === 'commissioner';

  return (
    <>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 28 }}>
        <LivePotCircle amount={collected} paidCount={paidCount} totalCount={memberCount} />
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
        <PotPane
          active={active}
          members={members}
          buyIn={buyIn}
          platformFee={platformFee}
          paymentsDevMode={paymentsDevMode}
          onPay={onPay}
        />
      ) : (
        <PayoutPane
          active={active}
          members={members}
          splits={splits}
          payoutSlots={payoutSlots}
          net={net}
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
            },
          ]}
        >
          <Text variant="eyebrow" style={{ color: toneFg.warning }}>Dev mode · no real charges</Text>
          <Text variant="bodyMuted" style={{ marginTop: 4, lineHeight: 18 }}>
            Payments complete instantly for testing. Leave STRIPE_SECRET_KEY empty on the API.
          </Text>
        </View>
      ) : null}
    </>
  );
}

const PROCESSING_FEE_RATE = 0.05;

function processingFeeFromBuyIn(buyInUsd: number) {
  return Math.round(buyInUsd * 100 * PROCESSING_FEE_RATE) / 100;
}

function platformFeeCentsFromBuyIn(buyInUsd: number) {
  return Math.round(buyInUsd * 100 * PROCESSING_FEE_RATE);
}

function formatDuesAmount(amount: number) {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return `$${amount.toLocaleString()}`;
}

function DuesAmountIndicator({ amount, tone }: { amount: number; tone: 'danger' | 'success' }) {
  const { hex } = useThemeTokens();
  const color = tone === 'danger' ? hex.danger : hex.success;

  return (
    <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'], color }}>
      {formatDuesAmount(amount)}
    </Text>
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

function DuesStatusCard({
  title,
  subtitle,
  amount,
  tone,
  onPress,
}: {
  title: string;
  subtitle: string;
  amount: number;
  tone: 'danger' | 'success';
  onPress?: () => void;
}) {
  const { layout } = useThemeTokens();

  return (
    <DuesCardShell tone={tone} onPress={onPress}>
      <View style={[layout.flex1, { minWidth: 0, gap: 4, paddingRight: 12 }]}>
        <Text variant="body" style={{ fontSize: 16 }}>
          {title}
        </Text>
        <Text variant="bodyMuted" numberOfLines={3}>
          {subtitle}
        </Text>
      </View>
      <DuesAmountIndicator amount={amount} tone={tone} />
    </DuesCardShell>
  );
}

function MyLeagueDuesCard({
  member,
  buyIn,
  platformFee,
  paymentsDevMode,
  onPay,
}: {
  member: Member | undefined;
  buyIn: number;
  platformFee: number;
  paymentsDevMode: boolean;
  onPay: () => void;
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
      <DuesStatusCard
        title="You’re all set"
        subtitle="Your league dues have been paid. You’re ready for the season."
        amount={total}
        tone="success"
      />
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
    <DuesStatusCard
      title="Time to pay your dues"
      subtitle={
        paymentsDevMode
          ? 'Complete your payment and get ready for kickoff. (Dev mode — no charge.)'
          : 'Complete your payment and get ready for kickoff.'
      }
      amount={total}
      tone="danger"
      onPress={onPay}
    />
  );
}

function PotPane({
  active,
  members,
  buyIn,
  platformFee,
  paymentsDevMode,
  onPay,
}: {
  active: League;
  members: Member[];
  buyIn: number;
  platformFee: number;
  paymentsDevMode: boolean;
  onPay: (id: string) => void;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const myMember = members.find((m) => m.isMe);
  const isSynced = active.type === 'synced';
  const { data: mates } = useLeagueMates(active.id, isSynced);

  const membersWithAvatars = useMemo(() => {
    if (!mates?.length) return members;
    const avatarByTeam = new Map(mates.map((mate) => [mate.id, mate.avatarUrl]));
    const avatarByUser = new Map(mates.map((mate) => [mate.userId, mate.avatarUrl]));
    return members.map((member) => ({
      ...member,
      avatarUrl:
        member.avatarUrl ??
        (member.providerTeamId ? avatarByTeam.get(member.providerTeamId) ?? null : null) ??
        (member.ownerExternalId ? avatarByUser.get(member.ownerExternalId) ?? null : null),
    }));
  }, [members, mates]);

  return (
    <>
      <MyLeagueDuesCard
        member={myMember}
        buyIn={buyIn}
        platformFee={platformFee}
        paymentsDevMode={paymentsDevMode}
        onPay={() => {
          if (myMember) onPay(myMember.id);
        }}
      />

      <Section title="Member payments">
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          {membersWithAvatars.map((m, i) => (
            <MemberPaymentRow key={m.id} member={m} isFirst={i === 0} />
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
  payoutSlots,
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
  payoutSlots: TreasuryPayoutSlot[];
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

  const projectionRows = payoutSlots.length
    ? payoutSlots.map((slot, i) => ({
        place: splits[i]?.place ?? `${slot.place}${slot.place === 1 ? 'st' : slot.place === 2 ? 'nd' : slot.place === 3 ? 'rd' : 'th'}`,
        name: slot.ownerName ?? slot.teamName ?? `Place ${slot.place}`,
        teamName: slot.teamName,
        pct: slot.percent,
        amount: slot.amountCents / 100,
        isMe: members.some((m) => m.isMe && m.userId && m.userId === slot.userId),
      }))
    : splits.map((s, i) => {
        const m = members[i];
        return {
          place: s.place,
          name: m?.isMe ? (active.teamName ?? m.name) : m?.name ?? `Place ${i + 1}`,
          teamName: m?.teamName ?? null,
          pct: s.pct,
          amount: s.amount,
          isMe: !!m?.isMe,
        };
      });

  return (
    <>
      <Section title={seasonComplete ? 'Final payouts' : 'Live payout projection'} action={<Text variant="eyebrow">{seasonComplete ? 'Final' : 'Updates weekly'}</Text>}>
        <View style={[surfaces.roundedCard, { borderWidth: StyleSheet.hairlineWidth, borderColor: hex.hairline }]}>
          <View style={[layout.rowBetween, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: hex.hairline, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <Text variant="bodyMuted">Net prize pool</Text>
            <Text variant="body" style={{ fontVariant: ['tabular-nums'] }}>${net.toLocaleString()}</Text>
          </View>
          {projectionRows.map((row, i) => (
              <View key={row.place} style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }, i > 0 && layout.listRowBorder]}>
                <View style={[layout.iconButtonSm, { width: 36, height: 36 }]}>
                  <Text variant="bodySm" style={{ fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
                </View>
                <View style={[layout.flex1, { minWidth: 0 }]}>
                  <Text variant="body" numberOfLines={1}>
                    {row.name}
                    {row.isMe ? <Text variant="eyebrow" style={{ textTransform: 'none' }}> You</Text> : null}
                  </Text>
                  <Text variant="bodyMuted" numberOfLines={1}>
                    {row.teamName && row.teamName !== row.name ? `${row.teamName} · ` : ''}
                    {row.pct}% of pool · {row.place}
                  </Text>
                </View>
                <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>${row.amount.toLocaleString()}</Text>
              </View>
            ))}
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

function MemberPaymentRow({ member, isFirst }: { member: Member; isFirst: boolean }) {
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
  devMode,
  onComplete,
}: {
  buyIn: number;
  devMode?: boolean;
  onComplete: () => Promise<void>;
}) {
  const { hex, layout, surfaces } = useThemeTokens();
  const c = useColors();
  const [method, setMethod] = useState<'apple' | 'google' | 'card' | 'ach'>('apple');
  const [processing, setProcessing] = useState(false);
  const processingFee = processingFeeFromBuyIn(buyIn);
  const total = buyIn + processingFee;

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
      <DuesStatusCard
        title="Time to pay your dues"
        subtitle={
          devMode
            ? 'Complete your payment and get ready for kickoff. (Dev mode — no charge.)'
            : 'Complete your payment and get ready for kickoff.'
        }
        amount={total}
        tone="danger"
      />

      <Section title="Payment summary">
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
              ${processingFee.toLocaleString()}
            </Text>
          </View>
          <View style={[layout.rowBetween, layout.listRowBorder, { paddingHorizontal: 16, paddingVertical: 14 }]}>
            <Text variant="body">Total due</Text>
            <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>
              ${total.toLocaleString()}
            </Text>
          </View>
        </View>
      </Section>

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
          {processing ? 'Processing…' : devMode ? `Record $${total.toLocaleString()} (dev)` : `Pay $${total.toLocaleString()}`}
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
