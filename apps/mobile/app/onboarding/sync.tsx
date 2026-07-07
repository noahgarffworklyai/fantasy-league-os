import { useState, type ComponentType } from 'react';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LeagueSummary } from '@flos/shared';
import { Check, ChevronLeft } from 'lucide-react-native';
import type { EspnSession } from '@/components/EspnLoginWebView';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Divider } from '@/components/ui/Card';
import {
  fetchEspnLeagues,
  fetchSleeperLeagueById,
  fetchSleeperLeagues,
  saveProviderCredentials,
} from '@/lib/imports-api';
import { espnWebViewSupportMessage, isEspnWebViewSupported } from '@/lib/espn-webview';
import { useLeague, type SyncPlatform } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

type Stage = 'pick' | 'connect' | 'select' | 'syncing' | 'done' | 'setup';

type SleeperMode = 'username' | 'leagueId';

type EspnLoginWebViewProps = {
  knownLeagueId?: string;
  onClose: () => void;
  onSuccess: (session: EspnSession) => void;
};

interface Features {
  pot: boolean;
  payments: boolean;
  payouts: boolean;
  reports: boolean;
  insights: boolean;
}

const PLATFORMS: { id: SyncPlatform; label: string; available: boolean }[] = [
  { id: 'Sleeper', label: 'Sleeper', available: true },
  { id: 'ESPN', label: 'ESPN', available: true },
  { id: 'Yahoo', label: 'Yahoo', available: false },
];

export default function SyncPage() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces, toneBg } = useThemeTokens();
  const { createSyncedLeague } = useLeague();

  const [stage, setStage] = useState<Stage>('pick');
  const [platform, setPlatform] = useState<SyncPlatform>('Sleeper');
  const [submitting, setSubmitting] = useState(false);

  const [sleeperUsername, setSleeperUsername] = useState('');
  const [sleeperLeagueId, setSleeperLeagueId] = useState('');
  const [sleeperMode, setSleeperMode] = useState<SleeperMode>('username');
  const [discovered, setDiscovered] = useState<LeagueSummary[]>([]);
  const [selected, setSelected] = useState<LeagueSummary | null>(null);

  const [espnSession, setEspnSession] = useState<EspnSession | null>(null);
  const [espnLoginOpen, setEspnLoginOpen] = useState(false);
  const [EspnLoginComponent, setEspnLoginComponent] = useState<ComponentType<EspnLoginWebViewProps> | null>(
    null,
  );
  const [espnLeagueId, setEspnLeagueId] = useState('');

  const [features, setFeatures] = useState<Features>({
    pot: true,
    payments: true,
    payouts: true,
    reports: true,
    insights: true,
  });

  const pickPlatform = (p: SyncPlatform, available: boolean) => {
    if (!available) {
      Alert.alert('Coming soon', 'Yahoo sync uses OAuth and will be available in a future update.');
      return;
    }
    setPlatform(p);
    setDiscovered([]);
    setSelected(null);
    setStage('connect');
  };

  const handleEspnSession = async (session: EspnSession) => {
    setEspnLoginOpen(false);
    setSubmitting(true);
    try {
      let leagues = session.leagues ?? [];
      if (leagues.length === 0 && session.espnS2 && session.swid) {
        leagues = await fetchEspnLeagues(session);
      }
      if (leagues.length === 0) {
        Alert.alert(
          'No leagues found',
          'Sign in on ESPN, open fantasy.espn.com/football, then try Connect League again.',
        );
        return;
      }
      setEspnSession(session);
      setDiscovered(leagues);
      if (leagues.length === 1) {
        setSelected(leagues[0]!);
        setStage('setup');
      } else {
        setStage('select');
      }
    } catch (e) {
      Alert.alert('Could not load leagues', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEspnLogin = () => {
    const id = espnLeagueId.trim();
    if (id.length < 4) {
      Alert.alert(
        'League ID required',
        'In the ESPN app: League → League Info → League ID. Paste that number here.',
      );
      return;
    }
    if (!isEspnWebViewSupported()) {
      Alert.alert('WebView unavailable', espnWebViewSupportMessage() ?? 'Restart Metro with --clear and reload.');
      return;
    }
    void import('@/components/EspnLoginWebView').then((mod) => {
      setEspnLoginComponent(() => mod.EspnLoginWebView);
      setEspnLoginOpen(true);
    });
  };

  const lookupSleeper = async () => {
    const username = sleeperUsername.trim().replace(/^@/, '');
    if (username.length < 2) return;
    setSubmitting(true);
    try {
      const leagues = await fetchSleeperLeagues(username);
      if (leagues.length === 0) {
        Alert.alert(
          'No leagues found',
          `No NFL leagues found for "@${username}". Use your @username handle (not display name), or paste your league ID instead.`,
        );
        return;
      }
      setDiscovered(leagues);
      setStage('select');
    } catch (e) {
      Alert.alert('Sleeper lookup failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const lookupSleeperById = async () => {
    const leagueId = sleeperLeagueId.trim();
    if (leagueId.length < 5) return;
    setSubmitting(true);
    try {
      const league = await fetchSleeperLeagueById(leagueId);
      setSelected(league);
      setStage('setup');
    } catch (e) {
      Alert.alert(
        'League not found',
        e instanceof Error ? e.message : 'Copy the league ID from your Sleeper league URL or app.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectEspnLeague = (league: LeagueSummary) => {
    setSelected(league);
    setStage('setup');
  };

  const runSync = async () => {
    if (!selected) return;
    if (platform === 'ESPN' && !espnSession) {
      Alert.alert('Session expired', 'Log in to ESPN again to continue.');
      setStage('connect');
      return;
    }
    const provider = platform === 'Sleeper' ? 'sleeper' : 'espn';
    const credentials =
      provider === 'sleeper'
        ? sleeperMode === 'leagueId' || sleeperLeagueId.trim()
          ? { leagueId: selected.externalId }
          : { username: sleeperUsername.trim().replace(/^@/, '') }
        : {
            leagueId: selected.externalId,
            espnS2: espnSession!.espnS2,
            swid: espnSession!.swid,
          };

    setStage('syncing');
    try {
      await saveProviderCredentials(provider, credentials);
      await createSyncedLeague({
        provider,
        externalLeagueId: selected.externalId,
        name: selected.name,
        season: selected.season,
        teamCount: selected.teamCount,
        credentials,
        buyIn: features.payments ? 100 : 0,
        features,
      });
      setStage('done');
    } catch (e) {
      setStage('setup');
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const selectSleeperLeague = (league: LeagueSummary) => {
    setSelected(league);
    setStage('setup');
  };

  const finishSetup = async () => {
    setSubmitting(true);
    try {
      await runSync();
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    nav.replace('/');
  };

  const back = () => {
    if (stage === 'connect') setStage('pick');
    else if (stage === 'select') setStage('connect');
    else if (stage === 'setup') {
      if (platform === 'Sleeper' && sleeperMode === 'username') setStage('select');
      else if (platform === 'ESPN' && discovered.length > 1) setStage('select');
      else setStage('connect');
    } else nav.push('/onboarding');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: hex.background,
        paddingHorizontal: 24,
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      {stage !== 'syncing' && stage !== 'done' ? (
        <Pressable
          onPress={back}
          style={[layout.row, { marginLeft: -8, paddingHorizontal: 8, paddingVertical: 4 }]}
        >
          <ChevronLeft size={20} color={hex.foreground} />
          <Text variant="body">Back</Text>
        </Pressable>
      ) : null}

      {stage === 'pick' ? (
        <>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            Sync existing league
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            Connect Sleeper or ESPN. Your league stays on the platform — Commissioner adds treasury, reports, and insights.
          </Text>
          <View style={{ marginTop: 24, gap: 8 }}>
            {PLATFORMS.map(({ id, label, available }) => (
              <Pressable
                key={id}
                onPress={() => pickPlatform(id, available)}
                style={[
                  layout.rowBetween,
                  {
                    borderRadius: 16,
                    backgroundColor: hex.surfaceElevated,
                    padding: 20,
                    opacity: available ? 1 : 0.55,
                  },
                ]}
              >
                <Text variant="titleLg">{label}</Text>
                <Text variant="link" muted>
                  {available ? 'Connect →' : 'Soon'}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {stage === 'connect' && platform === 'Sleeper' ? (
        <ScrollView style={layout.fill} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            Connect Sleeper
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            You do not need to be commissioner — any league member can sync. Use your @username or paste a league ID.
          </Text>

          <View style={[layout.row, { marginTop: 20, gap: 8 }]}>
            {(
              [
                ['username', 'Username'],
                ['leagueId', 'League ID'],
              ] as [SleeperMode, string][]
            ).map(([mode, label]) => (
              <Pressable
                key={mode}
                onPress={() => setSleeperMode(mode)}
                style={[
                  layout.flex1,
                  layout.centered,
                  {
                    height: 40,
                    borderRadius: 9999,
                    backgroundColor: sleeperMode === mode ? hex.foreground : hex.surfaceElevated,
                  },
                ]}
              >
                <Text
                  variant="button"
                  style={{ color: sleeperMode === mode ? hex.background : hex.foreground, fontSize: 14 }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 20, gap: 8 }}>
            {sleeperMode === 'username' ? (
              <>
                <Input
                  value={sleeperUsername}
                  onChangeText={setSleeperUsername}
                  placeholder="@username"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text variant="bodyMuted" style={{ fontSize: 13, lineHeight: 18 }}>
                  Profile → Settings → Username. Not your team name or display name.
                </Text>
              </>
            ) : (
              <>
                <Input
                  value={sleeperLeagueId}
                  onChangeText={setSleeperLeagueId}
                  placeholder="League ID"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                />
                <Text variant="bodyMuted" style={{ fontSize: 13, lineHeight: 18 }}>
                  Sleeper app → league → share link, or the long number in the URL.
                </Text>
              </>
            )}
          </View>

          <Pressable
            onPress={sleeperMode === 'username' ? lookupSleeper : lookupSleeperById}
            disabled={
              submitting ||
              (sleeperMode === 'username'
                ? sleeperUsername.trim().replace(/^@/, '').length < 2
                : sleeperLeagueId.trim().length < 5)
            }
            style={[
              surfaces.primaryButton,
              { marginTop: 24 },
              submitting ||
              (sleeperMode === 'username'
                ? sleeperUsername.trim().replace(/^@/, '').length < 2
                : sleeperLeagueId.trim().length < 5)
                ? { opacity: 0.4 }
                : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={hex.primaryForeground} />
            ) : (
              <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
                {sleeperMode === 'username' ? 'Find My Leagues' : 'Connect League'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      ) : null}

      {stage === 'connect' && platform === 'ESPN' ? (
        <>
          <ScrollView
            style={layout.fill}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="titleXl" style={{ marginTop: 24 }}>
              Connect ESPN
            </Text>
            <Text variant="subtitle" style={{ marginTop: 8 }}>
              Sign in with ESPN, then connect your league. Past seasons (e.g. last year) work.
            </Text>
            <View style={[surfaces.roundedCard, { marginTop: 24, padding: 16, gap: 8 }]}>
              <Text variant="titleMd">League ID (recommended)</Text>
              <Text variant="bodyMuted" style={{ fontSize: 14, lineHeight: 20 }}>
                ESPN app → League → League Info → League ID. Stay in our login screen — don’t open the ESPN app.
              </Text>
            </View>
            <View style={{ marginTop: 16, gap: 8 }}>
              <Input
                value={espnLeagueId}
                onChangeText={setEspnLeagueId}
                placeholder="League ID (e.g. 1234567)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
              />
              <Text variant="bodyMuted" style={{ fontSize: 13, lineHeight: 18 }}>
                ESPN does not expose a “list my leagues” API — League ID is the reliable way to connect, especially for past seasons.
              </Text>
            </View>
            <View style={[surfaces.roundedCard, { marginTop: 16, padding: 16, gap: 8 }]}>
              <Text variant="titleMd">What happens next</Text>
              <Text variant="bodyMuted" style={{ fontSize: 14, lineHeight: 20 }}>
                1. Sign in on ESPN{'\n'}
                2. We validate your league{'\n'}
                3. Tap Sync League to finish
              </Text>
            </View>
          </ScrollView>
          <Pressable
            onPress={openEspnLogin}
            disabled={submitting || espnLeagueId.trim().length < 4}
            style={[
              surfaces.primaryButton,
              submitting || espnLeagueId.trim().length < 4 ? { opacity: 0.45 } : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={hex.primaryForeground} />
            ) : (
              <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
                Sign in & Connect
              </Text>
            )}
          </Pressable>
        </>
      ) : null}

      {espnLoginOpen && EspnLoginComponent ? (
        <EspnLoginComponent
          knownLeagueId={espnLeagueId.trim()}
          onClose={() => {
            setEspnLoginOpen(false);
            setEspnLoginComponent(null);
          }}
          onSuccess={handleEspnSession}
        />
      ) : null}

      {stage === 'select' ? (
        <>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            Choose a league
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            {platform === 'ESPN'
              ? `${discovered.length} league${discovered.length === 1 ? '' : 's'} on your ESPN account`
              : `${discovered.length} league${discovered.length === 1 ? '' : 's'} for ${sleeperUsername}`}
          </Text>
          <ScrollView style={{ marginTop: 16, flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {discovered.map((league) => (
              <Pressable
                key={league.externalId}
                onPress={() => (platform === 'ESPN' ? selectEspnLeague(league) : selectSleeperLeague(league))}
                disabled={submitting}
                style={[
                  {
                    borderRadius: 16,
                    backgroundColor: hex.surfaceElevated,
                    padding: 16,
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}
              >
                <Text variant="titleMd">{league.name}</Text>
                <Text variant="bodyMuted" style={{ marginTop: 4, fontSize: 13 }}>
                  {league.season} season
                  {league.teamCount ? ` · ${league.teamCount} teams` : ''}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {stage === 'syncing' ? (
        <View style={[layout.fill, layout.centered]}>
          <ActivityIndicator size="large" color={hex.foreground} />
          <Text variant="sectionTitle" style={{ marginTop: 24 }}>
            Syncing from {platform}…
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 4, fontSize: 14, textAlign: 'center' }}>
            {selected?.name ?? 'Importing league'}
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 8, fontSize: 13 }}>
            Owners · Rosters · Standings · Matchups
          </Text>
        </View>
      ) : null}

      {stage === 'setup' ? (
        <>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            What should Commissioner help with?
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 8, fontSize: 14 }}>
            {selected?.name ?? 'Your league'} · Commissioner will not replace {platform}.
          </Text>
          <View style={[surfaces.roundedCard, { marginTop: 20 }]}>
            {(
              [
                ['pot', 'League Pot'],
                ['payments', 'Payments'],
                ['payouts', 'Payouts'],
                ['reports', 'Reports'],
                ['insights', 'Player Insights'],
              ] as [keyof Features, string][]
            ).map(([k, label], i) => (
              <View key={k}>
                {i > 0 ? <Divider /> : null}
                <View style={[layout.rowBetween, { paddingHorizontal: 20, paddingVertical: 16 }]}>
                  <Text variant="titleMd">{label}</Text>
                  <Toggle on={features[k]} onChange={(v) => setFeatures({ ...features, [k]: v })} />
                </View>
              </View>
            ))}
          </View>
          <Text variant="caption" muted style={{ marginTop: 12, paddingHorizontal: 4 }}>
            Payment amount defaults to $100 per team when payments are enabled.
          </Text>
          <View style={layout.fill} />
          <Pressable
            onPress={finishSetup}
            disabled={submitting}
            style={[surfaces.primaryButton, { marginTop: 24 }, submitting ? { opacity: 0.6 } : null]}
          >
            {submitting ? (
              <ActivityIndicator color={hex.primaryForeground} />
            ) : (
              <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
                Sync League
              </Text>
            )}
          </Pressable>
        </>
      ) : null}

      {stage === 'done' ? (
        <>
          <View style={[layout.fill, layout.centered]}>
            <View
              style={[
                layout.centered,
                {
                  height: 56,
                  width: 56,
                  borderRadius: 9999,
                  backgroundColor: toneBg.success,
                },
              ]}
            >
              <Check size={28} color={hex.success} />
            </View>
            <Text variant="scoreLG" style={{ marginTop: 24, fontSize: 24 }}>
              League synced
            </Text>
            <Text variant="bodyMuted" style={{ marginTop: 8, maxWidth: 280, textAlign: 'center', fontSize: 14 }}>
              {selected?.name ?? 'Your league'} is connected. Standings and matchups will refresh from {platform}.
            </Text>
          </View>
          <Pressable onPress={finish} style={[surfaces.primaryButton, { marginTop: 24 }]}>
            <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
              Go to Home
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
