import { useState, type ReactNode } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/Card';
import { useLeague } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useTheme, useThemeTokens } from '@/lib/theme';

type Scoring = 'Standard' | 'Half PPR' | 'PPR';
type DraftType = 'Snake' | 'Auction';

interface Draft {
  name: string;
  size: number;
  scoring: Scoring;
  buyIn: number;
  draftDate: string;
  draftType: DraftType;
}

const STEPS = ['Basics', 'Scoring', 'Dues', 'Draft', 'Review'] as const;

export default function CreateLeaguePage() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();
  const { scheme } = useTheme();
  const { createHostedLeague } = useLeague();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [d, setD] = useState<Draft>({
    name: '',
    size: 12,
    scoring: 'Half PPR',
    buyIn: 100,
    draftDate: '',
    draftType: 'Snake',
  });

  const back = () => (step === 0 ? nav.push('/onboarding') : setStep(step - 1));
  const next = () => setStep(step + 1);

  const canNext =
    (step === 0 && d.name.trim().length > 1) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && d.draftDate.length > 0) ||
    step === 4;

  const create = async () => {
    setSubmitting(true);
    try {
      await createHostedLeague({
        name: d.name,
        size: d.size,
        buyIn: d.buyIn,
        scoring: d.scoring,
        draftType: d.draftType,
        draftDate: d.draftDate || undefined,
      });
      nav.replace('/readiness');
    } catch (e) {
      Alert.alert('Could not create league', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const ink = scheme === 'dark' ? '255,255,255' : '13,13,13';

  return (
    <View style={{ flex: 1, backgroundColor: hex.background }}>
      <View style={{ paddingHorizontal: 24, paddingTop: Math.max(insets.top, 16) }}>
        <View style={layout.rowBetween}>
          <Pressable onPress={back} style={[layout.row, { marginLeft: -8, paddingHorizontal: 8, paddingVertical: 4 }]}>
            <ChevronLeft size={20} color={hex.foreground} />
            <Text variant="body">Back</Text>
          </Pressable>
          <Text variant="eyebrow">
            Step {step + 1} of {STEPS.length}
          </Text>
        </View>
        <View style={[layout.row, { marginTop: 16, gap: 6 }]}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 9999,
                backgroundColor: i <= step ? hex.foreground : `rgba(${ink},0.1)`,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? <BasicsStep d={d} setD={setD} /> : null}
        {step === 1 ? <ScoringStep d={d} setD={setD} /> : null}
        {step === 2 ? <DuesStep d={d} setD={setD} /> : null}
        {step === 3 ? <DraftStep d={d} setD={setD} /> : null}
        {step === 4 ? <ReviewStep d={d} /> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20) }}>
        {step < STEPS.length - 1 ? (
          <Pressable disabled={!canNext} onPress={next} style={[surfaces.primaryButton, !canNext ? { opacity: 0.4 } : null]}>
            <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
              Continue
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={create} disabled={submitting} style={[surfaces.primaryButton, submitting ? { opacity: 0.5 } : null]}>
            <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 17 }}>
              {submitting ? 'Creating…' : 'Create League'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ paddingTop: 24, paddingBottom: 24 }}>
      <Text variant="titleXl">{title}</Text>
      {sub ? (
        <Text variant="subtitle" style={{ marginTop: 8 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ paddingBottom: 16 }}>
      <Text variant="eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function PickerRow<T extends string | number>({
  options,
  value,
  onChange,
  big,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  big?: boolean;
}) {
  const { hex, layout } = useThemeTokens();
  return (
    <View style={[layout.row, { gap: 8 }]}>
      {options.map((o) => {
        const a = o === value;
        return (
          <Pressable
            key={String(o)}
            onPress={() => onChange(o)}
            style={[
              layout.flex1,
              layout.centered,
              {
                height: big ? 56 : 48,
                borderRadius: 16,
                backgroundColor: a ? hex.primary : hex.surfaceElevated,
              },
            ]}
          >
            <Text
              variant={big ? 'titleMd' : 'bodySm'}
              style={{ color: a ? hex.primaryForeground : hex.foreground }}
            >
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BasicsStep({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  return (
    <View>
      <StepTitle title="Name your league" sub="You can edit these anytime." />
      <Field label="League Name">
        <Input value={d.name} placeholder="Jackson Family League" onChangeText={(name) => setD({ ...d, name })} />
      </Field>
      <Field label="League Size">
        <PickerRow options={[8, 10, 12, 14]} value={d.size} onChange={(size) => setD({ ...d, size })} big />
      </Field>
    </View>
  );
}

function ScoringStep({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  const { surfaces, layout } = useThemeTokens();
  return (
    <View>
      <StepTitle title="Scoring" sub="Pick how points are awarded." />
      <PickerRow
        options={['Standard', 'Half PPR', 'PPR'] as Scoring[]}
        value={d.scoring}
        onChange={(scoring) => setD({ ...d, scoring })}
      />
      <View style={[surfaces.roundedCard, { marginTop: 24, padding: 16 }]}>
        <Text variant="bodyMuted" style={{ fontSize: 13 }}>
          {d.scoring === 'Standard'
            ? 'Receptions do not score. Yards and touchdowns only.'
            : d.scoring === 'Half PPR'
              ? '0.5 points per reception. Balanced default.'
              : '1 point per reception. Rewards possession receivers.'}
        </Text>
      </View>
    </View>
  );
}

function DuesStep({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  const { surfaces } = useThemeTokens();
  const pot = d.buyIn * d.size;
  const fee = Math.round(pot * 0.03);
  const payout = pot - fee;
  return (
    <View>
      <StepTitle title="Buy-in & prizes" sub="Commissioner handles the pot." />
      <Field label="Buy In (per team)">
        <Input
          keyboardType="numeric"
          value={String(d.buyIn)}
          onChangeText={(t) => setD({ ...d, buyIn: Number(t.replace(/[^0-9]/g, '')) || 0 })}
        />
      </Field>
      <View style={[surfaces.roundedCard, { padding: 16 }]}>
        <DuesRow label="Total pot" value={`$${pot.toLocaleString()}`} strong />
        <DuesRow label="Platform fee (3%)" value={`-$${fee.toLocaleString()}`} />
        <DuesRow label="Distributable" value={`$${payout.toLocaleString()}`} strong />
      </View>
      <View style={[surfaces.roundedCard, { marginTop: 16, padding: 16 }]}>
        <Text variant="eyebrow">Prize structure</Text>
        <DuesRow label="1st place" value={`$${Math.round(payout * 0.7).toLocaleString()}`} />
        <DuesRow label="2nd place" value={`$${Math.round(payout * 0.2).toLocaleString()}`} />
        <DuesRow label="Regular season" value={`$${Math.round(payout * 0.1).toLocaleString()}`} />
      </View>
    </View>
  );
}

function DuesRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { layout } = useThemeTokens();
  return (
    <View style={[layout.rowBetween, { paddingVertical: 6 }]}>
      <Text variant="bodyMuted" style={{ fontSize: 14 }}>
        {label}
      </Text>
      <Text variant={strong ? 'titleMd' : 'body'}>{value}</Text>
    </View>
  );
}

function DraftStep({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  const { hex, layout } = useThemeTokens();
  const { scheme } = useTheme();
  const inkOnPrimary = scheme === 'dark' ? '20,20,20' : '252,252,252';
  return (
    <View>
      <StepTitle title="Draft setup" sub="When and how you'll draft." />
      <Field label="Draft Date">
        <Input value={d.draftDate} placeholder="Sun, Sep 6 · 7:00 PM" onChangeText={(draftDate) => setD({ ...d, draftDate })} />
      </Field>
      <Field label="Draft Type">
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={() => setD({ ...d, draftType: 'Snake' })}
            style={[
              layout.rowBetween,
              {
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: d.draftType === 'Snake' ? hex.primary : hex.surfaceElevated,
              },
            ]}
          >
            <View>
              <Text
                variant="titleMd"
                style={{ color: d.draftType === 'Snake' ? hex.primaryForeground : hex.foreground }}
              >
                Snake Draft
              </Text>
              <Text
                variant="bodyMuted"
                style={{
                  fontSize: 13,
                  color: d.draftType === 'Snake' ? `rgba(${inkOnPrimary},0.7)` : hex.mutedForeground,
                }}
              >
                Order reverses each round.
              </Text>
            </View>
            {d.draftType === 'Snake' ? <Check size={20} color={hex.background} /> : null}
          </Pressable>
          <View
            style={[
              layout.rowBetween,
              {
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: hex.surfaceElevated,
                opacity: 0.4,
              },
            ]}
          >
            <View>
              <Text variant="titleMd">Auction Draft</Text>
              <Text variant="bodyMuted" style={{ fontSize: 13 }}>
                Coming soon.
              </Text>
            </View>
          </View>
        </View>
      </Field>
    </View>
  );
}

function ReviewStep({ d }: { d: Draft }) {
  const nav = useNav();
  const { surfaces, layout } = useThemeTokens();
  return (
    <View>
      <StepTitle title="Review" sub="Looks good? You can edit later." />
      <View style={surfaces.roundedCard}>
        <ReviewRow label="League" value={d.name || '—'} />
        <ReviewRow label="Size" value={`${d.size} teams`} divided />
        <ReviewRow label="Scoring" value={d.scoring} divided />
        <ReviewRow label="Buy in" value={`$${d.buyIn} / team`} divided />
        <ReviewRow label="Pot" value={`$${(d.buyIn * d.size).toLocaleString()}`} divided />
        <ReviewRow label="Draft" value={d.draftType + (d.draftDate ? ` · ${d.draftDate}` : '')} divided />
      </View>
      <Text variant="bodyMuted" style={{ marginTop: 12, paddingHorizontal: 4 }}>
        You'll become the commissioner of this league.
      </Text>
      <Pressable onPress={() => nav.push('/onboarding')} style={[layout.centered, { paddingTop: 16 }]}>
        <Text variant="link" muted>
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}

function ReviewRow({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  const { layout } = useThemeTokens();
  return (
    <View>
      {divided ? <Divider /> : null}
      <View style={[layout.rowBetween, { paddingHorizontal: 16, paddingVertical: 16 }]}>
        <Text variant="bodyMuted" style={{ fontSize: 14 }}>
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}
