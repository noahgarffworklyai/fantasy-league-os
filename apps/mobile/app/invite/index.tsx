import { useState } from 'react';
import { Share } from 'react-native';
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
import { useNav } from '@/lib/nav';
import { useThemeTokens } from '@/lib/theme';

export default function InvitePage() {
  const { active } = useLeague();
  const nav = useNav();
  const { hex, layout, surfaces } = useThemeTokens();
  const [copied, setCopied] = useState(false);
  if (!active) return null;

  const size = active.size ?? active.members;
  const joined = active.joined ?? 1;
  const paid = active.paid ?? 0;
  const pending = size - joined;
  const link = `commissioner.app/join/${active.id}`;

  const copy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const share = () => Share.share({ message: `Join my league on Commissioner: ${link}` }).catch(() => {});

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
          Bring the league together. No app required to join.
        </Text>

        <View style={[surfaces.roundedCardLg, { marginTop: 24, padding: 20 }]}>
          <Text variant="eyebrow">Invite link</Text>
          <View style={[layout.rowBetween, { marginTop: 8, gap: 12 }]}>
            <Text variant="body" numberOfLines={1} style={layout.flex1}>
              {link}
            </Text>
            <Pressable
              onPress={copy}
              style={[
                layout.row,
                {
                  height: 40,
                  flexShrink: 0,
                  gap: 6,
                  borderRadius: 9999,
                  backgroundColor: hex.primary,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                },
              ]}
            >
              {copied ? <Check size={16} color={hex.background} /> : <Copy size={16} color={hex.background} />}
              <Text variant="button" style={{ color: hex.primaryForeground }}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[layout.rowWrap, { marginTop: 16, gap: 12 }]}>
          <InviteAction icon={Link2} label="Copy Link" onPress={copy} />
          <InviteAction icon={Share2} label="Share Link" onPress={share} />
          <InviteAction icon={MessageSquare} label="Text Invite" onPress={share} />
          <InviteAction icon={Mail} label="Email Invite" onPress={share} />
          <InviteAction icon={QrCode} label="QR Code" wide />
        </View>

        <View style={[surfaces.card, { marginTop: 24 }]}>
          <StatRow label="League capacity" value={`${size} teams`} />
          <StatRow label="Joined" value={`${joined}`} divided />
          <StatRow label="Pending" value={`${pending}`} divided />
          <StatRow label="Paid" value={`${paid} of ${size}`} divided />
          <StatRow label="Draft ready" value={joined === size && paid === size ? 'Yes' : 'Not yet'} divided />
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
}: {
  icon: typeof Link2;
  label: string;
  onPress?: () => void;
  wide?: boolean;
}) {
  const { hex, layout } = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[
        layout.centered,
        {
          height: 88,
          gap: 8,
          borderRadius: 24,
          backgroundColor: hex.surfaceElevated,
          width: wide ? '100%' : '48%',
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
