import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Divider } from '@/components/ui/Card';
import { makeId, shortNameFor, useLeague, type League, type SyncPlatform } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

type Stage = 'pick' | 'connect' | 'syncing' | 'done' | 'setup';
interface Features {
  pot: boolean;
  payments: boolean;
  payouts: boolean;
  reports: boolean;
  insights: boolean;
}

export default function SyncPage() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces, toneBg } = useThemeTokens();
  const { addLeague } = useLeague();
  const [stage, setStage] = useState<Stage>('pick');
  const [platform, setPlatform] = useState<SyncPlatform>('ESPN');
  const [leagueId, setLeagueId] = useState('');
  const [features, setFeatures] = useState<Features>({
    pot: true,
    payments: true,
    payouts: true,
    reports: true,
    insights: true,
  });

  const startSync = () => {
    setStage('syncing');
    setTimeout(() => setStage('done'), 1400);
  };

  const finish = () => {
    const isCommish = leagueId.toLowerCase().includes('c');
    const l: League = {
      id: makeId(),
      name: `${platform} League`,
      shortName: shortNameFor(`${platform} League`),
      type: 'synced',
      platform,
      role: isCommish ? 'commissioner' : 'member',
      stage: 'regular',
      members: 12,
      potUsd: 0,
      week: 1,
      record: '0-0',
      rank: 0,
      size: 12,
    };
    addLeague(l);
    nav.replace('/');
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
      <Pressable
        onPress={() => nav.push('/onboarding')}
        style={[layout.row, { marginLeft: -8, paddingHorizontal: 8, paddingVertical: 4 }]}
      >
        <ChevronLeft size={20} color={hex.foreground} />
        <Text variant="body">Back</Text>
      </Pressable>

      {stage === 'pick' ? (
        <>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            Sync existing league
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            Pick where your league lives.
          </Text>
          <View style={{ marginTop: 24, gap: 8 }}>
            {(['ESPN', 'Sleeper', 'Yahoo'] as SyncPlatform[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  setPlatform(p);
                  setStage('connect');
                }}
                style={[
                  layout.rowBetween,
                  {
                    borderRadius: 16,
                    backgroundColor: hex.surfaceElevated,
                    padding: 20,
                  },
                ]}
              >
                <Text variant="titleLg">{p}</Text>
                <Text variant="link" muted>
                  Connect →
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {stage === 'connect' ? (
        <>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            Connect {platform}
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            Enter your {platform} league ID or sign in.
          </Text>
          <View style={{ marginTop: 24, gap: 8 }}>
            <Input value={leagueId} onChangeText={setLeagueId} placeholder="League ID" autoCapitalize="none" />
            <Pressable style={[surfaces.secondaryButton, { height: 48 }]}>
              <Text variant="bodySm">Or sign in with {platform}</Text>
            </Pressable>
          </View>
          <View style={layout.fill} />
          <Pressable
            onPress={startSync}
            disabled={leagueId.trim().length < 2}
            style={[
              surfaces.primaryButton,
              { marginTop: 24 },
              leagueId.trim().length < 2 ? { opacity: 0.4 } : null,
            ]}
          >
            <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
              Connect League
            </Text>
          </Pressable>
        </>
      ) : null}

      {stage === 'syncing' ? (
        <View style={[layout.fill, layout.centered]}>
          <ActivityIndicator size="large" color={hex.foreground} />
          <Text variant="sectionTitle" style={{ marginTop: 24 }}>
            Syncing from {platform}…
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 4, fontSize: 14 }}>
            Owners · Rosters · Standings · Draft · Transactions
          </Text>
        </View>
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
            <Text variant="bodyMuted" style={{ marginTop: 8, maxWidth: 240, textAlign: 'center', fontSize: 14 }}>
              Owners, teams, rosters, standings, matchups, draft, and transactions imported.
            </Text>
          </View>
          <Pressable onPress={() => setStage('setup')} style={[surfaces.primaryButton, { marginTop: 24 }]}>
            <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
              Continue
            </Text>
          </Pressable>
        </>
      ) : null}

      {stage === 'setup' ? (
        <>
          <Text variant="titleXl" style={{ marginTop: 24 }}>
            What should Commissioner help with?
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 8, fontSize: 14 }}>
            Commissioner will not replace your league platform. Fantasy actions still happen on {platform}.
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
          <View style={layout.fill} />
          <Pressable onPress={finish} style={[surfaces.primaryButton, { marginTop: 24 }]}>
            <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
              Finish Setup
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
