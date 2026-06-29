import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/Card';
import { makeId, shortNameFor, useLeague, type League } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

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
  const { hex, layout, surfaces } = useThemeTokens();
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

      <Text variant="titleXl" style={{ marginTop: 24 }}>
        Join a league
      </Text>
      <Text variant="subtitle" style={{ marginTop: 8 }}>
        Paste an invite code or link from your commissioner.
      </Text>

      <View style={{ marginTop: 24, gap: 8 }}>
        <Input value={code} onChangeText={setCode} placeholder="Invite code or link" autoCapitalize="none" />
        <Pressable
          onPress={lookup}
          disabled={code.trim().length < 3}
          style={[surfaces.secondaryButton, { height: 48 }, code.trim().length < 3 ? { opacity: 0.4 } : null]}
        >
          <Text variant="bodySm">Look up league</Text>
        </Pressable>
      </View>

      {preview ? (
        <View style={[surfaces.card, { marginTop: 24 }]}>
          <View style={{ padding: 20 }}>
            <Text variant="eyebrow">League preview</Text>
            <Text variant="scoreLG" style={{ marginTop: 4, fontSize: 24 }}>
              {preview.name}
            </Text>
            <Text variant="subtitle" style={{ marginTop: 4 }}>
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

      <View style={layout.fill} />
      {preview ? (
        <Pressable onPress={join} style={[surfaces.primaryButton, { marginTop: 24 }]}>
          <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
            Join League
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  const { layout } = useThemeTokens();
  return (
    <View>
      <Divider />
      <View style={[layout.rowBetween, { paddingHorizontal: 20, paddingVertical: 16 }]}>
        <Text variant="bodyMuted" style={{ fontSize: 14 }}>
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}
