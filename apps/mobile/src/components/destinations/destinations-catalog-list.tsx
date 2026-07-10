import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import type { DestinationCardData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  color,
  useKeyboardInsets,
  useTheme,
} from '@tourism/mobile-ui';

import { useTabBarScrollPadding } from '../floating-pill-tab-bar';
import { useHideTabBarOnScroll } from '../tab-bar-visibility';
import { ToursSearchEmptyState } from '../tours/tours-search-empty-state';
import { DestinationCard } from './destination-card';

const PAGE_SIZE = 12;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<DestinationCardData>);

type DestinationsCatalogListProps = {
  destinations: DestinationCardData[];
  sourceCount: number;
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  onRefresh: () => void;
  debouncedQuery: string;
  activeFilterCount: number;
  searchActive: boolean;
  searchSubmitted: boolean;
  regionLabel: (region: string | null) => string;
  onClearFilters: () => void;
  onDestinationPress: (destination: DestinationCardData) => void;
};

export function DestinationsCatalogList({
  destinations: results,
  sourceCount,
  loading,
  refreshing,
  error,
  onRefresh,
  debouncedQuery,
  activeFilterCount,
  searchActive,
  searchSubmitted,
  regionLabel,
  onClearFilters,
  onDestinationPress,
}: DestinationsCatalogListProps) {
  const theme = useTheme();
  const t = messages.mobile.destinations;
  const mt = messages.mobile.tours;
  const { keyboardHeight } = useKeyboardInsets();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const listRef = useRef<FlatList<DestinationCardData>>(null);
  const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

  const destinations = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount],
  );
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

  const showInitialLoading = loading && sourceCount === 0;
  const showInitialError = error && sourceCount === 0;
  const hasQuery = (debouncedQuery ?? '').trim().length > 0;
  const isSearchEmpty = hasQuery && results.length === 0;
  const isFilterEmpty = !hasQuery && activeFilterCount > 0 && results.length === 0;

  if (showInitialLoading) {
    return <LoadingSkeleton />;
  }

  if (showInitialError) {
    return (
      <ErrorState message={t.error} retryLabel={t.retry} onRetry={onRefresh} />
    );
  }

  return (
    <AnimatedFlatList
      ref={listRef}
      style={styles.flex}
      data={destinations}
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
      contentContainerStyle={
        destinations.length === 0 ? styles.emptyList : styles.list
      }
      ListEmptyComponent={
        !loading && !error ? (
          isSearchEmpty ? (
            <ToursSearchEmptyState
              title={mt.searchNoResults?.destinationTitle ?? 'Destination not found'}
              message={mt.searchNoResults?.hint ?? 'Try search with a different keyword'}
            />
          ) : isFilterEmpty ? (
            <EmptyState
              message={t.empty.title}
              actionLabel={t.empty.cta}
              onAction={onClearFilters}
            />
          ) : (
            <EmptyState message={t.empty.title} />
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
      renderItem={({ item }) => (
        <DestinationCard
          destination={item}
          regionLabel={regionLabel(item.region)}
          tourCountLabel={t.tourCount(item.tourCount)}
          viewToursLabel={t.viewTours}
          onPress={() => onDestinationPress(item)}
        />
      )}
    />
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, listBottomPadding: number) {
  return StyleSheet.create({
    flex: { flex: 1 },
    list: { paddingTop: theme.spacing.sm, paddingBottom: listBottomPadding },
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
