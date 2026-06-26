import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Divider } from '@/components/ui/Card';
import { makeId, shortNameFor, useLeague, type League, type SyncPlatform } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

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
  const c = useColors();
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
      className="flex-1 bg-background px-6"
      style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <Pressable
        onPress={() => nav.push('/onboarding')}
        className="-ml-2 flex-row items-center gap-0.5 rounded-full px-2 py-1"
      >
        <ChevronLeft size={20} color={c.foreground} />
        <Text className="text-[15px]">Back</Text>
      </Pressable>

      {stage === 'pick' ? (
        <>
          <Text className="mt-6 text-[28px] font-semibold leading-tight tracking-tighter2">
            Sync existing league
          </Text>
          <Text className="mt-2 text-[15px] text-muted-foreground">Pick where your league lives.</Text>
          <View className="mt-6 gap-2">
            {(['ESPN', 'Sleeper', 'Yahoo'] as SyncPlatform[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  setPlatform(p);
                  setStage('connect');
                }}
                className="w-full flex-row items-center justify-between rounded-2xl bg-surface-elevated p-5"
              >
                <Text className="text-[18px] font-semibold tracking-tightish">{p}</Text>
                <Text className="text-[13px] text-muted-foreground">Connect →</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {stage === 'connect' ? (
        <>
          <Text className="mt-6 text-[28px] font-semibold leading-tight tracking-tighter2">
            Connect {platform}
          </Text>
          <Text className="mt-2 text-[15px] text-muted-foreground">
            Enter your {platform} league ID or sign in.
          </Text>
          <View className="mt-6 gap-2">
            <Input value={leagueId} onChangeText={setLeagueId} placeholder="League ID" autoCapitalize="none" />
            <Pressable className="h-12 w-full items-center justify-center rounded-full bg-surface-elevated">
              <Text className="text-[15px] font-semibold tracking-tightish text-foreground">
                Or sign in with {platform}
              </Text>
            </Pressable>
          </View>
          <View className="flex-1" />
          <Pressable
            onPress={startSync}
            disabled={leagueId.trim().length < 2}
            className={cn(
              'mt-6 h-14 w-full items-center justify-center rounded-full bg-foreground',
              leagueId.trim().length < 2 ? 'opacity-40' : '',
            )}
          >
            <Text className="text-[17px] font-semibold tracking-tightish text-background">
              Connect League
            </Text>
          </Pressable>
        </>
      ) : null}

      {stage === 'syncing' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={c.foreground} />
          <Text className="mt-6 text-[20px] font-semibold tracking-tightish">
            Syncing from {platform}…
          </Text>
          <Text className="mt-1 text-[14px] text-muted-foreground">
            Owners · Rosters · Standings · Draft · Transactions
          </Text>
        </View>
      ) : null}

      {stage === 'done' ? (
        <>
          <View className="flex-1 items-center justify-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-success/15">
              <Check size={28} color={c.success} />
            </View>
            <Text className="mt-6 text-[24px] font-semibold tracking-tighter2">League synced</Text>
            <Text className="mt-2 max-w-[28ch] text-center text-[14px] text-muted-foreground">
              Owners, teams, rosters, standings, matchups, draft, and transactions imported.
            </Text>
          </View>
          <Pressable
            onPress={() => setStage('setup')}
            className="mt-6 h-14 w-full items-center justify-center rounded-full bg-foreground"
          >
            <Text className="text-[17px] font-semibold tracking-tightish text-background">Continue</Text>
          </Pressable>
        </>
      ) : null}

      {stage === 'setup' ? (
        <>
          <Text className="mt-6 text-[28px] font-semibold leading-tight tracking-tighter2">
            What should Commissioner help with?
          </Text>
          <Text className="mt-2 text-[14px] text-muted-foreground">
            Commissioner will not replace your league platform. Fantasy actions still happen on{' '}
            {platform}.
          </Text>
          <View className="mt-5 overflow-hidden rounded-[24px] bg-surface-elevated">
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
                <View className="flex-row items-center justify-between px-5 py-4">
                  <Text className="text-[16px] font-medium tracking-tightish">{label}</Text>
                  <Toggle on={features[k]} onChange={(v) => setFeatures({ ...features, [k]: v })} />
                </View>
              </View>
            ))}
          </View>
          <View className="flex-1" />
          <Pressable
            onPress={finish}
            className="mt-6 h-14 w-full items-center justify-center rounded-full bg-foreground"
          >
            <Text className="text-[17px] font-semibold tracking-tightish text-background">
              Finish Setup
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
