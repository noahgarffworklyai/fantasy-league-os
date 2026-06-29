import { useState, type ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Star,
  Sun,
  SunMoon,
} from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Empty, Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import { Divider } from '@/components/ui/Card';
import { Toggle as Switch } from '@/components/ui/Toggle';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useTheme, useThemeTokens, type ThemePreference } from '@/lib/theme';

type View2 =
  | 'home'
  | 'account'
  | 'notifications'
  | 'appearance'
  | 'connected'
  | 'payments'
  | 'privacy'
  | 'watchlist'
  | 'help'
  | 'about';

export default function ProfilePage() {
  const [view, setView] = useState<View2>('home');
  const { signOut } = useLeague();
  const nav = useNav();
  const { hex, layout, surfaces } = useThemeTokens();
  const chevron = <ChevronRight size={16} color={hex.mutedForeground} />;

  if (view === 'account') return <AccountView onBack={() => setView('home')} />;
  if (view === 'notifications') return <NotificationsView onBack={() => setView('home')} />;
  if (view === 'appearance') return <AppearanceView onBack={() => setView('home')} />;
  if (view === 'connected') return <ConnectedView onBack={() => setView('home')} />;
  if (view === 'payments') return <PaymentsView onBack={() => setView('home')} />;
  if (view === 'privacy') return <PrivacyView onBack={() => setView('home')} />;
  if (view === 'watchlist') return <WatchlistView onBack={() => setView('home')} />;
  if (view === 'help') return <HelpView onBack={() => setView('home')} />;
  if (view === 'about') return <AboutView onBack={() => setView('home')} />;

  return (
    <WorkflowShell title="Profile" eyebrow="Account">
      <ProfileHeader />

      <Section title="Personal">
        <Row first label="Account" sub="Name, email, password" onPress={() => setView('account')} trailing={chevron} />
        <Row label="Watchlist" sub="Players, teams, leagues you follow" onPress={() => setView('watchlist')} trailing={chevron} />
      </Section>

      <Section title="Preferences">
        <Row first label="Notifications" sub="Alerts, reports, reminders" onPress={() => setView('notifications')} trailing={chevron} />
        <Row label="Appearance" sub="Theme, text size, motion" onPress={() => setView('appearance')} trailing={chevron} />
        <Row label="Privacy" sub="Blocked, visibility, data" onPress={() => setView('privacy')} trailing={chevron} />
      </Section>

      <Section title="Integrations">
        <Row first label="Connected Accounts" sub="ESPN, Sleeper, Yahoo" onPress={() => setView('connected')} trailing={chevron} />
        <Row label="Payments" sub="Cards, Apple Pay, receipts" onPress={() => setView('payments')} trailing={chevron} />
      </Section>

      <Section title="Support">
        <Row first label="Help" sub="Support, FAQ, feedback" onPress={() => setView('help')} trailing={chevron} />
        <Row label="About" sub="Version, licenses" onPress={() => setView('about')} trailing={chevron} />
      </Section>

      <View style={[surfaces.card, { marginTop: 8, marginBottom: 20 }]}>
        <Pressable
          onPress={() => {
            signOut();
            nav.replace('/');
          }}
          style={[layout.row, { justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 16 }]}
        >
          <LogOut size={16} color={hex.danger} />
          <Text variant="body" style={{ color: hex.danger }}>
            Log out
          </Text>
        </Pressable>
      </View>

      <Text variant="caption" muted style={{ marginTop: 24, textAlign: 'center' }}>
        League settings live in Commissioner → League.
      </Text>
    </WorkflowShell>
  );
}

function ProfileHeader() {
  const { hex, layout, surfaces, toneBg } = useThemeTokens();
  return (
    <View style={[surfaces.card, { marginBottom: 20, paddingHorizontal: 20, paddingVertical: 20 }]}>
      <View style={[layout.row, { gap: 16 }]}>
        <View
          style={{
            height: 64,
            width: 64,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9999,
            backgroundColor: toneBg.success,
          }}
        >
          <Text variant="statValue" style={{ fontSize: 24 }}>
            JM
          </Text>
        </View>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="statValue" numberOfLines={1}>
            Jordan Miles
          </Text>
          <Text variant="subtitle" numberOfLines={1}>
            @jmiles · Member since 2023
          </Text>
          <Text variant="bodyMuted" style={{ marginTop: 4 }}>
            Favorite team: Eagles · 7–4 this season
          </Text>
        </View>
        <View
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9999,
            backgroundColor: hex.surface,
          }}
        >
          <Pencil size={16} color={hex.foreground} />
        </View>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  first,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
}) {
  const { layout } = useThemeTokens();
  return (
    <View>
      {first ? null : <Divider />}
      <View style={[layout.row, { gap: 12, paddingHorizontal: 16, paddingVertical: 14 }]}>
        <View style={[layout.flex1, { minWidth: 0 }]}>
          <Text variant="body">{label}</Text>
          {sub ? <Text variant="bodyMuted">{sub}</Text> : null}
        </View>
        <Switch on={value} onChange={onChange} />
      </View>
    </View>
  );
}

function AccountView({ onBack }: { onBack: () => void }) {
  return (
    <WorkflowShell title="Account" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Identity">
        <Row first label="Name" value="Jordan Miles" onPress={() => {}} />
        <Row label="Username" value="@jmiles" onPress={() => {}} />
        <Row label="Email" value="jordan@example.com" onPress={() => {}} />
        <Row label="Phone" value="+1 (415) 555-0142" onPress={() => {}} />
      </Section>
      <Section title="Security">
        <Row first label="Password" value="Change" onPress={() => {}} />
        <Row label="Two-Factor Authentication" value="Off" onPress={() => {}} />
      </Section>
      <Section title="Account actions">
        <Row first label="Log out" onPress={() => {}} />
        <Row label="Delete account" onPress={() => {}} />
      </Section>
    </WorkflowShell>
  );
}

const NOTIF_CATEGORIES = [
  'League Activity',
  'Trade Alerts',
  'Waiver Alerts',
  'Player News',
  'Injury Updates',
  'Fantasy Reports',
  'Draft Reminders',
  'Payment Reminders',
  'Payout Updates',
  'General Announcements',
  'Support',
];

function NotificationsView({ onBack }: { onBack: () => void }) {
  const [push, setPush] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIF_CATEGORIES.map((c) => [c, true])),
  );
  const [channels, setChannels] = useState({ push: true, email: true, sms: false });
  return (
    <WorkflowShell title="Notifications" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Channels">
        <ToggleRow first label="Push notifications" value={channels.push} onChange={(v) => setChannels({ ...channels, push: v })} />
        <ToggleRow label="Email" value={channels.email} onChange={(v) => setChannels({ ...channels, email: v })} />
        <ToggleRow label="SMS" sub="Coming soon" value={channels.sms} onChange={() => {}} />
      </Section>
      <Section title="Categories">
        {NOTIF_CATEGORIES.map((cat, i) => (
          <ToggleRow key={cat} first={i === 0} label={cat} value={!!push[cat]} onChange={(v) => setPush({ ...push, [cat]: v })} />
        ))}
      </Section>
    </WorkflowShell>
  );
}

function AppearanceView({ onBack }: { onBack: () => void }) {
  const { preference, setPreference } = useTheme();
  const { hex, layout, toneBg, toneFg } = useThemeTokens();
  const [fontSize, setFontSize] = useState(2);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dynamicType, setDynamicType] = useState(true);
  const themes: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: SunMoon },
  ];
  return (
    <WorkflowShell title="Appearance" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Theme">
        <View style={[layout.row, { gap: 8, padding: 8 }]}>
          {themes.map(({ id, label, icon: IconComp }) => {
            const sel = preference === id;
            return (
              <Pressable
                key={id}
                onPress={() => setPreference(id)}
                style={[
                  layout.flex1,
                  layout.centered,
                  {
                    gap: 8,
                    borderRadius: 20,
                    paddingVertical: 16,
                    backgroundColor: sel ? toneBg.success : hex.surface,
                  },
                ]}
              >
                <IconComp size={20} color={sel ? hex.success : hex.foreground} />
                <Text variant="link" style={{ color: sel ? toneFg.success : hex.foreground }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section title="Text">
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={[layout.rowBetween, { marginBottom: 12 }]}>
            <Text variant="body">Font size</Text>
            <Text variant="bodyMuted">{['XS', 'S', 'M', 'L', 'XL'][fontSize]}</Text>
          </View>
          <View style={[layout.row, { gap: 8 }]}>
            {['XS', 'S', 'M', 'L', 'XL'].map((s, i) => (
              <Pressable
                key={s}
                onPress={() => setFontSize(i)}
                style={[
                  layout.flex1,
                  layout.centered,
                  {
                    borderRadius: 12,
                    paddingVertical: 8,
                    backgroundColor: i === fontSize ? toneBg.success : hex.surface,
                  },
                ]}
              >
                <Text variant="link" style={{ color: i === fontSize ? toneFg.success : hex.foreground, fontWeight: '600' }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ToggleRow label="Dynamic Type" value={dynamicType} onChange={setDynamicType} />
      </Section>
      <Section title="Accessibility">
        <ToggleRow first label="Reduce motion" value={reduceMotion} onChange={setReduceMotion} />
        <Row label="More accessibility options" trailing={<ChevronRight size={16} color={hex.mutedForeground} />} onPress={() => {}} />
      </Section>
    </WorkflowShell>
  );
}

function ConnectedView({ onBack }: { onBack: () => void }) {
  const { hex, surfaces } = useThemeTokens();
  const platforms = [
    { name: 'ESPN', status: 'Connected', sync: '2 min ago' },
    { name: 'Sleeper', status: 'Connected', sync: '12 min ago' },
    { name: 'Yahoo', status: 'Disconnected', sync: '—' },
  ];
  return (
    <WorkflowShell title="Connected Accounts" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Fantasy platforms">
        {platforms.map((p, i) => (
          <Row
            key={p.name}
            first={i === 0}
            label={p.name}
            sub={`${p.status} · Last sync ${p.sync}`}
            trailing={
              <View
                style={[
                  surfaces.pill,
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: p.status === 'Connected' ? hex.muted : hex.success,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: p.status === 'Connected' ? hex.foreground : hex.primaryForeground }}
                >
                  {p.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </Text>
              </View>
            }
          />
        ))}
      </Section>
      <Text variant="caption" muted style={{ paddingHorizontal: 8 }}>
        Commissioner syncs scoring, rosters, and matchups from your connected platforms.
      </Text>
    </WorkflowShell>
  );
}

function PaymentsView({ onBack }: { onBack: () => void }) {
  const { hex, layout } = useThemeTokens();
  const cards = [
    { brand: 'Visa', last4: '4242', default: true },
    { brand: 'Apple Pay', last4: 'iPhone', default: false },
  ];
  return (
    <WorkflowShell title="Payments" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Payment methods">
        {cards.length === 0 ? (
          <Empty title="No payment methods" sub="Add a card to pay league dues in one tap." />
        ) : (
          cards.map((card, i) => (
            <Row
              key={card.brand + card.last4}
              first={i === 0}
              label={card.brand}
              sub={`•••• ${card.last4}${card.default ? ' · Default' : ''}`}
              trailing={<ChevronRight size={16} color={hex.mutedForeground} />}
              onPress={() => {}}
            />
          ))
        )}
        <Divider />
        <Pressable style={[layout.row, { gap: 8, paddingHorizontal: 16, paddingVertical: 14 }]}>
          <Plus size={16} color={hex.success} />
          <Text variant="body" style={{ color: hex.success }}>
            Add payment method
          </Text>
        </Pressable>
      </Section>
      <Section title="History">
        <Row first label="Payment history" trailing={<ChevronRight size={16} color={hex.mutedForeground} />} onPress={() => {}} />
        <Row label="Receipts" trailing={<ChevronRight size={16} color={hex.mutedForeground} />} onPress={() => {}} />
        <Row label="Tax documents" sub="Coming soon" />
      </Section>
      <Text variant="caption" muted style={{ paddingHorizontal: 8 }}>
        League payouts are managed inside Treasury.
      </Text>
    </WorkflowShell>
  );
}

function PrivacyView({ onBack }: { onBack: () => void }) {
  const { hex } = useThemeTokens();
  const [visibility, setVisibility] = useState<'public' | 'leagues' | 'private'>('leagues');
  const [dataShare, setDataShare] = useState(true);
  return (
    <WorkflowShell title="Privacy" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="People">
        <Row first label="Blocked users" value="0" onPress={() => {}} trailing={<ChevronRight size={16} color={hex.mutedForeground} />} />
        <Row label="Muted users" value="2" onPress={() => {}} trailing={<ChevronRight size={16} color={hex.mutedForeground} />} />
        <Row label="Player chat preferences" onPress={() => {}} trailing={<ChevronRight size={16} color={hex.mutedForeground} />} />
      </Section>
      <Section title="Visibility">
        {(['public', 'leagues', 'private'] as const).map((v, i) => (
          <Row
            key={v}
            first={i === 0}
            label={v === 'public' ? 'Public' : v === 'leagues' ? 'League members only' : 'Private'}
            onPress={() => setVisibility(v)}
            trailing={visibility === v ? <Check size={16} color={hex.success} /> : undefined}
          />
        ))}
      </Section>
      <Section title="Data">
        <ToggleRow first label="Allow data sharing" sub="Improves AI recommendations" value={dataShare} onChange={setDataShare} />
        <Row label="Download my data" onPress={() => {}} trailing={<ChevronRight size={16} color={hex.mutedForeground} />} />
        <Row label="Delete my data" onPress={() => {}} trailing={<ChevronRight size={16} color={hex.mutedForeground} />} />
      </Section>
    </WorkflowShell>
  );
}

function WatchlistView({ onBack }: { onBack: () => void }) {
  const { hex } = useThemeTokens();
  const players = ['Justin Jefferson', 'Bijan Robinson', 'Sam LaPorta'];
  const teams = ['Eagles', '49ers'];
  const leagues = ['Dynasty Vets'];
  const star = <Star size={16} color={hex.success} fill={hex.success} />;
  return (
    <WorkflowShell title="Watchlist" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Players">
        {players.map((p, i) => (
          <Row key={p} first={i === 0} label={p} trailing={star} onPress={() => {}} />
        ))}
      </Section>
      <Section title="Teams">
        {teams.map((t, i) => (
          <Row key={t} first={i === 0} label={t} trailing={star} onPress={() => {}} />
        ))}
      </Section>
      <Section title="Leagues">
        {leagues.map((l, i) => (
          <Row key={l} first={i === 0} label={l} trailing={star} onPress={() => {}} />
        ))}
      </Section>
      <Section title="Notifications">
        <Row first label="Watchlist alerts" value="On" onPress={() => {}} trailing={<ChevronRight size={16} color={hex.mutedForeground} />} />
      </Section>
      <Text variant="caption" muted style={{ paddingHorizontal: 8 }}>
        Watchlist preferences apply across every league.
      </Text>
    </WorkflowShell>
  );
}

function HelpView({ onBack }: { onBack: () => void }) {
  const { hex } = useThemeTokens();
  const chevron = <ChevronRight size={16} color={hex.mutedForeground} />;
  return (
    <WorkflowShell title="Help" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Support">
        <Row first label="Support center" onPress={() => {}} trailing={chevron} />
        <Row label="FAQ" onPress={() => {}} trailing={chevron} />
        <Row label="Contact support" onPress={() => {}} trailing={chevron} />
      </Section>
      <Section title="Feedback">
        <Row first label="Report a bug" onPress={() => {}} trailing={chevron} />
        <Row label="Feature request" onPress={() => {}} trailing={chevron} />
      </Section>
      <Section title="Policies">
        <Row first label="Community guidelines" onPress={() => {}} trailing={chevron} />
        <Row label="Terms of service" onPress={() => {}} trailing={chevron} />
        <Row label="Privacy policy" onPress={() => {}} trailing={chevron} />
      </Section>
    </WorkflowShell>
  );
}

function AboutView({ onBack }: { onBack: () => void }) {
  const { hex } = useThemeTokens();
  const chevron = <ChevronRight size={16} color={hex.mutedForeground} />;
  return (
    <WorkflowShell title="About" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="Application">
        <Row first label="Version" value="1.0.0" />
        <Row label="Build" value="2026.06.25" />
        <Row label="Release notes" onPress={() => {}} trailing={chevron} />
      </Section>
      <Section title="Credits">
        <Row first label="Open source licenses" onPress={() => {}} trailing={chevron} />
        <Row label="Acknowledgements" onPress={() => {}} trailing={chevron} />
      </Section>
      <Text variant="caption" muted style={{ textAlign: 'center' }}>
        © 2026 Commissioner
      </Text>
    </WorkflowShell>
  );
}
