import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

export default function PaymentCancelScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId?: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment cancelled</Text>
      <Text style={styles.text}>No charge was made. You can try again from the treasury screen.</Text>
      <Pressable
        style={styles.button}
        onPress={() =>
          leagueId ? router.replace(`/league/${leagueId}/treasury`) : router.replace('/(tabs)')
        }
      >
        <Text style={styles.buttonText}>Go back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  text: { color: colors.textMuted, lineHeight: 22 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: colors.bg, fontWeight: '700' },
});
