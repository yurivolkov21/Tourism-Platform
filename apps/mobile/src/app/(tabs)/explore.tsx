import { useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
        placeholder={t.searchPlaceholder}
        accessibilityLabel={t.searchPlaceholder}
        value={state.query}
        onChangeText={(query) => setState((s) => ({ ...s, query }))}
        autoCorrect={false}
        autoFocus={params.focusSearch === '1'}
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
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
        }}
      >
        <Button
          testID="open-filters"
          variant="outline"
          label={
            countActiveFilters(state) > 0
              ? `${t.filtersCta} (${countActiveFilters(state)})`
              : t.filtersCta
          }
          onPress={() => filterSheetRef.current?.open(state)}
        />
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
      </View>
      {toursQ.isSuccess ? (
        // P5.6: result count as a pill chip (Navel "Found N" treatment).
        <View
          style={{
            alignSelf: 'flex-start',
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
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
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
