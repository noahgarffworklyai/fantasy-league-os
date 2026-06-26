import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { confirmCheckoutSession } from '@/lib/checkout';
import { colors } from '@/lib/theme';

export default function PaymentSuccessScreen() {
  const { leagueId, session_id } = useLocalSearchParams<{
    leagueId?: string;
    session_id?: string;
  }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function verify() {
      if (!session_id) {
        if (leagueId) {
          router.replace(`/league/${leagueId}`);
          return;
        }
        setError('Missing payment session');
        return;
      }

      try {
        const status = await confirmCheckoutSession(session_id);
        if (!active) return;

        if (status.paid) {
          router.replace(`/league/${status.leagueId}`);
          return;
        }

        setError('Payment not completed yet. Pull to refresh treasury in a moment.');
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Could not verify payment');
        }
      }
    }

    verify();
    return () => {
      active = false;
    };
  }, [leagueId, router, session_id]);

  return (
    <View style={styles.container}>
      {!error ? (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.text}>Confirming payment...</Text>
        </>
      ) : (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: { color: colors.textMuted, marginTop: 16 },
  error: { color: colors.warning, textAlign: 'center', lineHeight: 22 },
});
