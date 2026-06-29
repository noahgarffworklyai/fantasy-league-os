import { useState } from 'react';
import { ActivityIndicator, Alert, Share, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Share2 } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { ensureLeagueInvite } from '@/lib/league-api';
import { buildInviteShareContent } from '@/lib/invite-share';
import { useThemeTokens } from '@/lib/theme';

type Props = {
  leagueId: string;
  leagueName: string;
  enabled?: boolean;
};

/** Join code + share actions backed by the invites API. */
export function InviteSharePanel({ leagueId, leagueName, enabled = true }: Props) {
  const { hex, layout, surfaces } = useThemeTokens();
  const [copied, setCopied] = useState(false);

  const inviteQuery = useQuery({
    queryKey: ['league-invite', leagueId],
    queryFn: () => ensureLeagueInvite(leagueId),
    enabled: enabled && !!leagueId,
  });

  const invite = inviteQuery.data ? buildInviteShareContent(inviteQuery.data, leagueName) : null;

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

  if (inviteQuery.isLoading) {
    return <ActivityIndicator color={hex.primary} style={{ marginVertical: 16 }} />;
  }

  if (inviteQuery.isError) {
    return (
      <View style={{ gap: 12 }}>
        <Text variant="bodyMuted">Could not create invite.</Text>
        <Pressable onPress={() => inviteQuery.refetch()} style={surfaces.primaryButton}>
          <Text variant="button" style={{ color: hex.primaryForeground }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!invite) return null;

  return (
    <View style={{ gap: 12 }}>
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
        In the app: Join a League → paste this code.
      </Text>
      {invite.usingLocalDev ? (
        <Text variant="bodyMuted" style={{ fontSize: 13, lineHeight: 18 }}>
          Local dev: share the code, not a localhost link.
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
  );
}

export function useInviteShareActions(leagueId: string, leagueName: string, enabled = true) {
  const inviteQuery = useQuery({
    queryKey: ['league-invite', leagueId],
    queryFn: () => ensureLeagueInvite(leagueId),
    enabled: enabled && !!leagueId,
  });

  const invite = inviteQuery.data ? buildInviteShareContent(inviteQuery.data, leagueName) : null;

  const shareInvite = () => {
    if (!invite) return;
    Share.share({ message: invite.shareMessage }).catch(() => {});
  };

  const shareCode = () => {
    if (!invite) return;
    Share.share({ message: invite.joinCode }).catch(() => {});
  };

  return { invite, inviteQuery, shareInvite, shareCode };
}
