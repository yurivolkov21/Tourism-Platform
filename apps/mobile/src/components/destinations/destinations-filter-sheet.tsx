import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DestinationSort } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { AppText, Button, Checkbox, color, useTheme } from '@tourism/mobile-ui';

import type {
  DestinationFacetKey,
  DestinationsFilterState,
} from '../../lib/destinations/destination-filter-types';
import { ListingSortSection } from '../listing/listing-sort-section';
import { DraggableSheet, type DraggableSheetHandle } from '../draggable-sheet';

type Option = { value: string; label: string };

const SORT_KEYS: DestinationSort[] = ['tours-desc', 'name-asc', 'name-desc'];

type DestinationsFilterSheetProps = {
  visible: boolean;
  value: DestinationsFilterState;
  sort: DestinationSort;
  regionOptions: Option[];
  activeCount: number;
  resultCount: number;
  loading?: boolean;
  onToggle: (facet: DestinationFacetKey, optionValue: string) => void;
  onSortChange: (sort: DestinationSort) => void;
  onClearAll: () => void;
  onClose: () => void;
};

export function DestinationsFilterSheet({
  visible,
  value,
  sort,
  regionOptions,
  activeCount,
  resultCount,
  loading = false,
  onToggle,
  onSortChange,
  onClearAll,
  onClose,
}: DestinationsFilterSheetProps) {
  const theme = useTheme();
  const t = messages.mobile.destinations;
  const styles = createStyles(theme);
  const sheetRef = useRef<DraggableSheetHandle>(null);

  const sortLabels: Record<DestinationSort, string> = {
    'tours-desc': t.sortOptions.toursDesc,
    'name-asc': t.sortOptions.nameAsc,
    'name-desc': t.sortOptions.nameDesc,
  };

  return (
    <DraggableSheet
      ref={sheetRef}
      visible={visible}
      onClose={onClose}
      maxHeightFraction={0.7}
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
        <AppText variant="caption" style={styles.heading}>
          {t.facets.region}
        </AppText>
        <View style={styles.options}>
          {regionOptions.map((option) => (
            <Checkbox
              key={option.value}
              checked={value.regions.includes(option.value)}
              onCheckedChange={() => onToggle('regions', option.value)}
              label={option.label}
            />
          ))}
        </View>
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
      gap: theme.spacing.sm,
    },
    heading: {
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontFamily: theme.fonts.sansSemibold,
      color: color(theme, 'foreground'),
    },
    options: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    apply: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
  });
}
