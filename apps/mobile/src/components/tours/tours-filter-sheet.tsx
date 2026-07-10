import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DurationBucket, PriceBucket, TourSort } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, Button, Checkbox, color, useTheme } from '@tourism/mobile-ui';

import { ListingSortSection } from '../listing/listing-sort-section';
import { DraggableSheet, type DraggableSheetHandle } from '../draggable-sheet';
import type { FacetKey, ToursFilterState } from './tours-filter-types';

const DURATIONS: DurationBucket[] = ['1', '2-3', '4+'];
const PRICES: PriceBucket[] = ['<100', '100-300', '300+'];

const SORT_KEYS: TourSort[] = ['popular', 'price-asc', 'price-desc', 'rating'];

type Option = { value: string; label: string };

function FacetGroup({
  heading,
  options,
  selected,
  onToggle,
}: {
  heading: string;
  options: Option[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = createFacetStyles(theme);
  const activeInGroup = options.filter((o) => selected.includes(o.value)).length;
  const [open, setOpen] = useState(activeInGroup > 0);

  if (options.length === 0) return null;

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.headingRow}
      >
        <AppText variant="caption" style={styles.heading}>
          {heading}
          {activeInGroup > 0 ? ` (${activeInGroup})` : ''}
        </AppText>
        <Ionicons
          name={open ? 'remove' : 'add'}
          size={18}
          color={color(theme, 'muted-foreground')}
        />
      </Pressable>
      {open ? (
        <View style={styles.options}>
          {options.map((option) => (
            <Checkbox
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
              label={option.label}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

type ToursFilterSheetProps = {
  visible: boolean;
  value: ToursFilterState;
  sort: TourSort;
  categoryOptions: Option[];
  activeCount: number;
  resultCount: number;
  loading?: boolean;
  onToggle: (facet: FacetKey, optionValue: string) => void;
  onSortChange: (sort: TourSort) => void;
  onClearAll: () => void;
  onClose: () => void;
};

export function ToursFilterSheet({
  visible,
  value,
  sort,
  categoryOptions,
  activeCount,
  resultCount,
  loading = false,
  onToggle,
  onSortChange,
  onClearAll,
  onClose,
}: ToursFilterSheetProps) {
  const theme = useTheme();
  const t = messages.toursPage;
  const styles = createStyles(theme);
  const sheetRef = useRef<DraggableSheetHandle>(null);

  const sortLabels: Record<TourSort, string> = {
    popular: t.sortOptions.popular,
    'price-asc': t.sortOptions.priceAsc,
    'price-desc': t.sortOptions.priceDesc,
    rating: t.sortOptions.rating,
  };

  return (
    <DraggableSheet
      ref={sheetRef}
      visible={visible}
      onClose={onClose}
      maxHeightFraction={0.85}
      header={
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <AppText variant="sectionTitle">{t.filtersLabel}</AppText>
            {activeCount > 0 ? (
              <Pressable onPress={onClearAll} hitSlop={8}>
                <AppText variant="caption" style={styles.clear}>
                  {t.clearAll}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => sheetRef.current?.dismiss()}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={color(theme, 'foreground')} />
          </Pressable>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ListingSortSection
          heading={t.sortLabel}
          options={SORT_KEYS.map((key) => ({ value: key, label: sortLabels[key] }))}
          value={sort}
          onChange={onSortChange}
        />
        <FacetGroup
          heading={t.facets.category}
          options={categoryOptions}
          selected={value.categories}
          onToggle={(v) => onToggle('categories', v)}
        />
        <FacetGroup
          heading={t.facets.duration}
          options={DURATIONS.map((d) => ({ value: d, label: t.durationLabels[d] }))}
          selected={value.durations}
          onToggle={(v) => onToggle('durations', v)}
        />
        <FacetGroup
          heading={t.facets.price}
          options={PRICES.map((p) => ({ value: p, label: t.priceLabels[p] }))}
          selected={value.prices}
          onToggle={(v) => onToggle('prices', v)}
        />
      </ScrollView>

      <Button
        label={t.resultCount(resultCount)}
        onPress={() => sheetRef.current?.dismiss()}
        disabled={loading || resultCount === 0}
        style={styles.apply}
      />
    </DraggableSheet>
  );
}

function createFacetStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    group: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
      paddingBottom: theme.spacing.md,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: theme.minTouch,
    },
    heading: {
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontFamily: theme.fonts.sansSemibold,
      color: color(theme, 'foreground'),
    },
    options: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
  });
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color(theme, 'border'),
    },
    headerTitle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    clear: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansMedium,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    apply: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
  });
}
