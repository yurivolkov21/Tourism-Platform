import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View, type TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Card,
  Chip,
  Screen,
  Spinner,
  TextField,
  useTheme,
} from '@tourism/mobile-ui';
import {
  FilterSheet,
  type FilterSheetRef,
} from '../../components/filter-sheet';
import { HeartButton } from '../../components/heart-button';
import { SectionHeading } from '../../components/section-heading';
import { TourCard } from '../../components/tour-card';
import { fetchDestinations } from '../../lib/destinations';
import {
  applyExploreState,
  countActiveFilters,
  defaultExploreState,
  hasActiveFilters,
  initialExploreState,
  type ExploreState,
} from '../../lib/explore-state';
import { fetchAllTours } from '../../lib/tours';

const t = messages.mobile.explore;

function SkeletonList() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(3) }}>
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          variant="media"
          style={{ height: 300, backgroundColor: theme.colors['muted'] }}
        />
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    destination?: string;
    focusSearch?: string;
  }>();
  const [state, setState] = useState<ExploreState>(() =>
    initialExploreState(params),
  );
  const filterSheetRef = useRef<FilterSheetRef>(null);
  const searchRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);
  // Re-tapping the already-active Explore tab scrolls the list back to top
  // (standard iOS/Android convention) — needs FloatingTabBar to actually
  // emit 'tabPress' on a repeat tap, which it didn't until this was wired up.
  useScrollToTop(listRef);

  // Explore is a persistent tab screen (expo-router keeps it mounted across
  // tab switches) — the `useState` initializer above only fires on first
  // mount, so a later deep-link (Home's destination tile → router.push with a
  // NEW `destination` param) wouldn't otherwise re-seed the filter.
  useEffect(() => {
    if (params.destination && params.destination !== state.destination) {
      setState((s) => ({ ...s, destination: params.destination }));
    }
  }, [params.destination]);

  // Same staleness as above: `autoFocus` only fires on the TextField's own
  // first mount, so Home's search-glyph → router.push('/explore?focusSearch=…')
  // does nothing once Explore is already mounted (the normal case, since
  // tabs stay alive). Focus it imperatively instead. `focusSearch` is a
  // timestamp (not a fixed '1') specifically so repeated presses keep
  // changing the param and keep re-triggering this effect. The delay matters
  // on Android: focus() during the tab transition lands the cursor but the
  // system swallows the show-keyboard request — wait for the switch to
  // settle first.
  useEffect(() => {
    if (!params.focusSearch) return;
    const id = setTimeout(() => searchRef.current?.focus(), 300);
    return () => clearTimeout(id);
  }, [params.focusSearch]);

  const toursQ = useQuery({
    queryKey: ['tours', 'all'],
    queryFn: fetchAllTours,
  });
  const destQ = useQuery({
    queryKey: ['destinations'],
    queryFn: fetchDestinations,
  });

  const results = useMemo(
    () => (toursQ.data ? applyExploreState(toursQ.data, state) : []),
    [toursQ.data, state],
  );

  const header = (
    <View style={{ gap: theme.spacing(3), paddingVertical: theme.spacing(4) }}>
      <SectionHeading title={t.title} />
      <TextField
        ref={searchRef}
        placeholder={t.searchPlaceholder}
        accessibilityLabel={t.searchPlaceholder}
        value={state.query}
        onChangeText={(query) => setState((s) => ({ ...s, query }))}
        autoCorrect={false}
        leading={
          <Ionicons
            name="search-outline"
            size={16}
            color={theme.colors['muted-foreground']}
          />
        }
      />
      {destQ.data && destQ.data.length > 0 ? (
        <View style={{ gap: theme.spacing(2) }}>
          <AppText variant="title">{t.destinationsTitle}</AppText>
          <View style={{ position: 'relative' }}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={destQ.data}
              keyExtractor={(d) => d.slug}
              renderItem={({ item }) => (
                <Chip
                  label={item.name}
                  imageUri={item.image}
                  selected={state.destination === item.name}
                  onPress={() =>
                    setState((s) => ({
                      ...s,
                      destination:
                        s.destination === item.name ? undefined : item.name,
                    }))
                  }
                />
              )}
              ItemSeparatorComponent={() => (
                <View style={{ width: theme.spacing(2) }} />
              )}
            />
            {/* Trailing fade hints there's more to scroll — the row otherwise
                cuts the last chip flush against the screen edge. */}
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', theme.colors['background']]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: theme.spacing(8),
              }}
            />
          </View>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
        }}
      >
        {toursQ.isSuccess ? (
          // P5.6: result count as a pill chip (Navel "Found N" treatment).
          // No alignSelf here — the row's own alignItems: 'center' should
          // vertically center this against the (taller) Filters button.
          <View
            style={{
              backgroundColor: theme.colors['secondary'],
              borderRadius: 999,
              paddingHorizontal: theme.spacing(3),
              paddingVertical: theme.spacing(1),
            }}
          >
            <AppText
              variant="caption"
              style={{
                color: theme.colors['secondary-foreground'],
                fontFamily: theme.fontFamilies.sansSemiBold,
              }}
            >
              {t.resultsCount(results.length)}
            </AppText>
          </View>
        ) : (
          <View />
        )}
        {/* marginLeft: auto pins this group to the right edge regardless of
            whether the count pill above is rendered yet (still loading). */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(2),
            marginLeft: 'auto',
          }}
        >
          {countActiveFilters(state) > 0 ? (
            <Button
              variant="outline"
              label={t.clearAll}
              onPress={() =>
                setState((s) => ({
                  ...defaultExploreState,
                  query: s.query,
                  destination: s.destination,
                }))
              }
            />
          ) : null}
          <Button
            testID="open-filters"
            variant="outline"
            icon={
              <Ionicons
                name="filter-outline"
                size={16}
                color={theme.colors['foreground']}
              />
            }
            label={
              countActiveFilters(state) > 0
                ? `${t.filtersCta} (${countActiveFilters(state)})`
                : t.filtersCta
            }
            onPress={() => filterSheetRef.current?.open(state)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        ref={listRef}
        data={toursQ.isSuccess ? results : []}
        keyExtractor={(tour) => tour.slug}
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(200)}>
            <TourCard
              tour={item}
              variant="list"
              heartSlot={<HeartButton tourId={item.id} />}
              onPress={() => router.push(`/tours/${item.slug}`)}
            />
          </Animated.View>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: theme.spacing(3) }} />
        )}
        ListHeaderComponent={header}
        ListFooterComponent={<View style={{ height: theme.spacing(6) }} />}
        showsVerticalScrollIndicator={false}
        // First tap on a chip/card must act, not just dismiss the search keyboard.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={toursQ.isRefetching}
            onRefresh={() => toursQ.refetch()}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
        ListEmptyComponent={
          toursQ.isPending ? (
            <View style={{ gap: theme.spacing(3) }}>
              <SkeletonList />
              <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
                <Spinner />
                <AppText
                  variant="caption"
                  muted
                  style={{ textAlign: 'center' }}
                >
                  {t.slowServer}
                </AppText>
              </View>
            </View>
          ) : toursQ.isError ? (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingVertical: theme.spacing(6),
              }}
            >
              <AppText variant="body" style={{ textAlign: 'center' }}>
                {t.error}
              </AppText>
              <Button label={t.retry} onPress={() => toursQ.refetch()} />
            </View>
          ) : (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingVertical: theme.spacing(6),
              }}
            >
              <AppText variant="body" muted style={{ textAlign: 'center' }}>
                {t.empty}
              </AppText>
              {hasActiveFilters(state) ? (
                <Button
                  label={t.clearFilters}
                  variant="outline"
                  onPress={() => setState(defaultExploreState)}
                />
              ) : null}
            </View>
          )
        }
      />
      <FilterSheet
        ref={filterSheetRef}
        previewCount={(draft) =>
          toursQ.data
            ? applyExploreState(toursQ.data, {
                ...draft,
                query: state.query,
                destination: state.destination,
              }).length
            : 0
        }
        onApply={(draft) =>
          setState((s) => ({
            ...draft,
            query: s.query,
            destination: s.destination,
          }))
        }
      />
    </Screen>
  );
}
