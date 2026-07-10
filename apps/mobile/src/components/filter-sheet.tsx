import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import type { DurationBucket, PriceBucket, TourSort } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  AppSheet,
  AppText,
  Button,
  Chip,
  useTheme,
  type AppSheetRef,
} from '@tourism/mobile-ui';
import {
  defaultExploreState,
  toggleBucket,
  type ExploreState,
} from '../lib/explore-state';

const t = messages.mobile.explore;

const DURATIONS: DurationBucket[] = ['1', '2-3', '4+'];
const PRICES: PriceBucket[] = ['<100', '100-300', '300+'];
const SORTS: TourSort[] = ['popular', 'price-asc', 'price-desc', 'rating'];

export interface FilterSheetRef {
  /** Open with a draft seeded from the currently applied state. */
  open(applied: ExploreState): void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <AppText variant="title">{title}</AppText>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing(2),
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Explore's facet editor: chips edit a DRAFT copy of the state; nothing
 * applies until "Show N results". Query/destination stay owned by the
 * screen header — the sheet only touches durations/prices/sort.
 */
export const FilterSheet = forwardRef<
  FilterSheetRef,
  {
    previewCount: (draft: ExploreState) => number;
    onApply: (draft: ExploreState) => void;
  }
>(function FilterSheet({ previewCount, onApply }, ref) {
  const theme = useTheme();
  const sheetRef = useRef<AppSheetRef>(null);
  const [draft, setDraft] = useState<ExploreState>(defaultExploreState);

  useImperativeHandle(ref, () => ({
    open: (applied) => {
      setDraft(applied);
      sheetRef.current?.present();
    },
  }));

  return (
    <AppSheet ref={sheetRef} scrollable>
      <View
        style={{ paddingHorizontal: theme.spacing(4), gap: theme.spacing(4) }}
      >
        <Section title={t.durationTitle}>
          {DURATIONS.map((d) => (
            <Chip
              key={d}
              testID={`duration-${d}`}
              label={t.duration[d]}
              selected={draft.durations.includes(d)}
              onPress={() =>
                setDraft((s) => ({
                  ...s,
                  durations: toggleBucket(s.durations, d),
                }))
              }
            />
          ))}
        </Section>
        <Section title={t.priceTitle}>
          {PRICES.map((p) => (
            <Chip
              key={p}
              testID={`price-${p}`}
              label={t.price[p]}
              selected={draft.prices.includes(p)}
              onPress={() =>
                setDraft((s) => ({ ...s, prices: toggleBucket(s.prices, p) }))
              }
            />
          ))}
        </Section>
        <Section title={t.sortTitle}>
          {SORTS.map((sort) => (
            <Chip
              key={sort}
              testID={`sort-${sort}`}
              label={t.sort[sort]}
              selected={draft.sort === sort}
              onPress={() => setDraft((s) => ({ ...s, sort }))}
            />
          ))}
        </Section>
        <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
          <Button
            variant="outline"
            label={t.clearAll}
            onPress={() =>
              setDraft((s) => ({
                ...s,
                durations: [],
                prices: [],
                sort: defaultExploreState.sort,
              }))
            }
          />
          <Button
            testID="apply-filters"
            label={t.showResults(previewCount(draft))}
            onPress={() => {
              onApply(draft);
              sheetRef.current?.dismiss();
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </AppSheet>
  );
});
