import { useState } from 'react';
import { Copy, Mail, MessageSquare, MoreHorizontal, QrCode, Share2 } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Empty, Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import { useLeague } from '@/lib/league-context';
import { useTheme, useThemeTokens } from '@/lib/theme';

type View2 = 'main' | 'members' | 'invite' | 'rules' | 'settings' | 'history';

interface Member {
  id: string;
  name: string;
  role: 'Commissioner' | 'Co-Commish' | 'Member';
  payment: 'Paid' | 'Pending' | 'Overdue';
  joined: string;
  record: string;
}

const MEMBERS: Member[] = [
  { id: '1', name: 'You', role: 'Commissioner', payment: 'Paid', joined: 'Aug 12', record: '8-3' },
  { id: '2', name: 'Marcus Hill', role: 'Member', payment: 'Paid', joined: 'Aug 13', record: '9-2' },
  { id: '3', name: 'Jenna Park', role: 'Co-Commish', payment: 'Paid', joined: 'Aug 14', record: '7-4' },
  { id: '4', name: 'Devon Reed', role: 'Member', payment: 'Pending', joined: 'Aug 18', record: '6-5' },
  { id: '5', name: 'Sam Ortiz', role: 'Member', payment: 'Overdue', joined: 'Aug 20', record: '5-6' },
  { id: '6', name: 'Priya Kapoor', role: 'Member', payment: 'Paid', joined: 'Aug 22', record: '8-3' },
];

export default function CommissionerLeaguePage() {
  const { active } = useLeague();
  const [view, setView] = useState<View2>('main');
  if (!active) return null;

  if (view === 'members') return <MembersView onBack={() => setView('main')} />;
  if (view === 'invite') return <InviteView onBack={() => setView('main')} />;
  if (view === 'rules') return <RulesView onBack={() => setView('main')} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('main')} />;
  if (view === 'history') return <HistoryView onBack={() => setView('main')} />;

  const size = active.size ?? 12;
  const joined = active.joined ?? MEMBERS.length;
  const isCommish = active.role === 'commissioner';

  return (
    <WorkflowShell title="League" eyebrow="Commissioner">
      <Section title="League Information">
        <Row
          first
          label={active.name}
          sub={active.type === 'synced' ? `Synced · ${active.platform}` : 'Hosted in Commissioner'}
          value={active.shortName}
        />
        <Row label="Capacity" value={`${joined} of ${size} joined`} />
        <Row label="Season" value={`Week ${active.week} · ${active.stage}`} />
        <Row label="Scoring" value={active.scoring ?? 'Standard PPR'} />
        <Row label="Buy-in" value={active.buyIn ? `$${active.buyIn}` : 'Free'} />
      </Section>

      <Section title="Manage">
        <Row first label="League Members" sub={`${joined} active`} onPress={() => setView('members')} />
        <Row label="Invite Members" sub={`${size - joined} seats open`} onPress={() => setView('invite')} />
        <Row label="League Rules" sub="Roster, scoring & schedule" onPress={() => setView('rules')} />
        <Row
          label="League Settings"
          sub={isCommish ? 'Edit configuration' : 'Read only'}
          onPress={() => setView('settings')}
        />
        <Row label="League History" sub="Past seasons & champions" onPress={() => setView('history')} />
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
  const { scheme } = useTheme();
  const isCommish = active?.role === 'commissioner';
  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';
  return (
    <WorkflowShell title="Members" eyebrow="League" onBack={onBack} backLabel="League">
      <Section title={`Joined · ${MEMBERS.length}`}>
        {MEMBERS.map((m, i) => (
          <Row
            first={i === 0}
            key={m.id}
            label={m.name}
            sub={`${m.role} · Joined ${m.joined} · ${m.record}`}
            trailing={
              <View style={[layout.row, { gap: 8 }]}>
                <View
                  style={[
                    surfaces.pill,
                    {
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      backgroundColor:
                        m.payment === 'Paid'
                          ? toneBg.success
                          : m.payment === 'Pending'
                            ? `rgba(${ink},0.1)`
                            : toneBg.danger,
                    },
                  ]}
                >
                  <Text
                    variant="pill"
                    style={{
                      color:
                        m.payment === 'Paid'
                          ? toneFg.success
                          : m.payment === 'Pending'
                            ? hex.foreground
                            : toneFg.danger,
                    }}
                  >
                    {m.payment}
                  </Text>
                </View>
                {isCommish ? <MoreHorizontal size={16} color={hex.mutedForeground} /> : null}
              </View>
            }
          />
        ))}
      </Section>
      {isCommish ? (
        <Text variant="caption" muted style={{ paddingHorizontal: 12, textAlign: 'center' }}>
          Long-press a member to remove, transfer commissioner, or resend invite.
        </Text>
      ) : null}
    </WorkflowShell>
  );
}

function InviteView({ onBack }: { onBack: () => void }) {
  const { active } = useLeague();
  const { hex, surfaces } = useThemeTokens();
  const size = active?.size ?? 12;
  const joined = active?.joined ?? MEMBERS.length;
  const link = `https://cmsr.app/invite/${active?.id ?? 'abc'}`;

  return (
    <WorkflowShell title="Invite Members" eyebrow="League" onBack={onBack} backLabel="League">
      <View style={[surfaces.card, { marginBottom: 16, alignItems: 'center', padding: 20 }]}>
        <Text variant="eyebrow">Capacity</Text>
        <Text variant="scoreLG" style={{ marginTop: 4, fontSize: 32 }}>
          {joined} of {size} Joined
        </Text>
        <Text variant="subtitle" style={{ marginTop: 4 }}>
          {size - joined} seats remaining · Draft ready when full
        </Text>
      </View>

      <Section title="Share Invite">
        <Row first label="Copy Invite Link" sub={link} trailing={<Copy size={16} color={hex.mutedForeground} />} onPress={() => {}} />
        <Row label="Share Link" trailing={<Share2 size={16} color={hex.mutedForeground} />} onPress={() => {}} />
        <Row label="Email Invite" trailing={<Mail size={16} color={hex.mutedForeground} />} onPress={() => {}} />
        <Row label="Text Invite" trailing={<MessageSquare size={16} color={hex.mutedForeground} />} onPress={() => {}} />
        <Row label="Show QR Code" trailing={<QrCode size={16} color={hex.mutedForeground} />} onPress={() => {}} />
      </Section>

      <Section title="Pending · 2">
        <Row first label="alex@email.com" sub="Sent 2 days ago" value="Resend" />
        <Row label="taylor@email.com" sub="Sent yesterday" value="Resend" />
      </Section>

      <Section title="Rejected">
        <Empty title="No rejections" sub="Everyone you've invited is still considering or joined." />
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
        <Row label="Reception" value="0.5 pts" />
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
  const synced = active?.type === 'synced';
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
            <Row label="Payment Preferences" value="Apple Pay" />
          </Section>
        </>
      ) : (
        <>
          <Section title="Identity">
            <Row first label="League Name" value={active?.name} />
            <Row label="League Logo" value="Edit" />
          </Section>
          <Section title="Configuration">
            <Row first label="Rules & Scoring" value="Edit" />
            <Row label="Playoff Settings" value="6 teams" />
            <Row label="Draft Settings" value={active?.draftType ?? 'Snake'} />
            <Row label="Buy-in" value={active?.buyIn ? `$${active.buyIn}` : 'Free'} />
            <Row label="Prize Structure" value="60 / 30 / 10" />
          </Section>
          <Section title="Members & Alerts">
            <Row first label="Members" value={`${MEMBERS.length}`} />
            <Row label="Notifications" value="On" />
          </Section>
          <Section title="Danger Zone">
            <Row first label="Archive League" sub="Move to history without deleting" />
          </Section>
        </>
      )}
    </WorkflowShell>
  );
}

function HistoryView({ onBack }: { onBack: () => void }) {
  return (
    <WorkflowShell title="League History" eyebrow="League" onBack={onBack} backLabel="League">
      <Section title="Champions">
        <Row first label="2024 — Marcus Hill" sub="Beat Jenna Park 142–128" />
        <Row label="2023 — You" sub="Beat Sam Ortiz 156–141" />
        <Row label="2022 — Devon Reed" sub="Beat Marcus Hill 121–119" />
      </Section>
      <Section title="Records">
        <Row first label="Highest Score" value="178 · Marcus Hill" />
        <Row label="Lowest Score" value="58 · Sam Ortiz" />
        <Row label="Longest Win Streak" value="9 · Jenna Park" />
      </Section>
    </WorkflowShell>
  );
}
