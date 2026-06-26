import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function MatchupsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['matchups', id],
    queryFn: () =>
      api.get<{
        week: number;
        matchups: Array<{
          homeTeamExternalId: string;
          awayTeamExternalId: string;
          homeScore?: number;
          awayScore?: number;
        }>;
      }>(`/leagues/${id}/matchups`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data?.matchups ?? []}
      keyExtractor={(_, i) => String(i)}
      ListHeaderComponent={
        <Text style={styles.weekHeader}>Week {data?.week ?? 1}</Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>No matchups synced yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.teamRow}>
            <Text style={styles.team}>{item.homeTeamExternalId}</Text>
            <Text style={styles.score}>{item.homeScore ?? '-'}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.teamRow}>
            <Text style={styles.team}>{item.awayTeamExternalId}</Text>
            <Text style={styles.score}>{item.awayScore ?? '-'}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  weekHeader: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  team: { color: colors.text, fontWeight: '600', flex: 1 },
  score: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  vs: { color: colors.textMuted, textAlign: 'center', marginVertical: 4 },
});
