import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { colors, formatCents } from '@/lib/theme';

type LeagueItem = {
  id: string;
  name: string;
  season: number;
  role: string;
  paid: boolean;
  buyInCents: number;
  platformFeeCents: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => api.get<{ leagues: LeagueItem[] }>('/leagues'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Leagues</Text>
        <Pressable style={styles.createBtn} onPress={() => router.push('/create-league')}>
          <Text style={styles.createBtnText}>+ Create</Text>
        </Pressable>
      </View>

      <FlatList
        data={data?.leagues ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No leagues yet</Text>
            <Text style={styles.emptyText}>
              Create a league or join via invite link to get started.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/league/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.badge}>{item.role}</Text>
            </View>
            <Text style={styles.cardMeta}>
              {item.season} season · Buy-in {formatCents(item.buyInCents)}
            </Text>
            {!item.paid && (
              <Text style={styles.unpaid}>Payment required</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '800', color: colors.text },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: colors.bg, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  cardMeta: { color: colors.textMuted, marginTop: 8 },
  unpaid: { color: colors.warning, marginTop: 8, fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
