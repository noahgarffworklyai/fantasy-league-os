import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ComponentType } from 'react';
import { Alert } from 'react-native';
import { Text } from '@/components/ui/primitives';
import { Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import type { EspnSession } from '@/components/EspnLoginWebView';
import { ApiError } from '@flos/shared';
import { api } from '@/lib/api';
import { espnWebViewSupportMessage, isEspnWebViewSupported } from '@/lib/espn-webview';
import { useLeague } from '@/lib/league-context';
import { deleteLeague, leaveLeague, reconnectEspnLeague } from '@/lib/league-api';
import { useNav } from '@/lib/nav';

type EspnLoginWebViewProps = {
  knownLeagueId?: string;
  onClose: () => void;
  onSuccess: (session: EspnSession) => void;
};

type LeagueDetailResponse = {
  providerLink?: {
    externalLeagueId?: string;
    syncStatus?: string | null;
    syncError?: string | null;
  } | null;
};

function apiErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    if (err.body && typeof err.body === 'object' && 'error' in err.body) {
      return String((err.body as { error?: string }).error ?? err.message);
    }
    return err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function SettingsPage() {
  const nav = useNav();
  const { active, refreshLeagues, setActiveId, leagues } = useLeague();
  const queryClient = useQueryClient();
  const [espnLoginOpen, setEspnLoginOpen] = useState(false);
  const [EspnLoginComponent, setEspnLoginComponent] = useState<ComponentType<EspnLoginWebViewProps> | null>(
    null,
  );

  const { data: leagueDetail } = useQuery({
    queryKey: ['league-detail', active?.id],
    queryFn: () => api.get<LeagueDetailResponse>(`/leagues/${active!.id}`),
    enabled: !!active?.id,
  });

  if (!active) return null;
  const synced = active.type === 'synced';
  const isCommish = active.role === 'commissioner';
  const isEspn = active.platform === 'ESPN';
  const externalLeagueId = leagueDetail?.providerLink?.externalLeagueId;
  const syncError = leagueDetail?.providerLink?.syncError;

  const invalidateLeagueQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['league-tab', active.id] }),
      queryClient.invalidateQueries({ queryKey: ['league-detail', active.id] }),
      queryClient.invalidateQueries({ queryKey: ['my-roster', active.id] }),
      refreshLeagues(),
    ]);
  };

  const syncMutation = useMutation({
    mutationFn: () => api.post(`/leagues/${active.id}/sync`),
    onSuccess: async () => {
      await invalidateLeagueQueries();
      Alert.alert('Sync complete', 'League data refreshed from your platform.');
    },
    onError: (err) => {
      Alert.alert('Sync failed', apiErrorMessage(err, 'Try again.'));
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: (session: EspnSession) =>
      reconnectEspnLeague(active.id, { espnS2: session.espnS2, swid: session.swid }),
    onSuccess: async () => {
      setEspnLoginOpen(false);
      await invalidateLeagueQueries();
      Alert.alert('ESPN reconnected', 'Your session was refreshed and league data synced.');
    },
    onError: (err) => {
      setEspnLoginOpen(false);
      Alert.alert('Reconnect failed', apiErrorMessage(err, 'Try again.'));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveLeague(active.id),
    onSuccess: async () => {
      const remaining = leagues.filter((league) => league.id !== active.id);
      await refreshLeagues();
      setActiveId(remaining[0]?.id ?? null);
      nav.replace('/');
      Alert.alert('Left league', 'You are no longer in this league.');
    },
    onError: (err) => {
      Alert.alert('Could not leave', apiErrorMessage(err, 'Try again.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLeague(active.id),
    onSuccess: async () => {
      const remaining = leagues.filter((league) => league.id !== active.id);
      await refreshLeagues();
      setActiveId(remaining[0]?.id ?? null);
      nav.replace('/');
      Alert.alert('League deleted', 'This league was removed for all members.');
    },
    onError: (err) => {
      Alert.alert('Could not delete', apiErrorMessage(err, 'Try again.'));
    },
  });

  const openEspnReconnect = async () => {
    if (!externalLeagueId) {
      Alert.alert('Missing league link', 'This league has no ESPN ID on file.');
      return;
    }
    if (!isEspnWebViewSupported()) {
      Alert.alert('ESPN sign-in unavailable', espnWebViewSupportMessage());
      return;
    }
    if (!EspnLoginComponent) {
      const mod = await import('@/components/EspnLoginWebView');
      setEspnLoginComponent(() => mod.default);
    }
    setEspnLoginOpen(true);
  };

  const confirmLeave = () => {
    Alert.alert('Leave league?', `Leave ${active.name}? You can rejoin with an invite code.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete league?',
      synced
        ? `Remove ${active.name} from this app? Your league on ${active.platform} stays exactly as-is on ESPN/Sleeper.`
        : `Permanently delete ${active.name} for all members? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  };

  return (
    <>
      <WorkflowShell title="Settings" eyebrow="Commissioner">
        <Section title="Account">
          <Row first label="Display Name" value="You" onPress={() => {}} />
          <Row label="Notifications" value="On" onPress={() => {}} />
          <Row label="Appearance" value="System" onPress={() => {}} />
        </Section>

        {synced ? (
          <Section title="Connected Platform">
            <Row first label="Platform" value={active.platform} />
            {syncError ? (
              <Row
                label="Sync issue"
                sub={syncError}
              />
            ) : null}
            <Row label="Sync Frequency" value="Every 15 min" onPress={() => {}} />
            <Row label="Imported Settings" sub="Manage in your fantasy host" value="View" />
            {isCommish && isEspn ? (
              <Row
                label={reconnectMutation.isPending ? 'Reconnecting…' : 'Reconnect ESPN'}
                sub="Refresh your ESPN sign-in without creating a new league"
                onPress={() => {
                  if (reconnectMutation.isPending) return;
                  void openEspnReconnect();
                }}
              />
            ) : null}
            {isCommish ? (
              <Row
                label={syncMutation.isPending ? 'Refreshing…' : 'Refresh now'}
                sub={`Pull latest rosters, scores, and standings from ${active.platform}`}
                onPress={() => syncMutation.mutate()}
              />
            ) : (
              <Row label="Refresh sync" sub="Only your commissioner can trigger a full resync" />
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

        <Section title="Danger Zone">
          {!isCommish ? (
            <Row
              first
              label={leaveMutation.isPending ? 'Leaving…' : 'Leave league'}
              sub="Remove yourself from this league"
              onPress={confirmLeave}
            />
          ) : (
            <Row
              first
              label={deleteMutation.isPending ? 'Deleting…' : 'Delete league'}
              sub={
                synced
                  ? 'Removes this copy from the app only — your ESPN league is not affected'
                  : 'Permanently remove this league for all members in the app'
              }
              onPress={confirmDelete}
            />
          )}
        </Section>

        <Text variant="caption" muted style={{ marginTop: 8, textAlign: 'center' }}>
          Commissioner · v1.0
        </Text>
      </WorkflowShell>

      {espnLoginOpen && EspnLoginComponent ? (
        <EspnLoginComponent
          knownLeagueId={externalLeagueId}
          onClose={() => setEspnLoginOpen(false)}
          onSuccess={(session) => reconnectMutation.mutate(session)}
        />
      ) : null}
    </>
  );
}
