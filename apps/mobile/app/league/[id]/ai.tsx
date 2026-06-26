import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function AiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [playerId, setPlayerId] = useState('');
  const [result, setResult] = useState<string>('');

  const doctorMutation = useMutation({
    mutationFn: () => api.post('/ai/doctor', { playerId, leagueId: id }),
    onSuccess: (res) => setResult(JSON.stringify(res, null, 2)),
  });

  const waiverMutation = useMutation({
    mutationFn: () => api.post('/ai/waiver', { leagueId: id }),
    onSuccess: (res) => setResult(JSON.stringify(res, null, 2)),
  });

  const loading = doctorMutation.isPending || waiverMutation.isPending;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI Fantasy Intelligence</Text>

      <Text style={styles.section}>Fantasy Doctor</Text>
      <TextInput
        style={styles.input}
        placeholder="Player ID"
        placeholderTextColor={colors.textMuted}
        value={playerId}
        onChangeText={setPlayerId}
      />
      <Pressable style={styles.button} onPress={() => doctorMutation.mutate()} disabled={loading}>
        <Text style={styles.buttonText}>Analyze Injury</Text>
      </Pressable>

      <Text style={styles.section}>Waiver Assistant</Text>
      <Pressable style={styles.button} onPress={() => waiverMutation.mutate()} disabled={loading}>
        <Text style={styles.buttonText}>Get Waiver Picks</Text>
      </Pressable>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

      {result ? (
        <View style={styles.result}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 24 },
  section: { color: colors.text, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.bg, fontWeight: '700' },
  result: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultText: { color: colors.text, fontFamily: 'monospace', fontSize: 12 },
});
