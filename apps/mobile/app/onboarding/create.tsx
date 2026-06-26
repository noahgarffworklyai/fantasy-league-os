import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/Card';
import { makeId, shortNameFor, useLeague, type League } from '@/lib/league-context';
import { useNav } from '@/lib/nav';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/cn';

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
  const { addLeague } = useLeague();
  const [step, setStep] = useState(0);
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

  const create = () => {
    const league: League = {
      id: makeId(),
      name: d.name,
      shortName: shortNameFor(d.name),
      type: 'hosted',
      role: 'commissioner',
      stage: 'preseason',
      members: d.size,
      potUsd: 0,
      week: 0,
      record: '—',
      rank: 0,
      size: d.size,
      scoring: d.scoring,
      buyIn: d.buyIn,
      draftDate: d.draftDate,
      draftType: d.draftType,
      joined: 1,
      paid: 0,
      ready: false,
    };
    addLeague(league);
    nav.replace('/readiness');
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-6" style={{ paddingTop: Math.max(insets.top, 16) }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={back} className="-ml-2 flex-row items-center gap-0.5 rounded-full px-2 py-1">
            <ChevronLeft size={20} color={useColors().foreground} />
            <Text className="text-[15px]">Back</Text>
          </Pressable>
          <Text className="text-[12px] font-medium uppercase tracking-widest text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </Text>
        </View>
        <View className="mt-4 flex-row gap-1.5">
          {STEPS.map((_, i) => (
            <View key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-foreground' : 'bg-foreground/10')} />
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-2" keyboardShouldPersistTaps="handled">
        {step === 0 ? <BasicsStep d={d} setD={setD} /> : null}
        {step === 1 ? <ScoringStep d={d} setD={setD} /> : null}
        {step === 2 ? <DuesStep d={d} setD={setD} /> : null}
        {step === 3 ? <DraftStep d={d} setD={setD} /> : null}
        {step === 4 ? <ReviewStep d={d} /> : null}
      </ScrollView>

      <View className="px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        {step < STEPS.length - 1 ? (
          <Pressable
            disabled={!canNext}
            onPress={next}
            className={cn('h-14 w-full items-center justify-center rounded-full bg-foreground', !canNext ? 'opacity-40' : '')}
          >
            <Text className="text-[17px] font-semibold tracking-tightish text-background">Continue</Text>
          </Pressable>
        ) : (
          <Pressable onPress={create} className="h-14 w-full items-center justify-center rounded-full bg-foreground">
            <Text className="text-[17px] font-semibold tracking-tightish text-background">Create League</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View className="pb-6 pt-6">
      <Text className="text-[28px] font-semibold leading-tight tracking-tighter2">{title}</Text>
      {sub ? <Text className="mt-2 text-[15px] text-muted-foreground">{sub}</Text> : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="pb-4">
      <Text className="mb-2 text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
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
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const a = o === value;
        return (
          <Pressable
            key={String(o)}
            onPress={() => onChange(o)}
            className={cn(
              'flex-1 items-center justify-center rounded-2xl',
              big ? 'h-14' : 'h-12',
              a ? 'bg-foreground' : 'bg-surface-elevated',
            )}
          >
            <Text
              className={cn(
                'tracking-tightish',
                big ? 'text-[17px] font-semibold' : 'text-[14px] font-medium',
                a ? 'text-background' : 'text-foreground',
              )}
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
  return (
    <View>
      <StepTitle title="Scoring" sub="Pick how points are awarded." />
      <PickerRow
        options={['Standard', 'Half PPR', 'PPR'] as Scoring[]}
        value={d.scoring}
        onChange={(scoring) => setD({ ...d, scoring })}
      />
      <View className="mt-6 rounded-2xl bg-surface-elevated p-4">
        <Text className="text-[13px] text-muted-foreground">
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
      <View className="rounded-[24px] bg-surface-elevated p-4">
        <DuesRow label="Total pot" value={`$${pot.toLocaleString()}`} strong />
        <DuesRow label="Platform fee (3%)" value={`-$${fee.toLocaleString()}`} />
        <DuesRow label="Distributable" value={`$${payout.toLocaleString()}`} strong />
      </View>
      <View className="mt-4 rounded-[24px] bg-surface-elevated p-4">
        <Text className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
          Prize structure
        </Text>
        <DuesRow label="1st place" value={`$${Math.round(payout * 0.7).toLocaleString()}`} />
        <DuesRow label="2nd place" value={`$${Math.round(payout * 0.2).toLocaleString()}`} />
        <DuesRow label="Regular season" value={`$${Math.round(payout * 0.1).toLocaleString()}`} />
      </View>
    </View>
  );
}

function DuesRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-[14px] text-muted-foreground">{label}</Text>
      <Text className={cn('tracking-tightish', strong ? 'text-[17px] font-semibold' : 'text-[15px]')}>
        {value}
      </Text>
    </View>
  );
}

function DraftStep({ d, setD }: { d: Draft; setD: (d: Draft) => void }) {
  const c = useColors();
  return (
    <View>
      <StepTitle title="Draft setup" sub="When and how you'll draft." />
      <Field label="Draft Date">
        <Input value={d.draftDate} placeholder="Sun, Sep 6 · 7:00 PM" onChangeText={(draftDate) => setD({ ...d, draftDate })} />
      </Field>
      <Field label="Draft Type">
        <View className="gap-2">
          <Pressable
            onPress={() => setD({ ...d, draftType: 'Snake' })}
            className={cn(
              'w-full flex-row items-center justify-between rounded-2xl px-4 py-4',
              d.draftType === 'Snake' ? 'bg-foreground' : 'bg-surface-elevated',
            )}
          >
            <View>
              <Text className={cn('text-[16px] font-semibold tracking-tightish', d.draftType === 'Snake' ? 'text-background' : 'text-foreground')}>
                Snake Draft
              </Text>
              <Text className={cn('text-[13px]', d.draftType === 'Snake' ? 'text-background/70' : 'text-muted-foreground')}>
                Order reverses each round.
              </Text>
            </View>
            {d.draftType === 'Snake' ? <Check size={20} color={c.background} /> : null}
          </Pressable>
          <View className="w-full flex-row items-center justify-between rounded-2xl bg-surface-elevated px-4 py-4 opacity-40">
            <View>
              <Text className="text-[16px] font-semibold tracking-tightish text-foreground">Auction Draft</Text>
              <Text className="text-[13px] text-muted-foreground">Coming soon.</Text>
            </View>
          </View>
        </View>
      </Field>
    </View>
  );
}

function ReviewStep({ d }: { d: Draft }) {
  const nav = useNav();
  return (
    <View>
      <StepTitle title="Review" sub="Looks good? You can edit later." />
      <View className="overflow-hidden rounded-[24px] bg-surface-elevated">
        <ReviewRow label="League" value={d.name || '—'} />
        <ReviewRow label="Size" value={`${d.size} teams`} divided />
        <ReviewRow label="Scoring" value={d.scoring} divided />
        <ReviewRow label="Buy in" value={`$${d.buyIn} / team`} divided />
        <ReviewRow label="Pot" value={`$${(d.buyIn * d.size).toLocaleString()}`} divided />
        <ReviewRow label="Draft" value={d.draftType + (d.draftDate ? ` · ${d.draftDate}` : '')} divided />
      </View>
      <Text className="mt-3 px-1 text-[12px] text-muted-foreground">
        You'll become the commissioner of this league.
      </Text>
      <Pressable onPress={() => nav.push('/onboarding')} className="items-center pt-4">
        <Text className="text-[13px] text-muted-foreground">Cancel</Text>
      </Pressable>
    </View>
  );
}

function ReviewRow({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  return (
    <View>
      {divided ? <Divider /> : null}
      <View className="flex-row items-center justify-between px-4 py-4">
        <Text className="text-[14px] text-muted-foreground">{label}</Text>
        <Text className="text-[15px] font-medium tracking-tightish">{value}</Text>
      </View>
    </View>
  );
}
