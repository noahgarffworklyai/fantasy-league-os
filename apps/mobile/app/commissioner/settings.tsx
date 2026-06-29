import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { Text } from '@/components/ui/primitives';
import { Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import { api } from '@/lib/api';
import { useLeague } from '@/lib/league-context';

export default function SettingsPage() {
  const { active } = useLeague();
  const queryClient = useQueryClient();
  if (!active) return null;
  const synced = active.type === 'synced';
  const isCommish = active.role === 'commissioner';

  const syncMutation = useMutation({
    mutationFn: () => api.post(`/leagues/${active.id}/sync`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['league-tab', active.id] });
      await queryClient.invalidateQueries({ queryKey: ['home-league-stats', active.id] });
      await queryClient.invalidateQueries({ queryKey: ['league-detail', active.id] });
      Alert.alert('Sync complete', 'League data refreshed from your platform.');
    },
    onError: (err) => {
      Alert.alert('Sync failed', err instanceof Error ? err.message : 'Try again.');
    },
  });

  return (
    <WorkflowShell title="Settings" eyebrow="Commissioner">
      <Section title="Account">
        <Row first label="Display Name" value="You" onPress={() => {}} />
        <Row label="Notifications" value="On" onPress={() => {}} />
        <Row label="Appearance" value="System" onPress={() => {}} />
      </Section>

      {synced ? (
        <Section title="Connected Platform">
          <Row first label="Platform" value={active.platform} />
          <Row label="Sync Frequency" value="Every 15 min" onPress={() => {}} />
          <Row label="Imported Settings" sub="Manage in your fantasy host" value="View" />
          {isCommish ? (
            <Row
              label={syncMutation.isPending ? 'Refreshing…' : 'Refresh now'}
              sub="Pull latest rosters, scores, and avatars from Sleeper"
              onPress={() => syncMutation.mutate()}
            />
          ) : (
            <Row
              label="Refresh sync"
              sub="Only your commissioner can trigger a full resync"
            />
          )}
        </Section>
      ) : (
        <Section title="League">
          {isCommish ? (
            <>
              <Row first label="League Name" value={active.name} onPress={() => {}} />
              <Row label="Scoring" value={active.scoring ?? 'Standard PPR'} onPress={() => {}} />
              <Row label="Playoff Settings" value="6 teams · Wks 15–17" onPress={() => {}} />
              <Row label="Draft Settings" value={active.draftType ?? 'Snake'} onPress={() => {}} />
              <Row label="Buy-in" value={active.buyIn ? `$${active.buyIn}` : 'Free'} onPress={() => {}} />
              <Row label="Prize Structure" value="60 / 30 / 10" onPress={() => {}} />
            </>
          ) : (
            <>
              <Row first label="League Name" value={active.name} />
              <Row label="Scoring" value={active.scoring ?? 'Standard PPR'} />
              <Row label="Read only" sub="Only your commissioner can edit league settings." />
            </>
          )}
        </Section>
      )}

      <Section title="Payments">
        <Row first label="Payment Method" value="Apple Pay" onPress={() => {}} />
        <Row label="Payout Method" value="Venmo" onPress={() => {}} />
      </Section>

      {isCommish && !synced ? (
        <Section title="Danger Zone">
          <Row first label="Archive League" sub="Move to history without deleting" onPress={() => {}} />
        </Section>
      ) : null}

      <Text variant="caption" muted style={{ marginTop: 8, textAlign: 'center' }}>
        Commissioner · v1.0
      </Text>
    </WorkflowShell>
  );
}
