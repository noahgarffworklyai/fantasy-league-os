import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { startBuyInCheckout } from '@/lib/checkout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { colors, formatCents } from '@/lib/theme';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const previewQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api.get(`/invites/${token}`),
    enabled: !!token,
  });

  const redeemMutation = useMutation({
    mutationFn: () =>
      api.post<{ leagueId: string; requiresPayment?: boolean }>('/invites/redeem', { token }),
    onSuccess: async (res) => {
      if (res.requiresPayment) {
        const payment = await startBuyInCheckout(res.leagueId);
        if (payment.ok) {
          router.replace(`/league/${res.leagueId}`);
          return;
        }
        if (payment.reason === 'cancelled') {
          Alert.alert('Payment cancelled', 'Join the league again when you are ready to pay.');
          return;
        }
        Alert.alert('Payment failed', 'Please try again.');
        return;
      }
      router.replace(`/league/${res.leagueId}`);
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Failed to join'),
  });

  if (previewQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const preview = previewQuery.data as {
    leagueName: string;
    buyInCents: number;
    platformFeeCents: number;
    memberCount: number;
  };

  const total = preview.buyInCents + preview.platformFeeCents;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{preview.leagueName}</Text>
      <Text style={styles.meta}>{preview.memberCount} members joined</Text>

      <View style={styles.card}>
        <Row label="Buy-in" value={formatCents(preview.buyInCents)} />
        <Row label="Platform fee" value={formatCents(preview.platformFeeCents)} />
        <Row label="Total" value={formatCents(total)} bold />
      </View>

      {!user ? (
        <Text style={styles.hint}>Sign in to join this league</Text>
      ) : (
        <Pressable
          style={styles.button}
          onPress={() => redeemMutation.mutate()}
          disabled={redeemMutation.isPending}
        >
          {redeemMutation.isPending ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>Join & Pay {formatCents(total)}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 12, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted },
  rowValue: { color: colors.text },
  bold: { fontWeight: '800', color: colors.primary },
  hint: { color: colors.textMuted, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
});
