import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/Card';
import { makeId, shortNameFor, useLeague, type League } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

interface Preview {
  name: string;
  commissioner: string;
  size: number;
  type: 'Hosted';
  buyIn: number;
  prize: string;
  draftDate: string;
}

export default function JoinPage() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { addLeague } = useLeague();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);

  const lookup = () => {
    if (code.trim().length < 3) return;
    setPreview({
      name: 'Jackson Family League',
      commissioner: 'Marcus J.',
      size: 12,
      type: 'Hosted',
      buyIn: 100,
      prize: '70 / 20 / 10',
      draftDate: 'Sun, Sep 6 · 7:00 PM',
    });
  };

  const join = () => {
    if (!preview) return;
    const l: League = {
      id: makeId(),
      name: preview.name,
      shortName: shortNameFor(preview.name),
      type: 'hosted',
      role: 'member',
      stage: 'preseason',
      members: preview.size,
      potUsd: preview.buyIn * preview.size,
      week: 0,
      record: '—',
      rank: 0,
      size: preview.size,
      buyIn: preview.buyIn,
      draftDate: preview.draftDate,
      joined: 8,
      paid: 6,
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

      <Text className="mt-6 text-[28px] font-semibold leading-tight tracking-tighter2">
        Join a league
      </Text>
      <Text className="mt-2 text-[15px] text-muted-foreground">
        Paste an invite code or link from your commissioner.
      </Text>

      <View className="mt-6 gap-2">
        <Input value={code} onChangeText={setCode} placeholder="Invite code or link" autoCapitalize="none" />
        <Pressable
          onPress={lookup}
          disabled={code.trim().length < 3}
          className={cn(
            'h-12 w-full items-center justify-center rounded-full bg-surface-elevated',
            code.trim().length < 3 ? 'opacity-40' : '',
          )}
        >
          <Text className="text-[15px] font-semibold tracking-tightish text-foreground">
            Look up league
          </Text>
        </Pressable>
      </View>

      {preview ? (
        <View className="mt-6 overflow-hidden rounded-[28px] bg-surface-elevated">
          <View className="p-5">
            <Text className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
              League preview
            </Text>
            <Text className="mt-1 text-[24px] font-semibold tracking-tighter2">{preview.name}</Text>
            <Text className="mt-1 text-[13px] text-muted-foreground">
              Commissioner: {preview.commissioner}
            </Text>
          </View>
          <PreviewRow label="League size" value={`${preview.size} teams`} />
          <PreviewRow label="League type" value={preview.type} />
          <PreviewRow label="Buy in" value={`$${preview.buyIn}`} />
          <PreviewRow label="Prize" value={preview.prize} />
          <PreviewRow label="Draft" value={preview.draftDate} />
          <PreviewRow label="Your role" value="Member" />
        </View>
      ) : null}

      <View className="flex-1" />
      {preview ? (
        <Pressable
          onPress={join}
          className="mt-6 h-14 w-full items-center justify-center rounded-full bg-foreground"
        >
          <Text className="text-[17px] font-semibold tracking-tightish text-background">
            Join League
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Divider />
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-[14px] text-muted-foreground">{label}</Text>
        <Text className="text-[15px] font-medium tracking-tightish">{value}</Text>
      </View>
    </View>
  );
}
