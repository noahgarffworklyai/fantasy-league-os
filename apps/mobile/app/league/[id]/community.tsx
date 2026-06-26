import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
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
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

type Tab = 'polls' | 'awards' | 'rankings' | 'recap';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('rankings');
  const queryClient = useQueryClient();

  const leagueQuery = useQuery({
    queryKey: ['league', id],
    queryFn: () =>
      api.get<{ membership?: { role: string } }>(`/leagues/${id}`),
    enabled: !!id,
  });

  const isCommissioner = leagueQuery.data?.membership?.role === 'commissioner';

  const pollsQuery = useQuery({
    queryKey: ['polls', id],
    queryFn: () =>
      api.get<{
        polls: Array<{
          id: string;
          question: string;
          options: Array<{ id: string; text: string; voteCount: number }>;
          userVoteOptionId?: string | null;
        }>;
      }>(`/leagues/${id}/polls`),
    enabled: !!id && tab === 'polls',
  });

  const awardsQuery = useQuery({
    queryKey: ['awards', id],
    queryFn: () =>
      api.get<{
        awards: Array<{
          id: string;
          week: number;
          title: string;
          description: string;
          winnerTeamName?: string;
        }>;
      }>(`/leagues/${id}/awards`),
    enabled: !!id && tab === 'awards',
  });

  const rankingsQuery = useQuery({
    queryKey: ['rankings', id],
    queryFn: () =>
      api.get<{
        rankings: Array<{
          rank: number;
          teamName: string;
          score: number;
          notes?: string;
        }>;
      }>(`/leagues/${id}/power-rankings`),
    enabled: !!id && tab === 'rankings',
  });

  const [recapWeek, setRecapWeek] = useState('1');
  const recapQuery = useQuery({
    queryKey: ['recap', id, recapWeek],
    queryFn: () =>
      api.get<{ week: number; title: string; content: string }>(
        `/leagues/${id}/recap/${recapWeek}`,
      ),
    enabled: !!id && tab === 'recap',
  });

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [awardWeek, setAwardWeek] = useState('1');
  const [awardTitle, setAwardTitle] = useState('');
  const [awardDescription, setAwardDescription] = useState('');
  const [awardWinner, setAwardWinner] = useState('');

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      api.post(`/polls/${pollId}/vote`, { optionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['polls', id] }),
  });

  const createPollMutation = useMutation({
    mutationFn: () =>
      api.post(`/leagues/${id}/polls`, {
        question: pollQuestion,
        options: pollOptions.filter((o) => o.trim()),
      }),
    onSuccess: () => {
      setPollQuestion('');
      setPollOptions(['', '']);
      queryClient.invalidateQueries({ queryKey: ['polls', id] });
      Alert.alert('Poll created');
    },
  });

  const createAwardMutation = useMutation({
    mutationFn: () =>
      api.post(`/leagues/${id}/awards`, {
        week: Number(awardWeek),
        title: awardTitle,
        description: awardDescription,
        winnerTeamName: awardWinner || undefined,
      }),
    onSuccess: () => {
      setAwardTitle('');
      setAwardDescription('');
      setAwardWinner('');
      queryClient.invalidateQueries({ queryKey: ['awards', id] });
      Alert.alert('Award posted');
    },
  });

  const loading =
    pollsQuery.isLoading ||
    awardsQuery.isLoading ||
    rankingsQuery.isLoading ||
    recapQuery.isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(
          [
            ['rankings', 'Rankings'],
            ['polls', 'Polls'],
            ['awards', 'Awards'],
            ['recap', 'Recap'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === 'rankings' ? (
        <FlatList
          data={rankingsQuery.data?.rankings ?? []}
          keyExtractor={(item) => String(item.rank)}
          ListEmptyComponent={<Text style={styles.empty}>Sync league data to see power rankings.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.rank}>#{item.rank}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.teamName}</Text>
                <Text style={styles.cardMeta}>
                  Score {item.score} · {item.notes}
                </Text>
              </View>
            </View>
          )}
        />
      ) : tab === 'polls' ? (
        <ScrollView>
          {isCommissioner && (
            <View style={styles.compose}>
              <Text style={styles.sectionTitle}>Create poll</Text>
              <TextInput
                style={styles.input}
                placeholder="Question"
                placeholderTextColor={colors.textMuted}
                value={pollQuestion}
                onChangeText={setPollQuestion}
              />
              {pollOptions.map((opt, i) => (
                <TextInput
                  key={i}
                  style={styles.input}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  value={opt}
                  onChangeText={(text) => {
                    const next = [...pollOptions];
                    next[i] = text;
                    setPollOptions(next);
                  }}
                />
              ))}
              <Pressable
                style={styles.linkBtn}
                onPress={() => setPollOptions([...pollOptions, ''])}
              >
                <Text style={styles.linkText}>+ Add option</Text>
              </Pressable>
              <Pressable
                style={styles.button}
                onPress={() => createPollMutation.mutate()}
                disabled={createPollMutation.isPending}
              >
                <Text style={styles.buttonText}>Create Poll</Text>
              </Pressable>
            </View>
          )}

          {(pollsQuery.data?.polls ?? []).map((poll) => (
            <View key={poll.id} style={styles.card}>
              <Text style={styles.cardTitle}>{poll.question}</Text>
              {poll.options.map((opt) => {
                const total = poll.options.reduce((s, o) => s + o.voteCount, 0);
                const pct = total ? Math.round((opt.voteCount / total) * 100) : 0;
                const voted = poll.userVoteOptionId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.pollOption, voted && styles.pollOptionVoted]}
                    onPress={() => voteMutation.mutate({ pollId: poll.id, optionId: opt.id })}
                  >
                    <Text style={styles.pollText}>{opt.text}</Text>
                    <Text style={styles.pollPct}>{pct}% ({opt.voteCount})</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : tab === 'awards' ? (
        <ScrollView>
          {isCommissioner && (
            <View style={styles.compose}>
              <Text style={styles.sectionTitle}>Give award</Text>
              <TextInput
                style={styles.input}
                placeholder="Week"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={awardWeek}
                onChangeText={setAwardWeek}
              />
              <TextInput
                style={styles.input}
                placeholder="Title (e.g. Boom of the Week)"
                placeholderTextColor={colors.textMuted}
                value={awardTitle}
                onChangeText={setAwardTitle}
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                multiline
                value={awardDescription}
                onChangeText={setAwardDescription}
              />
              <TextInput
                style={styles.input}
                placeholder="Winner team name"
                placeholderTextColor={colors.textMuted}
                value={awardWinner}
                onChangeText={setAwardWinner}
              />
              <Pressable
                style={styles.button}
                onPress={() => createAwardMutation.mutate()}
                disabled={createAwardMutation.isPending}
              >
                <Text style={styles.buttonText}>Post Award</Text>
              </Pressable>
            </View>
          )}

          {(awardsQuery.data?.awards ?? []).map((award) => (
            <View key={award.id} style={styles.card}>
              <Text style={styles.badge}>Week {award.week}</Text>
              <Text style={styles.cardTitle}>{award.title}</Text>
              <Text style={styles.cardMeta}>{award.description}</Text>
              {award.winnerTeamName ? (
                <Text style={styles.winner}>🏆 {award.winnerTeamName}</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView>
          <View style={styles.compose}>
            <Text style={styles.sectionTitle}>Weekly recap</Text>
            <TextInput
              style={styles.input}
              placeholder="Week number"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={recapWeek}
              onChangeText={setRecapWeek}
            />
          </View>
          {recapQuery.data ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{recapQuery.data.title}</Text>
              <Text style={styles.recapContent}>{recapQuery.data.content}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActive: { borderColor: colors.primary, backgroundColor: '#14532d33' },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: colors.primary },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  cardMeta: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  rank: { color: colors.primary, fontWeight: '800', fontSize: 20, marginBottom: 4 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 24 },
  compose: { marginBottom: 16, gap: 8 },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: colors.bg, fontWeight: '700' },
  linkBtn: { padding: 8 },
  linkText: { color: colors.primary, fontWeight: '600' },
  pollOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pollOptionVoted: { borderColor: colors.primary },
  pollText: { color: colors.text, flex: 1 },
  pollPct: { color: colors.textMuted },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  winner: { color: colors.primary, marginTop: 8, fontWeight: '600' },
  recapContent: { color: colors.text, marginTop: 12, lineHeight: 22 },
});
