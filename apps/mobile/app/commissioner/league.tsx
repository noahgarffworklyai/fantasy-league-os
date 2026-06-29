import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { Copy, Mail, MessageSquare, MoreHorizontal, QrCode, Share2 } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { InviteSharePanel, useInviteShareActions } from '@/components/InviteSharePanel';
import { Empty, Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import { useLeague, stageLabel } from '@/lib/league-context';
import { useLeagueMemberStats, type LeagueMemberRow } from '@/lib/league-members-api';
import { useThemeTokens } from '@/lib/theme';

type View2 = 'main' | 'members' | 'invite' | 'rules' | 'settings' | 'history';

export default function CommissionerLeaguePage() {
  const { active } = useLeague();
  const [view, setView] = useState<View2>('main');
  if (!active) return null;

  if (view === 'members') return <MembersView onBack={() => setView('main')} />;
  if (view === 'invite') return <InviteView onBack={() => setView('main')} />;
  if (view === 'rules') return <RulesView onBack={() => setView('main')} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('main')} />;
  if (view === 'history') return <HistoryView onBack={() => setView('main')} />;

  return <LeagueMainView onNavigate={setView} />;
}

function LeagueMainView({ onNavigate }: { onNavigate: (view: View2) => void }) {
  const { active } = useLeague();
  const { joined, pending, size, isLoading } = useLeagueMemberStats(
    active?.id,
    active?.size ?? active?.members,
  );
  const isCommish = active?.role === 'commissioner';

  if (!active) return null;

  return (
    <WorkflowShell title="League" eyebrow="Commissioner">
      <Section title="League Information">
        <Row
          first
          label={active.name}
          sub={active.type === 'synced' ? `Synced · ${active.platform}` : 'Hosted in Commissioner'}
          value={active.shortName}
        />
        <Row
          label="Capacity"
          value={isLoading ? '…' : `${joined} of ${size} joined`}
        />
        <Row label="Season" value={`Week ${active.week || '—'} · ${stageLabel(active.stage)}`} />
        <Row label="Scoring" value={active.scoring ?? 'Standard'} />
        <Row label="Buy-in" value={active.buyIn ? `$${active.buyIn}` : 'Free'} />
      </Section>

      <Section title="Manage">
        <Row first label="League Members" sub={`${joined} active`} onPress={() => onNavigate('members')} />
        <Row
          label="Invite Members"
          sub={isLoading ? 'Loading…' : `${pending} seats open`}
          onPress={() => onNavigate('invite')}
        />
        <Row label="League Rules" sub="Roster, scoring & schedule" onPress={() => onNavigate('rules')} />
        <Row
          label="League Settings"
          sub={isCommish ? 'Edit configuration' : 'Read only'}
          onPress={() => onNavigate('settings')}
        />
        <Row label="League History" sub="Past seasons & champions" onPress={() => onNavigate('history')} />
      </Section>

      {!isCommish ? (
        <Text variant="caption" muted style={{ paddingHorizontal: 12, textAlign: 'center' }}>
          You are viewing as a member. Only commissioners can edit league settings.
        </Text>
      ) : null}
    </WorkflowShell>
  );
}

function MembersView({ onBack }: { onBack: () => void }) {
  const { active } = useLeague();
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const { data: members, isLoading, isError, refetch } = useLeagueMemberStats(active?.id, active?.size);
  const isCommish = active?.role === 'commissioner';

  return (
    <WorkflowShell title="Members" eyebrow="League" onBack={onBack} backLabel="League">
      {isLoading ? (
        <ActivityIndicator color={hex.primary} style={{ marginVertical: 24 }} />
      ) : isError ? (
        <View style={{ gap: 12, paddingHorizontal: 8 }}>
          <Text variant="bodyMuted">Could not load members.</Text>
          <Pressable onPress={() => refetch()} style={surfaces.primaryButton}>
            <Text variant="button" style={{ color: hex.primaryForeground }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <Section title={`Joined · ${members?.length ?? 0}`}>
          {(members ?? []).map((m, i) => (
            <MemberRow key={m.userId} member={m} first={i === 0} isCommish={isCommish} />
          ))}
        </Section>
      )}
      {isCommish ? (
        <Text variant="caption" muted style={{ paddingHorizontal: 12, textAlign: 'center' }}>
          Payment status syncs from Treasury.
        </Text>
      ) : null}
    </WorkflowShell>
  );
}

function MemberRow({
  member,
  first,
  isCommish,
}: {
  member: LeagueMemberRow;
  first?: boolean;
  isCommish: boolean;
}) {
  const { hex, layout, surfaces, toneBg, toneFg } = useThemeTokens();
  const payment = member.paid ? 'Paid' : 'Unpaid';
  const roleLabel = member.role === 'commissioner' ? 'Commissioner' : 'Member';
  const joined = member.paidAt
    ? new Date(member.paidAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—';

  return (
    <Row
      first={first}
      label={member.displayName}
      sub={`${roleLabel} · ${member.teamName ?? 'No team'} · Joined ${joined}`}
      trailing={
        <View style={[layout.row, { gap: 8 }]}>
          <View
            style={[
              surfaces.pill,
              {
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: member.paid ? toneBg.success : toneBg.danger,
              },
            ]}
          >
            <Text
              variant="pill"
              style={{ color: member.paid ? toneFg.success : toneFg.danger }}
            >
              {payment}
            </Text>
          </View>
          {isCommish ? <MoreHorizontal size={16} color={hex.mutedForeground} /> : null}
        </View>
      }
    />
  );
}

function InviteView({ onBack }: { onBack: () => void }) {
  const { active } = useLeague();
  const { hex, surfaces } = useThemeTokens();
  const { joined, pending, size, isLoading } = useLeagueMemberStats(
    active?.id,
    active?.size ?? active?.members,
  );
  const { shareInvite, shareCode, invite } = useInviteShareActions(
    active!.id,
    active!.name,
    active?.role === 'commissioner',
  );

  if (!active) return null;

  if (active.role !== 'commissioner') {
    return (
      <WorkflowShell title="Invite Members" eyebrow="League" onBack={onBack} backLabel="League">
        <Text variant="bodyMuted">Only the commissioner can send invites.</Text>
      </WorkflowShell>
    );
  }

  return (
    <WorkflowShell title="Invite Members" eyebrow="League" onBack={onBack} backLabel="League">
      <View style={[surfaces.card, { marginBottom: 16, alignItems: 'center', padding: 20 }]}>
        <Text variant="eyebrow">Capacity</Text>
        <Text variant="scoreLG" style={{ marginTop: 4, fontSize: 32 }}>
          {isLoading ? '…' : `${joined} of ${size} Joined`}
        </Text>
        <Text variant="subtitle" style={{ marginTop: 4 }}>
          {isLoading ? 'Loading…' : `${pending} seats remaining · Share the join code below`}
        </Text>
      </View>

      <Section title="Join code">
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <InviteSharePanel leagueId={active.id} leagueName={active.name} />
        </View>
      </Section>

      <Section title="Share">
        <Row
          first
          label="Share join code"
          sub={invite?.joinCode ?? 'Loading…'}
          trailing={<Copy size={16} color={hex.mutedForeground} />}
          onPress={shareCode}
        />
        <Row
          label="Share full invite"
          sub="Code + instructions"
          trailing={<Share2 size={16} color={hex.mutedForeground} />}
          onPress={shareInvite}
        />
        <Row
          label="Text or email"
          trailing={<MessageSquare size={16} color={hex.mutedForeground} />}
          onPress={shareInvite}
        />
        <Row
          label="Email invite"
          trailing={<Mail size={16} color={hex.mutedForeground} />}
          onPress={shareInvite}
        />
        <Row
          label="QR code"
          trailing={<QrCode size={16} color={hex.mutedForeground} />}
          onPress={() => Alert.alert('Coming soon', 'QR codes are on the way.')}
        />
      </Section>
    </WorkflowShell>
  );
}

function RulesView({ onBack }: { onBack: () => void }) {
  const { active } = useLeague();
  return (
    <WorkflowShell title="League Rules" eyebrow="League" onBack={onBack} backLabel="League">
      <Section title="Roster">
        <Row first label="Starting Lineup" value="QB · 2RB · 2WR · TE · FLEX · K · DEF" />
        <Row label="Bench" value="6 slots" />
        <Row label="IR Slots" value="2" />
      </Section>
      <Section title="Scoring">
        <Row first label="Format" value={active?.scoring ?? 'Half PPR'} />
        <Row label="Passing TD" value="4 pts" />
        <Row label="Rushing/Receiving TD" value="6 pts" />
        <Row label="Reception" value={active?.scoring === 'PPR' ? '1 pt' : active?.scoring === 'Standard' ? '0 pts' : '0.5 pts'} />
      </Section>
      <Section title="Schedule">
        <Row first label="Regular Season" value="Weeks 1–14" />
        <Row label="Playoffs" value="Weeks 15–17, top 6" />
        <Row label="Tiebreaker" value="Points For" />
      </Section>
    </WorkflowShell>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const { active } = useLeague();
  const { joined, isLoading } = useLeagueMemberStats(active?.id, active?.size ?? active?.members);
  const synced = active?.type === 'synced';
  const draftSchedule = active?.draftDate ?? active?.draftSchedule ?? 'Not scheduled';

  return (
    <WorkflowShell title="League Settings" eyebrow="League" onBack={onBack} backLabel="League">
      {synced ? (
        <>
          <Section title="Connected Platform">
            <Row first label="Platform" value={active?.platform} />
            <Row label="Sync Frequency" value="Every 15 min" />
            <Row label="Imported Settings" sub="Read only from your fantasy host" value="View" />
          </Section>
          <Section title="Commissioner Features">
            <Row first label="League Pot" onPress={() => {}} value="Configure" />
            <Row label="Reports" value="Weekly" />
            <Row label="Notifications" value="On" />
          </Section>
        </>
      ) : (
        <>
          <Section title="Identity">
            <Row first label="League Name" value={active?.name} />
            <Row label="Short Name" value={active?.shortName} />
          </Section>
          <Section title="Configuration">
            <Row first label="Scoring" value={active?.scoring ?? 'Half PPR'} />
            <Row label="League Size" value={String(active?.size ?? active?.members ?? '—')} />
            <Row label="Draft Type" value={active?.draftType ?? 'Snake'} />
            <Row label="Draft Date" value={draftSchedule} />
            <Row label="Buy-in" value={active?.buyIn ? `$${active.buyIn}` : 'Free'} />
          </Section>
          <Section title="Members">
            <Row first label="Members joined" value={isLoading ? '…' : String(joined)} />
            <Row label="Payout template" value="Standard (70/20/10)" />
          </Section>
        </>
      )}
    </WorkflowShell>
  );
}

function HistoryView({ onBack }: { onBack: () => void }) {
  return (
    <WorkflowShell title="League History" eyebrow="League" onBack={onBack} backLabel="League">
      <Empty title="No past seasons yet" sub="History will appear after your first completed season." />
    </WorkflowShell>
  );
}
