import { View } from 'react-native';
import { Text } from '@/components/ui/primitives';
import { Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import { useLeague } from '@/lib/league-context';

export default function SettingsPage() {
  const { active } = useLeague();
  if (!active) return null;
  const synced = active.type === 'synced';
  const isCommish = active.role === 'commissioner';

  return (
    <WorkflowShell title="Settings" eyebrow="Commissioner">
      <Section title="Account">
        <Row first label="Display Name" value="You" onPress={() => {}} />
        <Row label="Notifications" value="On" onPress={() => {}} />
        <Row label="Appearance" value="System" onPress={() => {}} />
      </Section>

      {synced ? (
        <Section title="Connected Platform">
          <Row first label="Platform" value={active.platform} />
          <Row label="Sync Frequency" value="Every 15 min" onPress={() => {}} />
          <Row label="Imported Settings" sub="Manage in your fantasy host" value="View" />
        </Section>
      ) : (
        <Section title="League">
          {isCommish ? (
            <>
              <Row first label="League Name" value={active.name} onPress={() => {}} />
              <Row label="Scoring" value={active.scoring ?? 'Standard PPR'} onPress={() => {}} />
              <Row label="Playoff Settings" value="6 teams · Wks 15–17" onPress={() => {}} />
              <Row label="Draft Settings" value={active.draftType ?? 'Snake'} onPress={() => {}} />
              <Row label="Buy-in" value={active.buyIn ? `$${active.buyIn}` : 'Free'} onPress={() => {}} />
              <Row label="Prize Structure" value="60 / 30 / 10" onPress={() => {}} />
            </>
          ) : (
            <>
              <Row first label="League Name" value={active.name} />
              <Row label="Scoring" value={active.scoring ?? 'Standard PPR'} />
              <Row label="Read only" sub="Only your commissioner can edit league settings." />
            </>
          )}
        </Section>
      )}

      <Section title="Payments">
        <Row first label="Payment Method" value="Apple Pay" onPress={() => {}} />
        <Row label="Payout Method" value="Venmo" onPress={() => {}} />
      </Section>

      {isCommish && !synced ? (
        <Section title="Danger Zone">
          <Row first label="Archive League" sub="Move to history without deleting" onPress={() => {}} />
        </Section>
      ) : null}

      <Text className="mt-2 px-3 text-center text-[12px] text-muted-foreground">Commissioner · v1.0</Text>
    </WorkflowShell>
  );
}
