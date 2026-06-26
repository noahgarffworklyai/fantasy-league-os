import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LeagueSummary, Provider } from '@flos/shared';
import { PAYOUT_TEMPLATES } from '@flos/shared';
import { api } from '@/lib/api';
import { colors, formatCents } from '@/lib/theme';

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'sleeper', label: 'Sleeper' },
  { id: 'yahoo', label: 'Yahoo' },
  { id: 'espn', label: 'ESPN' },
];

export default function CreateLeagueScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState<Provider>('sleeper');
  const [username, setUsername] = useState('');
  const [espnLeagueId, setEspnLeagueId] = useState('');
  const [espnS2, setEspnS2] = useState('');
  const [espnSwid, setEspnSwid] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<LeagueSummary | null>(null);
  const [buyIn, setBuyIn] = useState('100');
  const [platformFee, setPlatformFee] = useState('5');
  const [payoutTemplate, setPayoutTemplate] = useState('standard');
  const [draftDate, setDraftDate] = useState('');

  const discoverQuery = useQuery({
    queryKey: ['discover', provider, username, espnLeagueId],
    queryFn: async () => {
      if (provider === 'sleeper') {
        const res = await api.get<{ leagues: LeagueSummary[] }>(
          `/imports/sleeper/leagues?username=${encodeURIComponent(username)}`,
        );
        return res.leagues;
      }
      if (provider === 'espn') {
        const res = await api.post<{ leagues: LeagueSummary[] }>('/imports/espn/validate', {
          leagueId: espnLeagueId,
          espnS2,
          swid: espnSwid,
        });
        return res.leagues;
      }
      return [];
    },
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLeague) throw new Error('Select a league');
      const credentials =
        provider === 'sleeper'
          ? { username }
          : provider === 'espn'
            ? { leagueId: espnLeagueId, espnS2, swid: espnSwid }
            : {};

      return api.post<{ league: { id: string } }>('/leagues', {
        provider,
        externalLeagueId: selectedLeague.externalId,
        name: selectedLeague.name,
        season: selectedLeague.season,
        buyInCents: Math.round(parseFloat(buyIn) * 100),
        platformFeeCents: Math.round(parseFloat(platformFee) * 100),
        payoutTemplate,
        draftDate: draftDate ? new Date(draftDate).toISOString() : undefined,
        credentials,
      });
    },
    onSuccess: (res) => {
      router.replace(`/league/${res.league.id}`);
    },
    onError: (e) => {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create league');
    },
  });

  const onDiscover = async () => {
    if (provider === 'sleeper' && !username.trim()) {
      Alert.alert('Enter Sleeper username');
      return;
    }
    if (provider === 'espn' && (!espnLeagueId || !espnS2 || !espnSwid)) {
      Alert.alert('Enter ESPN league ID and cookies');
      return;
    }
    const result = await discoverQuery.refetch();
    if (result.error) {
      Alert.alert(
        'Could not find leagues',
        result.error instanceof Error ? result.error.message : 'Something went wrong',
      );
      return;
    }
    if (!result.data?.length) {
      Alert.alert(
        'No leagues found',
        provider === 'sleeper'
          ? 'Check your Sleeper username. During the off-season, only leagues from the previous NFL season may appear.'
          : 'No leagues matched those credentials.',
      );
      return;
    }
    setStep(2);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step {step} of 3</Text>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.title}>Import from provider</Text>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.providerBtn, provider === p.id && styles.providerActive]}
                onPress={() => setProvider(p.id)}
              >
                <Text style={[styles.providerText, provider === p.id && styles.providerTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {provider === 'sleeper' && (
            <TextInput
              style={styles.input}
              placeholder="Sleeper username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}

          {provider === 'espn' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="ESPN League ID"
                placeholderTextColor={colors.textMuted}
                value={espnLeagueId}
                onChangeText={setEspnLeagueId}
              />
              <TextInput
                style={styles.input}
                placeholder="espn_s2 cookie"
                placeholderTextColor={colors.textMuted}
                value={espnS2}
                onChangeText={setEspnS2}
              />
              <TextInput
                style={styles.input}
                placeholder="SWID cookie"
                placeholderTextColor={colors.textMuted}
                value={espnSwid}
                onChangeText={setEspnSwid}
              />
            </>
          )}

          {provider === 'yahoo' && (
            <Text style={styles.hint}>
              Connect Yahoo via Settings after creating a league, or use the web OAuth flow at
              /auth/yahoo/start on the API.
            </Text>
          )}

          <Pressable style={styles.button} onPress={onDiscover}>
            {discoverQuery.isFetching ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Find Leagues</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.title}>Select league</Text>
          <FlatList
            data={discoverQuery.data ?? []}
            keyExtractor={(item) => item.externalId}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={styles.hint}>
                No leagues found. Go back and try again with your exact Sleeper username.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.leagueCard, selectedLeague?.externalId === item.externalId && styles.leagueSelected]}
                onPress={() => setSelectedLeague(item)}
              >
                <Text style={styles.leagueName}>{item.name}</Text>
                <Text style={styles.leagueMeta}>
                  {item.season} · {item.teamCount ?? '?'} teams
                </Text>
              </Pressable>
            )}
          />
          <Pressable
            style={[styles.button, !selectedLeague && styles.buttonDisabled]}
            disabled={!selectedLeague}
            onPress={() => setStep(3)}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          <Text style={styles.title}>Treasury settings</Text>
          <TextInput
            style={styles.input}
            placeholder="Buy-in ($)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={buyIn}
            onChangeText={setBuyIn}
          />
          <TextInput
            style={styles.input}
            placeholder="Platform fee ($)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={platformFee}
            onChangeText={setPlatformFee}
          />

          <Text style={styles.fieldLabel}>Payout structure</Text>
          <View style={styles.providerRow}>
            {Object.entries(PAYOUT_TEMPLATES).map(([key, tpl]) => (
              <Pressable
                key={key}
                style={[styles.providerBtn, payoutTemplate === key && styles.providerActive]}
                onPress={() => setPayoutTemplate(key)}
              >
                <Text
                  style={[
                    styles.providerText,
                    payoutTemplate === key && styles.providerTextActive,
                  ]}
                >
                  {tpl.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Draft date (YYYY-MM-DD, optional)"
            placeholderTextColor={colors.textMuted}
            value={draftDate}
            onChangeText={setDraftDate}
            autoCapitalize="none"
          />

          <Text style={styles.summary}>
            Members pay {formatCents(Math.round(parseFloat(buyIn || '0') * 100 + parseFloat(platformFee || '0') * 100))} each
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Create League</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  step: { color: colors.textMuted, marginBottom: 8 },
  section: { gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  providerRow: { flexDirection: 'row', gap: 8 },
  providerBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  providerActive: { borderColor: colors.primary, backgroundColor: '#14532d33' },
  providerText: { color: colors.textMuted, fontWeight: '600' },
  providerTextActive: { color: colors.primary },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { color: colors.textMuted, lineHeight: 20 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.bg, fontWeight: '700' },
  leagueCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leagueSelected: { borderColor: colors.primary },
  leagueName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  leagueMeta: { color: colors.textMuted, marginTop: 4 },
  summary: { color: colors.text, fontWeight: '600' },
  fieldLabel: { color: colors.textMuted, marginTop: 4 },
});
