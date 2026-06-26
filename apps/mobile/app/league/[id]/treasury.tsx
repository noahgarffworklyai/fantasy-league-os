import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { startBuyInCheckout } from '@/lib/checkout';
import { api } from '@/lib/api';
import { colors, formatCents } from '@/lib/theme';

export default function TreasuryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['treasury', id],
    queryFn: () => api.get(`/leagues/${id}/treasury`),
    enabled: !!id,
  });

  const leagueQuery = useQuery({
    queryKey: ['league', id],
    queryFn: () =>
      api.get<{ membership?: { role: string } }>(`/leagues/${id}`),
    enabled: !!id,
  });

  const isCommissioner = leagueQuery.data?.membership?.role === 'commissioner';

  const payMutation = useMutation({
    mutationFn: () => startBuyInCheckout(id!),
    onSuccess: (result) => {
      if (result.ok) {
        Alert.alert('Payment complete');
        refetch();
        return;
      }
      if (result.reason === 'cancelled') {
        Alert.alert('Payment cancelled');
        return;
      }
      Alert.alert('Payment failed', 'Please try again.');
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Payment failed'),
  });

  const onboardMutation = useMutation({
    mutationFn: () => api.post<{ url: string }>(`/leagues/${id}/treasury/onboard`),
    onSuccess: (res) => Linking.openURL(res.url),
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const standings = await api.get<{
        standings: Array<{ rank: number; teamExternalId: string }>;
      }>(`/leagues/${id}/standings`);
      const treasury = data as {
        payoutPreview: Array<{ place: number }>;
        members: Array<{
          userId: string;
          displayName: string;
          teamName?: string;
          providerTeamId?: string;
          paid: boolean;
        }>;
      };
      const paidMembers = treasury.members.filter((m) => m.paid);
      const places = treasury.payoutPreview.length;

      const standingsPayload = standings.standings.slice(0, places).map((s, index) => {
        const member =
          paidMembers.find((m) => m.providerTeamId === s.teamExternalId) ??
          paidMembers[index];
        if (!member) throw new Error('Not enough paid members for payout');
        return {
          place: index + 1,
          userId: member.userId,
          teamName: member.teamName ?? member.displayName,
        };
      });

      return api.post<{ payouts: Array<{ place: number; amountCents: number }> }>(
        `/leagues/${id}/payouts/execute`,
        { standings: standingsPayload },
      );
    },
    onSuccess: (res: { payouts: Array<{ place: number; amountCents: number }> }) => {
      const summary = res.payouts
        .map((p) => `${p.place}${p.place === 1 ? 'st' : p.place === 2 ? 'nd' : p.place === 3 ? 'rd' : 'th'}: ${formatCents(p.amountCents)}`)
        .join('\n');
      Alert.alert('Payouts executed', summary);
      refetch();
    },
    onError: (e) => Alert.alert('Payout failed', e instanceof Error ? e.message : 'Unknown error'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const treasury = data as {
    potCents: number;
    buyInCents: number;
    platformFeeCents: number;
    paidMemberCount: number;
    totalMemberCount: number;
    payoutPreview: Array<{ place: number; percent: number; amountCents: number }>;
    stripeConnectOnboarded: boolean;
    members: Array<{ displayName: string; paid: boolean; teamName?: string }>;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.potCard}>
        <Text style={styles.potLabel}>League Pot</Text>
        <Text style={styles.potValue}>{formatCents(treasury.potCents)}</Text>
        <Text style={styles.potMeta}>
          {treasury.paidMemberCount}/{treasury.totalMemberCount} paid
        </Text>
      </View>

      <Text style={styles.section}>Payout Structure</Text>
      {treasury.payoutPreview.map((p) => (
        <View key={p.place} style={styles.row}>
          <Text style={styles.rowLabel}>
            {p.place}{p.place === 1 ? 'st' : p.place === 2 ? 'nd' : p.place === 3 ? 'rd' : 'th'} ({p.percent}%)
          </Text>
          <Text style={styles.rowValue}>{formatCents(p.amountCents)}</Text>
        </View>
      ))}

      <Text style={styles.section}>Members</Text>
      <FlatList
        data={treasury.members}
        keyExtractor={(m) => m.displayName}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberName}>{item.displayName}</Text>
            <Text style={item.paid ? styles.paid : styles.unpaid}>
              {item.paid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        )}
      />

      <Pressable
        style={styles.button}
        onPress={() => payMutation.mutate()}
        disabled={payMutation.isPending}
      >
        {payMutation.isPending ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>
            Pay Buy-in {formatCents(treasury.buyInCents + treasury.platformFeeCents)}
          </Text>
        )}
      </Pressable>

      {!treasury.stripeConnectOnboarded && isCommissioner && (
        <Pressable style={styles.secondaryBtn} onPress={() => onboardMutation.mutate()}>
          <Text style={styles.secondaryText}>Commissioner: Setup Stripe Connect</Text>
        </Pressable>
      )}

      {isCommissioner && treasury.potCents > 0 && (
        <Pressable
          style={styles.payoutBtn}
          onPress={() =>
            Alert.alert(
              'Execute season payouts?',
              'This distributes the league pot according to current standings and your payout template.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Execute', onPress: () => payoutMutation.mutate() },
              ],
            )
          }
          disabled={payoutMutation.isPending}
        >
          {payoutMutation.isPending ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>Execute Season Payouts</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  potCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  potLabel: { color: colors.textMuted },
  potValue: { fontSize: 36, fontWeight: '800', color: colors.primary, marginTop: 8 },
  potMeta: { color: colors.textMuted, marginTop: 8 },
  section: { color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 12, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: colors.textMuted },
  rowValue: { color: colors.text, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberName: { color: colors.text },
  paid: { color: colors.primary, fontWeight: '600' },
  unpaid: { color: colors.warning, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: colors.bg, fontWeight: '700' },
  secondaryBtn: { marginTop: 12, padding: 12, alignItems: 'center' },
  secondaryText: { color: colors.primary },
  payoutBtn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
