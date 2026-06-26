import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

export default function InviteMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const inviteMutation = useMutation({
    mutationFn: () => api.post<{ invite: { deepLink: string; webLink: string; token: string } }>('/invites', { leagueId: id }),
    onSuccess: async (res) => {
      const message = `Join my fantasy league!\n\n${res.invite.deepLink}\n\nOr: ${res.invite.webLink}`;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync('', { dialogTitle: message });
      }
      Alert.alert('Invite created', message);
    },
    onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite League Members</Text>
      <Text style={styles.subtitle}>
        Share an invite link via iMessage. Members tap the link, create an account, and pay their buy-in.
      </Text>

      <Pressable style={styles.button} onPress={() => inviteMutation.mutate()}>
        <Text style={styles.buttonText}>Generate Invite Link</Text>
      </Pressable>

      <Text style={styles.hint}>
        Deep link format: fantasyleagueos://invite/{'{token}'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 12, lineHeight: 22, marginBottom: 32 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.bg, fontWeight: '700', fontSize: 16 },
  hint: { color: colors.textMuted, marginTop: 24, fontSize: 12 },
});
