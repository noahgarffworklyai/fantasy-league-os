import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PAYOUT_TEMPLATES } from '@flos/shared';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [buyIn, setBuyIn] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const [payoutTemplate, setPayoutTemplate] = useState('standard');
  const [draftDate, setDraftDate] = useState('');
  const [customRules, setCustomRules] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['league', id],
    queryFn: () => api.get(`/leagues/${id}`),
    enabled: !!id,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post(`/leagues/${id}/sync`),
    onSuccess: () => {
      Alert.alert('Sync started');
      queryClient.invalidateQueries({ queryKey: ['league', id] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/leagues/${id}/settings`, {
        buyInCents: buyIn ? Math.round(parseFloat(buyIn) * 100) : undefined,
        platformFeeCents: platformFee ? Math.round(parseFloat(platformFee) * 100) : undefined,
        payoutTemplate,
        draftDate: draftDate ? new Date(draftDate).toISOString() : undefined,
        customRules: customRules || undefined,
      }),
    onSuccess: () => Alert.alert('Settings saved'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const league = (data as {
    league: {
      buyInCents: number;
      platformFeeCents: number;
      payoutTemplate: string;
      draftDate?: string | null;
      customRules?: string;
    };
  }).league;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Buy-in ($)</Text>
      <TextInput
        style={styles.input}
        placeholder={String(league.buyInCents / 100)}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        value={buyIn}
        onChangeText={setBuyIn}
      />

      <Text style={styles.label}>Platform fee ($)</Text>
      <TextInput
        style={styles.input}
        placeholder={String(league.platformFeeCents / 100)}
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        value={platformFee}
        onChangeText={setPlatformFee}
      />

      <Text style={styles.label}>Payout structure</Text>
      <View style={styles.templateRow}>
        {Object.entries(PAYOUT_TEMPLATES).map(([key, tpl]) => (
          <Pressable
            key={key}
            style={[
              styles.templateBtn,
              (payoutTemplate || league.payoutTemplate) === key && styles.templateActive,
            ]}
            onPress={() => setPayoutTemplate(key)}
          >
            <Text
              style={[
                styles.templateText,
                (payoutTemplate || league.payoutTemplate) === key && styles.templateTextActive,
              ]}
            >
              {tpl.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Draft date</Text>
      <TextInput
        style={styles.input}
        placeholder={
          league.draftDate
            ? new Date(league.draftDate).toISOString().slice(0, 10)
            : 'YYYY-MM-DD'
        }
        placeholderTextColor={colors.textMuted}
        value={draftDate}
        onChangeText={setDraftDate}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Custom rules</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder={league.customRules ?? 'League rules...'}
        placeholderTextColor={colors.textMuted}
        multiline
        value={customRules}
        onChangeText={setCustomRules}
      />

      <Pressable style={styles.button} onPress={() => saveMutation.mutate()}>
        <Text style={styles.buttonText}>Save Settings</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => syncMutation.mutate()}>
        <Text style={styles.secondaryText}>Refresh league data</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  label: { color: colors.textMuted, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: colors.bg, fontWeight: '700' },
  secondaryBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  secondaryText: { color: colors.primary },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  templateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateActive: { borderColor: colors.primary, backgroundColor: '#14532d33' },
  templateText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  templateTextActive: { color: colors.primary },
});
