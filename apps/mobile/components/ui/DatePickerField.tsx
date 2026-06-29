import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable, Text } from '@/components/ui/primitives';
import { useThemeTokens } from '@/lib/theme';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
};

type Period = 'AM' | 'PM';

const MINUTES = [0, 15, 30, 45] as const;
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const PERIODS: Period[] = ['AM', 'PM'];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildDateOptions(minimumDate: Date, count = 90): Date[] {
  const start = startOfDay(minimumDate);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function nearestMinute(minute: number) {
  return MINUTES.reduce((best, option) =>
    Math.abs(option - minute) < Math.abs(best - minute) ? option : best,
  );
}

function get12hParts(date: Date) {
  const period: Period = date.getHours() >= 12 ? 'PM' : 'AM';
  const hour = date.getHours() % 12 || 12;
  return { hour, minute: nearestMinute(date.getMinutes()), period };
}

function setTime12h(base: Date, hour: number, minute: number, period: Period): Date {
  let hours24 = hour % 12;
  if (period === 'PM') hours24 += 12;
  const next = new Date(base);
  next.setHours(hours24, minute, 0, 0);
  return next;
}

function formatDraftDateTime(date: Date) {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOption(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatMinute(minute: number) {
  return minute === 0 ? ':00' : `:${String(minute).padStart(2, '0')}`;
}

function ChipPicker<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  const { hex, layout } = useThemeTokens();
  return (
    <View style={{ gap: 8 }}>
      <Text variant="caption" muted style={{ paddingHorizontal: 4 }}>
        {label}
      </Text>
      <View style={[layout.rowWrap, { gap: 8 }]}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={String(option)}
              onPress={() => onChange(option)}
              style={{
                minWidth: 52,
                height: 44,
                borderRadius: 14,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? hex.primary : hex.background,
                borderWidth: 1,
                borderColor: active ? hex.primary : hex.hairline,
              }}
            >
              <Text variant="bodySm" style={{ color: active ? hex.primaryForeground : hex.foreground }}>
                {format(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Date + time picker using in-app controls (no native module). */
export function DatePickerField({
  value,
  onChange,
  minimumDate = new Date(),
  placeholder = 'Select draft date & time',
}: Props) {
  const { hex } = useThemeTokens();
  const current = value ?? minimumDate;
  const dateOptions = useMemo(() => buildDateOptions(minimumDate), [minimumDate]);
  const selectedKey = dateKey(current);
  const { hour, minute, period } = get12hParts(current);

  const setDate = (date: Date) => {
    onChange(setTime12h(date, hour, minute, period));
  };

  const setHour = (nextHour: number) => {
    onChange(setTime12h(current, nextHour, minute, period));
  };

  const setMinute = (nextMinute: number) => {
    onChange(setTime12h(current, hour, nextMinute, period));
  };

  const setPeriod = (nextPeriod: Period) => {
    onChange(setTime12h(current, hour, minute, nextPeriod));
  };

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: hex.surfaceElevated,
        padding: 12,
        gap: 16,
      }}
    >
      <Text variant="eyebrow" style={{ paddingHorizontal: 4 }}>
        {value ? formatDraftDateTime(value) : placeholder}
      </Text>

      <View style={{ gap: 8 }}>
        <Text variant="caption" muted style={{ paddingHorizontal: 4 }}>
          Date
        </Text>
        <ScrollView
          style={{ maxHeight: 168 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {dateOptions.map((date) => {
            const active = dateKey(date) === selectedKey;
            return (
              <Pressable
                key={date.toISOString()}
                onPress={() => setDate(date)}
                style={{
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  marginBottom: 6,
                  backgroundColor: active ? hex.primary : hex.background,
                  borderWidth: 1,
                  borderColor: active ? hex.primary : hex.hairline,
                }}
              >
                <Text variant="body" style={{ color: active ? hex.primaryForeground : hex.foreground }}>
                  {formatDateOption(date)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ChipPicker label="Hour" options={HOURS_12} value={hour} onChange={setHour} />
      <ChipPicker label="Minute" options={MINUTES} value={minute} onChange={setMinute} format={formatMinute} />
      <ChipPicker label="AM / PM" options={PERIODS} value={period} onChange={setPeriod} />
    </View>
  );
}

/** @deprecated use formatDraftDateTime */
export const formatDraftDate = formatDraftDateTime;
export { formatDraftDateTime };
