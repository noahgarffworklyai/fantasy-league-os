import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/Card';
import { useLeague } from '@/lib/league-context';
import { parseInviteToken, previewInvite, redeemInvite } from '@/lib/league-api';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';
import type { InvitePreview } from '@flos/shared';

export default function JoinPage() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();
  const { refreshLeagues, setActiveId } = useLeague();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const lookup = async () => {
    const token = parseInviteToken(code);
    if (token.length < 3) return;
    setLoading(true);
    try {
      setPreview(await previewInvite(token));
    } catch (e) {
      Alert.alert('Invite not found', 'This code may be expired or mistyped. Ask your commissioner for the current join code from Invite Members.');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (!preview) return;
    setJoining(true);
    try {
      const res = await redeemInvite(preview.token);
      await refreshLeagues();
      setActiveId(res.leagueId);
      nav.replace('/');
    } catch (e) {
      Alert.alert('Could not join', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setJoining(false);
    }
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
          disabled={code.trim().length < 3 || loading}
          style={[
            surfaces.secondaryButton,
            { height: 48 },
            code.trim().length < 3 || loading ? { opacity: 0.4 } : null,
          ]}
        >
          <Text variant="bodySm">{loading ? 'Looking up…' : 'Look up league'}</Text>
        </Pressable>
      </View>

      {preview ? (
        <View style={[surfaces.card, { marginTop: 24 }]}>
          <View style={{ padding: 20 }}>
            <Text variant="eyebrow">League preview</Text>
            <Text variant="scoreLG" style={{ marginTop: 4, fontSize: 24 }}>
              {preview.leagueName}
            </Text>
            <Text variant="subtitle" style={{ marginTop: 4 }}>
              Buy-in ${Math.round(preview.buyInCents / 100)} · {preview.memberCount} members
            </Text>
          </View>
          <PreviewRow label="Processing fee (5%)" value={`$${Math.round(preview.platformFeeCents / 100)}`} />
          <PreviewRow label="Members" value={`${preview.memberCount}`} />
          <PreviewRow
            label="Expires"
            value={new Date(preview.expiresAt).toLocaleDateString()}
          />
        </View>
      ) : null}

      <View style={layout.fill} />
      {preview ? (
        <Pressable
          onPress={join}
          disabled={joining}
          style={[surfaces.primaryButton, { marginTop: 24 }, joining ? { opacity: 0.5 } : null]}
        >
          <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
            {joining ? 'Joining…' : 'Join League'}
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
