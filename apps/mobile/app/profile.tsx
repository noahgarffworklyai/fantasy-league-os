import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
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
import { Pressable, Text } from '@/components/ui/primitives';
import { Empty, Row, Section, WorkflowShell } from '@/components/ui/WorkflowShell';
import { Divider } from '@/components/ui/Card';
import { Toggle as Switch } from '@/components/ui/Toggle';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors, useTheme, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/cn';

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
  const c = useColors();
  const chevron = <ChevronRight size={16} color={c.mutedForeground} />;

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

      <View className="mt-2 overflow-hidden rounded-[24px] bg-surface-elevated">
        <Pressable
          onPress={() => {
            signOut();
            nav.replace('/');
          }}
          className="w-full flex-row items-center justify-center gap-2 px-4 py-4"
        >
          <LogOut size={16} color={c.destructive} />
          <Text className="text-[15px] font-medium text-destructive">Log out</Text>
        </Pressable>
      </View>

      <Text className="mt-6 text-center text-[11px] text-muted-foreground">
        League settings live in Commissioner → League.
      </Text>
    </WorkflowShell>
  );
}

function ProfileHeader() {
  const c = useColors();
  return (
    <View className="mb-5 overflow-hidden rounded-[30px] bg-surface-elevated px-5 py-5">
      <View className="flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <Text className="text-[24px] font-semibold">JM</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[20px] font-semibold tracking-tighter2" numberOfLines={1}>
            Jordan Miles
          </Text>
          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
            @jmiles · Member since 2023
          </Text>
          <Text className="mt-1 text-[12px] text-muted-foreground">
            Favorite team: Eagles · 7–4 this season
          </Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-surface">
          <Pencil size={16} color={c.foreground} />
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
  return (
    <View>
      {first ? null : <Divider />}
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-medium tracking-tightish">{label}</Text>
          {sub ? <Text className="text-[12px] text-muted-foreground">{sub}</Text> : null}
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
  const c = useColors();
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
        <View className="flex-row gap-2 p-2">
          {themes.map(({ id, label, icon: IconComp }) => {
            const sel = preference === id;
            return (
              <Pressable
                key={id}
                onPress={() => setPreference(id)}
                className={cn('flex-1 items-center gap-2 rounded-[20px] py-4', sel ? 'bg-success/15' : 'bg-surface')}
              >
                <IconComp size={20} color={sel ? c.success : c.foreground} />
                <Text className={cn('text-[13px] font-medium', sel ? 'text-success' : 'text-foreground')}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section title="Text">
        <View className="px-4 py-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[15px] font-medium">Font size</Text>
            <Text className="text-[12px] text-muted-foreground">{['XS', 'S', 'M', 'L', 'XL'][fontSize]}</Text>
          </View>
          <View className="flex-row gap-2">
            {['XS', 'S', 'M', 'L', 'XL'].map((s, i) => (
              <Pressable
                key={s}
                onPress={() => setFontSize(i)}
                className={cn('flex-1 items-center rounded-xl py-2', i === fontSize ? 'bg-success/15' : 'bg-surface')}
              >
                <Text className={cn('text-[13px] font-semibold', i === fontSize ? 'text-success' : 'text-foreground')}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <ToggleRow label="Dynamic Type" value={dynamicType} onChange={setDynamicType} />
      </Section>
      <Section title="Accessibility">
        <ToggleRow first label="Reduce motion" value={reduceMotion} onChange={setReduceMotion} />
        <Row label="More accessibility options" trailing={<ChevronRight size={16} color={c.mutedForeground} />} onPress={() => {}} />
      </Section>
    </WorkflowShell>
  );
}

function ConnectedView({ onBack }: { onBack: () => void }) {
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
              <View className={cn('rounded-full px-3 py-1.5', p.status === 'Connected' ? 'bg-muted' : 'bg-success')}>
                <Text className={cn('text-[12px] font-medium', p.status === 'Connected' ? 'text-foreground' : 'text-white')}>
                  {p.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </Text>
              </View>
            }
          />
        ))}
      </Section>
      <Text className="px-2 text-[12px] text-muted-foreground">
        Commissioner syncs scoring, rosters, and matchups from your connected platforms.
      </Text>
    </WorkflowShell>
  );
}

function PaymentsView({ onBack }: { onBack: () => void }) {
  const c = useColors();
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
              trailing={<ChevronRight size={16} color={c.mutedForeground} />}
              onPress={() => {}}
            />
          ))
        )}
        <Divider />
        <Pressable className="w-full flex-row items-center gap-2 px-4 py-3.5">
          <Plus size={16} color={c.success} />
          <Text className="text-[15px] font-medium text-success">Add payment method</Text>
        </Pressable>
      </Section>
      <Section title="History">
        <Row first label="Payment history" trailing={<ChevronRight size={16} color={c.mutedForeground} />} onPress={() => {}} />
        <Row label="Receipts" trailing={<ChevronRight size={16} color={c.mutedForeground} />} onPress={() => {}} />
        <Row label="Tax documents" sub="Coming soon" />
      </Section>
      <Text className="px-2 text-[12px] text-muted-foreground">
        League payouts are managed inside Treasury.
      </Text>
    </WorkflowShell>
  );
}

function PrivacyView({ onBack }: { onBack: () => void }) {
  const c = useColors();
  const [visibility, setVisibility] = useState<'public' | 'leagues' | 'private'>('leagues');
  const [dataShare, setDataShare] = useState(true);
  return (
    <WorkflowShell title="Privacy" eyebrow="Profile" onBack={onBack} backLabel="Profile">
      <Section title="People">
        <Row first label="Blocked users" value="0" onPress={() => {}} trailing={<ChevronRight size={16} color={c.mutedForeground} />} />
        <Row label="Muted users" value="2" onPress={() => {}} trailing={<ChevronRight size={16} color={c.mutedForeground} />} />
        <Row label="Player chat preferences" onPress={() => {}} trailing={<ChevronRight size={16} color={c.mutedForeground} />} />
      </Section>
      <Section title="Visibility">
        {(['public', 'leagues', 'private'] as const).map((v, i) => (
          <Row
            key={v}
            first={i === 0}
            label={v === 'public' ? 'Public' : v === 'leagues' ? 'League members only' : 'Private'}
            onPress={() => setVisibility(v)}
            trailing={visibility === v ? <Check size={16} color={c.success} /> : undefined}
          />
        ))}
      </Section>
      <Section title="Data">
        <ToggleRow first label="Allow data sharing" sub="Improves AI recommendations" value={dataShare} onChange={setDataShare} />
        <Row label="Download my data" onPress={() => {}} trailing={<ChevronRight size={16} color={c.mutedForeground} />} />
        <Row label="Delete my data" onPress={() => {}} trailing={<ChevronRight size={16} color={c.mutedForeground} />} />
      </Section>
    </WorkflowShell>
  );
}

function WatchlistView({ onBack }: { onBack: () => void }) {
  const c = useColors();
  const players = ['Justin Jefferson', 'Bijan Robinson', 'Sam LaPorta'];
  const teams = ['Eagles', '49ers'];
  const leagues = ['Dynasty Vets'];
  const star = <Star size={16} color={c.success} fill={c.success} />;
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
        <Row first label="Watchlist alerts" value="On" onPress={() => {}} trailing={<ChevronRight size={16} color={c.mutedForeground} />} />
      </Section>
      <Text className="px-2 text-[12px] text-muted-foreground">
        Watchlist preferences apply across every league.
      </Text>
    </WorkflowShell>
  );
}

function HelpView({ onBack }: { onBack: () => void }) {
  const c = useColors();
  const chevron = <ChevronRight size={16} color={c.mutedForeground} />;
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
  const c = useColors();
  const chevron = <ChevronRight size={16} color={c.mutedForeground} />;
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
      <Text className="px-2 text-center text-[11px] text-muted-foreground">© 2026 Commissioner</Text>
    </WorkflowShell>
  );
}
