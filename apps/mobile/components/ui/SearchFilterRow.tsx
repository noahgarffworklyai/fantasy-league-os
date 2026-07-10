import { type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { Pressable, Text, View } from './primitives';
import { SearchInput } from './Input';
import { FilterChip } from './FilterChip';
import { CONTROL_ICON_SIZE, MIN_TOUCH_TARGET } from '@/lib/tokens';
import { useColors, useHex, useThemeStyles } from '@/lib/theme';

type SearchFilterRowProps = {
  value: string;
  onChangeValue: (value: string) => void;
  placeholder?: string;
  filterActive?: boolean;
  filterOpen?: boolean;
  onToggleFilter?: () => void;
  positionBadge?: string | null;
  onFocus?: () => void;
  onBlur?: () => void;
  filterPanel?: ReactNode;
};

export function SearchFilterRow({
  value,
  onChangeValue,
  placeholder = 'Search players',
  filterActive = false,
  filterOpen = false,
  onToggleFilter,
  positionBadge,
  onFocus,
  onBlur,
  filterPanel,
}: SearchFilterRowProps) {
  const { layout, surfaces } = useThemeStyles();
  const hex = useHex();
  const c = useColors();
  const showFilter = !!onToggleFilter;

  return (
    <View style={layout.tight}>
      <View style={[layout.row, layout.tight]}>
        <View style={layout.searchBar}>
          <Search size={CONTROL_ICON_SIZE} color={c.mutedForeground} />
          <SearchInput
            value={value}
            onChangeText={onChangeValue}
            placeholder={placeholder}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          {value ? (
            <Pressable
              onPress={() => onChangeValue('')}
              style={layout.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={CONTROL_ICON_SIZE} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        {showFilter ? (
          <Pressable
            onPress={onToggleFilter}
            style={[
              layout.iconButton,
              (filterActive || filterOpen) && { backgroundColor: hex.foreground },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter"
          >
            <SlidersHorizontal
              size={CONTROL_ICON_SIZE}
              color={filterActive || filterOpen ? hex.background : c.foreground}
            />
            {positionBadge ? (
              <View style={surfaces.badge}>
                <Text variant="pill" style={{ color: hex.background, fontSize: 9, fontWeight: '600' }}>
                  {positionBadge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      {filterPanel}
    </View>
  );
}

export function PositionFilterPanel<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { layout, surfaces } = useThemeStyles();

  return (
    <View style={[surfaces.roundedCard, { padding: 12 }]}>
      <Text variant="eyebrow" style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
        Position
      </Text>
      <View style={[layout.rowWrap, { gap: 6 }]}>
        {options.map((option) => (
          <FilterChip
            key={option}
            label={option}
            active={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </View>
  );
}
