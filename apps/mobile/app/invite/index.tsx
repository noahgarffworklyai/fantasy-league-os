import { useState } from 'react';
import { Share, View } from 'react-native';
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
import { Pressable, Text } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { Divider } from '@/components/ui/Card';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

export default function InvitePage() {
  const { active } = useLeague();
  const nav = useNav();
  const c = useColors();
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
      <View className="px-6 pt-2">
        <Pressable
          onPress={() => nav.back()}
          className="-ml-2 flex-row items-center gap-0.5 rounded-full px-2 py-1"
        >
          <ChevronLeft size={20} color={c.foreground} />
          <Text className="text-[15px]">Back</Text>
        </Pressable>

        <Text className="mt-4 text-[28px] font-semibold leading-tight tracking-tighter2">
          Invite members
        </Text>
        <Text className="mt-2 text-[15px] text-muted-foreground">
          Bring the league together. No app required to join.
        </Text>

        <View className="mt-6 rounded-[28px] bg-surface-elevated p-5">
          <Text className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
            Invite link
          </Text>
          <View className="mt-2 flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-[15px] font-medium tracking-tightish" numberOfLines={1}>
              {link}
            </Text>
            <Pressable
              onPress={copy}
              className="h-10 shrink-0 flex-row items-center gap-1.5 rounded-full bg-foreground px-4"
            >
              {copied ? <Check size={16} color={c.background} /> : <Copy size={16} color={c.background} />}
              <Text className="text-[13px] font-semibold tracking-tightish text-background">
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-3">
          <InviteAction icon={Link2} label="Copy Link" onPress={copy} />
          <InviteAction icon={Share2} label="Share Link" onPress={share} />
          <InviteAction icon={MessageSquare} label="Text Invite" onPress={share} />
          <InviteAction icon={Mail} label="Email Invite" onPress={share} />
          <InviteAction icon={QrCode} label="QR Code" wide />
        </View>

        <View className="mt-6 overflow-hidden rounded-[28px] bg-surface-elevated">
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
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-[88px] items-center justify-center gap-2 rounded-[24px] bg-surface-elevated',
        wide ? 'w-full' : 'w-[48%]',
      )}
    >
      <IconComp size={20} color={c.foreground} />
      <Text className="text-[14px] font-medium tracking-tightish">{label}</Text>
    </Pressable>
  );
}

function StatRow({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  return (
    <View>
      {divided ? <Divider /> : null}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-[14px] text-muted-foreground">{label}</Text>
        <Text className="text-[15px] font-medium tracking-tightish">{value}</Text>
      </View>
    </View>
  );
}
