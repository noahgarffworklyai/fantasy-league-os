import { useState } from 'react';
import { ActivityIndicator, Alert, Share, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  ChevronLeft,
  Copy,
  Link2,
  Mail,
  MessageSquare,
  QrCode,
  Share2,
} from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Divider } from '@/components/ui/Card';
import { useLeague } from '@/lib/league-context';
import { ensureLeagueInvite } from '@/lib/league-api';
import { buildInviteShareContent } from '@/lib/invite-share';
import { fetchTreasury } from '@/lib/treasury-api';
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

export default function InvitePage() {
  const { active } = useLeague();
  const nav = useNav();
  const { hex, layout, surfaces } = useThemeTokens();
  const [copied, setCopied] = useState(false);

  const inviteQuery = useQuery({
    queryKey: ['league-invite', active?.id],
    queryFn: () => ensureLeagueInvite(active!.id),
    enabled: !!active?.id && active.role === 'commissioner',
  });

  const treasuryQuery = useQuery({
    queryKey: ['treasury', active?.id],
    queryFn: () => fetchTreasury(active!.id),
    enabled: !!active?.id,
  });

  if (!active) return null;

  if (active.role !== 'commissioner') {
    return (
      <Screen>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable
            onPress={() => nav.back()}
            style={[layout.row, { marginLeft: -8, paddingHorizontal: 8, paddingVertical: 4 }]}
          >
            <ChevronLeft size={20} color={hex.foreground} />
            <Text variant="body">Back</Text>
          </Pressable>
          <Text variant="titleXl" style={{ marginTop: 16 }}>
            Commissioner only
          </Text>
          <Text variant="subtitle" style={{ marginTop: 8 }}>
            Ask your league commissioner to send invites.
          </Text>
        </View>
      </Screen>
    );
  }

  const size = active.size ?? active.members ?? 12;
  const joined = treasuryQuery.data?.totalMemberCount ?? active.joined ?? 1;
  const paid = treasuryQuery.data?.paidMemberCount ?? active.paid ?? 0;
  const pending = Math.max(0, size - joined);
  const invite = inviteQuery.data
    ? buildInviteShareContent(inviteQuery.data, active.name)
    : null;

  const copyCode = async () => {
    if (!invite) return;
    try {
      await Share.share({ message: invite.joinCode });
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      Alert.alert('Join code', invite.joinCode);
    }
  };

  const shareInvite = () => {
    if (!invite) return;
    Share.share({ message: invite.shareMessage }).catch(() => {});
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Pressable
          onPress={() => nav.back()}
          style={[layout.row, { marginLeft: -8, paddingHorizontal: 8, paddingVertical: 4 }]}
        >
          <ChevronLeft size={20} color={hex.foreground} />
          <Text variant="body">Back</Text>
        </Pressable>

        <Text variant="titleXl" style={{ marginTop: 16 }}>
          Invite members
        </Text>
        <Text variant="subtitle" style={{ marginTop: 8 }}>
          Share a join code — members paste it in Join a League. No public website required.
        </Text>

        <View style={[surfaces.roundedCardLg, { marginTop: 24, padding: 20 }]}>
          <Text variant="eyebrow">Join code</Text>
          {inviteQuery.isLoading ? (
            <ActivityIndicator color={hex.primary} style={{ marginTop: 16 }} />
          ) : inviteQuery.isError ? (
            <View style={{ marginTop: 12, gap: 12 }}>
              <Text variant="bodyMuted">Could not create invite.</Text>
              <Pressable onPress={() => inviteQuery.refetch()} style={surfaces.primaryButton}>
                <Text variant="button" style={{ color: hex.primaryForeground }}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : invite ? (
            <View style={{ marginTop: 8, gap: 12 }}>
              <TextInput
                value={invite.joinCode}
                editable={false}
                selectTextOnFocus
                showSoftInputOnFocus={false}
                style={{
                  borderRadius: 12,
                  backgroundColor: hex.background,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  fontSize: 18,
                  fontWeight: '600',
                  letterSpacing: 1,
                  color: hex.foreground,
                  textAlign: 'center',
                }}
              />
              <Text variant="bodyMuted" style={{ fontSize: 13, lineHeight: 18 }}>
                Friends open the app → Join a League → paste this code.
              </Text>
              {invite.usingLocalDev ? (
                <Text variant="bodyMuted" style={{ fontSize: 13, lineHeight: 18 }}>
                  Local dev: share the code, not a localhost link. Set EXPO_PUBLIC_INVITE_WEB_URL when you
                  have a public invite page.
                </Text>
              ) : null}
              <View style={[layout.rowBetween, { gap: 12 }]}>
                <Pressable
                  onPress={copyCode}
                  style={[
                    layout.row,
                    layout.flex1,
                    {
                      height: 40,
                      gap: 6,
                      borderRadius: 9999,
                      backgroundColor: hex.primary,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  {copied ? <Check size={16} color={hex.background} /> : <Copy size={16} color={hex.background} />}
                  <Text variant="button" style={{ color: hex.primaryForeground }}>
                    {copied ? 'Shared' : 'Share code'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={shareInvite}
                  style={[
                    layout.centered,
                    {
                      height: 40,
                      width: 40,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: hex.hairline,
                      backgroundColor: hex.background,
                    },
                  ]}
                >
                  <Share2 size={16} color={hex.foreground} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[layout.rowWrap, { marginTop: 16, gap: 12 }]}>
          <InviteAction icon={Link2} label="Share code" onPress={copyCode} disabled={!invite} />
          <InviteAction icon={Share2} label="Share invite" onPress={shareInvite} disabled={!invite} />
          <InviteAction icon={MessageSquare} label="Text invite" onPress={shareInvite} disabled={!invite} />
          <InviteAction icon={Mail} label="Email invite" onPress={shareInvite} disabled={!invite} />
          <InviteAction icon={QrCode} label="QR Code" wide disabled onPress={() => Alert.alert('Coming soon', 'QR codes are on the way.')} />
        </View>

        <View style={[surfaces.card, { marginTop: 24 }]}>
          <StatRow label="League capacity" value={`${size} teams`} />
          <StatRow label="Joined" value={`${joined}`} divided />
          <StatRow label="Pending" value={`${pending}`} divided />
          <StatRow label="Paid" value={`${paid} of ${size}`} divided />
          <StatRow
            label="Draft ready"
            value={joined >= size && paid >= size ? 'Yes' : 'Not yet'}
            divided
          />
        </View>
      </View>
    </Screen>
  );
}

function InviteAction({
  icon: IconComp,
  label,
  onPress,
  wide,
  disabled,
}: {
  icon: typeof Link2;
  label: string;
  onPress?: () => void;
  wide?: boolean;
  disabled?: boolean;
}) {
  const { hex, layout } = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        layout.centered,
        {
          height: 88,
          gap: 8,
          borderRadius: 24,
          backgroundColor: hex.surfaceElevated,
          width: wide ? '100%' : '48%',
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <IconComp size={20} color={hex.foreground} />
      <Text variant="bodySm" style={{ fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatRow({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  const { layout } = useThemeTokens();
  return (
    <View>
      {divided ? <Divider /> : null}
      <View style={[layout.rowBetween, { paddingHorizontal: 20, paddingVertical: 16 }]}>
        <Text variant="bodyMuted" style={{ fontSize: 14 }}>
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}
