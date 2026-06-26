import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function LeagueHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['league', id],
    queryFn: () => api.get(`/leagues/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const league = (data as { league: { name: string; season: number }; providerLink?: { syncStatus?: string; lastSyncedAt?: string } }).league;
  const link = (data as { providerLink?: { syncStatus?: string; lastSyncedAt?: string } }).providerLink;

  const navItems = [
    { label: 'Treasury', route: `/league/${id}/treasury` },
    { label: 'Standings', route: `/league/${id}/standings` },
    { label: 'Matchups', route: `/league/${id}/matchups` },
    { label: 'Community', route: `/league/${id}/community` },
    { label: 'League Feed', route: `/league/${id}/feed` },
    { label: 'AI Assistant', route: `/league/${id}/ai` },
    { label: 'Invite Members', route: `/league/${id}/invite` },
    { label: 'Settings', route: `/league/${id}/settings` },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{league.name}</Text>
      <Text style={styles.meta}>{league.season} season</Text>
      {link && (
        <Text style={styles.sync}>
          Sync: {link.syncStatus ?? 'pending'}
          {link.lastSyncedAt ? ` · ${new Date(link.lastSyncedAt).toLocaleString()}` : ''}
        </Text>
      )}

      <View style={styles.grid}>
        {navItems.map((item) => (
          <Pressable
            key={item.route}
            style={styles.navCard}
            onPress={() => router.push(item.route as `/league/${string}/treasury`)}
          >
            <Text style={styles.navText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4 },
  sync: { color: colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 24 },
  grid: { gap: 12 },
  navCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
