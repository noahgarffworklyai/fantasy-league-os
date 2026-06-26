import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function StandingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const leagueQuery = useQuery({
    queryKey: ['league', id],
    queryFn: () =>
      api.get<{
        providerLink?: {
          snapshot?: {
            teams?: Array<{ externalTeamId: string; name: string }>;
          };
        };
      }>(`/leagues/${id}`),
    enabled: !!id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['standings', id],
    queryFn: () => api.get<{ standings: Array<{ rank: number; teamExternalId: string; wins: number; losses: number; pointsFor: number }> }>(`/leagues/${id}/standings`),
    enabled: !!id,
  });

  const teamMap = new Map(
    (leagueQuery.data?.providerLink?.snapshot?.teams ?? []).map((t) => [
      t.externalTeamId,
      t.name,
    ]),
  );

  if (isLoading || leagueQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data?.standings ?? []}
      keyExtractor={(item) => item.teamExternalId}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.rankCol]}>#</Text>
          <Text style={[styles.headerCell, styles.teamCol]}>Team</Text>
          <Text style={styles.headerCell}>W-L</Text>
          <Text style={styles.headerCell}>PF</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={[styles.cell, styles.rankCol]}>{item.rank}</Text>
          <Text style={[styles.cell, styles.teamCol]} numberOfLines={1}>
            {teamMap.get(item.teamExternalId) ?? item.teamExternalId}
          </Text>
          <Text style={styles.cell}>{item.wins}-{item.losses}</Text>
          <Text style={styles.cell}>{item.pointsFor.toFixed(1)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCell: { color: colors.textMuted, fontWeight: '600', flex: 1, textAlign: 'center' },
  cell: { color: colors.text, flex: 1, textAlign: 'center' },
  rankCol: { flex: 0.5 },
  teamCol: { flex: 2, textAlign: 'left' },
});
