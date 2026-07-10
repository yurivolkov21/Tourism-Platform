import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import type { TourCardData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  TourCard,
  color,
  useKeyboardInsets,
  useTheme,
} from '@tourism/mobile-ui';

import { useTabBarScrollPadding } from '../floating-pill-tab-bar';
import { useHideTabBarOnScroll } from '../tab-bar-visibility';
import { ToursSearchEmptyState } from './tours-search-empty-state';
import { ToursDestinationPrefilterBar } from './tours-destination-prefilter-bar';
import {
  getTourAvailabilityProps,
  getTourBadgeLabel,
} from '../../lib/tours/card-labels';

const PAGE_SIZE = 10;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<TourCardData>);

type ToursCatalogListProps = {
  tours: TourCardData[];
  sourceTourCount: number;
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  onRefresh: () => void;
  debouncedQuery: string;
  activeFilterCount: number;
  destinationPrefilter?: string | null;
  destinationPrefilterLabel?: string;
  changeDestinationLabel?: string;
  onClearDestinationPrefilter?: () => void;
  searchActive: boolean;
  searchSubmitted: boolean;
  onClearFilters: () => void;
  onTourOpen: (slug: string) => void;
};

export function ToursCatalogList({
  tours: results,
  sourceTourCount,
  loading,
  refreshing,
  error,
  onRefresh,
  debouncedQuery,
  activeFilterCount,
  destinationPrefilter,
  destinationPrefilterLabel,
  changeDestinationLabel,
  onClearDestinationPrefilter,
  searchActive,
  searchSubmitted,
  onClearFilters,
  onTourOpen,
}: ToursCatalogListProps) {
  const router = useRouter();
  const theme = useTheme();
  const t = messages.mobile.tours;
  const tp = messages.toursPage;
  const { keyboardHeight } = useKeyboardInsets();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const listRef = useRef<FlatList<TourCardData>>(null);
  const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

  const tours = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const hasMore = visibleCount < results.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [debouncedQuery, activeFilterCount, results.length]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, results.length));
    setLoadingMore(false);
  }, [hasMore, loading, loadingMore, results.length]);

  const listBottomPadding = useTabBarScrollPadding(theme.spacing.sm);
  const keyboardPadding = searchActive ? keyboardHeight : 0;
  const styles = createStyles(theme, listBottomPadding + keyboardPadding);

  const showInitialLoading = loading && sourceTourCount === 0;
  const showInitialError = error && sourceTourCount === 0;
  const hasQuery = (debouncedQuery ?? '').trim().length > 0;
  const isSearchEmpty = hasQuery && results.length === 0;
  const isFilterEmpty = !hasQuery && activeFilterCount > 0 && results.length === 0;

  if (showInitialLoading) {
    return <LoadingSkeleton />;
  }

  if (showInitialError) {
    return (
      <ErrorState
        message={t.error}
        retryLabel={t.retry}
        onRetry={onRefresh}
      />
    );
  }

  return (
    <AnimatedFlatList
      ref={listRef}
      style={styles.flex}
      data={tours}
      keyExtractor={(item) => item.slug}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEnabled={!searchActive || searchSubmitted}
      nestedScrollEnabled
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      onEndReached={() => loadMore()}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={color(theme, 'primary')}
        />
      }
      contentContainerStyle={tours.length === 0 ? styles.emptyList : styles.list}
      ListHeaderComponent={
        destinationPrefilter && destinationPrefilterLabel && changeDestinationLabel ? (
          <ToursDestinationPrefilterBar
            label={destinationPrefilterLabel}
            clearLabel={changeDestinationLabel}
            onClear={() => onClearDestinationPrefilter?.()}
          />
        ) : null
      }
      ListEmptyComponent={
        !loading && !error ? (
          isSearchEmpty ? (
            <ToursSearchEmptyState
              title={t.searchNoResults?.tourTitle ?? 'Tour not found'}
              message={t.searchNoResults?.hint ?? 'Try search with a different keyword'}
            />
          ) : isFilterEmpty ? (
            <EmptyState
              message={tp.empty.title}
              actionLabel={tp.empty.cta}
              onAction={onClearFilters}
            />
          ) : (
            <EmptyState message={tp.empty.title} />
          )
        ) : null
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={color(theme, 'primary')} />
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const availability = getTourAvailabilityProps(item);
        return (
          <TourCard
            tour={item}
            daysLabel={t.days}
            reviewsLabel={t.reviews}
            viewTourLabel={t.viewTour}
            perPersonLabel={tp.perPerson}
            badgeLabel={getTourBadgeLabel(item)}
            availabilityLabel={availability.label}
            availabilityUrgent={availability.urgent}
            onPress={() => {
              onTourOpen(item.slug);
              router.push({
                pathname: '/tour/[slug]',
                params: { slug: item.slug },
              });
            }}
          />
        );
      }}
    />
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, listBottomPadding: number) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    list: { paddingBottom: listBottomPadding },
    emptyList: {
      flexGrow: 1,
      paddingBottom: listBottomPadding,
    },
    footer: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
  });
}
