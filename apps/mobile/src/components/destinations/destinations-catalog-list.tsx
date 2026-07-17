import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

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

import type { DestinationViewMode } from '../../lib/destinations/destination-filter-types';
import { destinationsUiCopy } from '../../lib/destinations/destinations-ui-copy';
import { useTabBarScrollPadding } from '../floating-pill-tab-bar';
import { useHideTabBarOnScroll } from '../tab-bar-visibility';
import { ToursSearchEmptyState } from '../tours/tours-search-empty-state';
import { DestinationCard } from './destination-card';

const PAGE_SIZE = 12;
/** Equal side inset so the active card is centered; adjacent cards peek both sides. */
const CAROUSEL_SIDE_INSET = 36;

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
  viewMode: DestinationViewMode;
  regionLabel: (region: string | null) => string;
  onClearFilters: () => void;
  onDestinationPress: (destination: DestinationCardData) => void;
};

type CarouselCardItemProps = {
  item: DestinationCardData;
  index: number;
  scrollX: SharedValue<number>;
  snapInterval: number;
  cardWidth: number;
  cardHeight: number;
  cardGap: number;
  regionLabel: string;
  tourCountLabel: string;
  viewToursLabel: string;
  onPress: () => void;
};

function CarouselCardItem({
  item,
  index,
  scrollX,
  snapInterval,
  cardWidth,
  cardHeight,
  cardGap,
  regionLabel,
  tourCountLabel,
  viewToursLabel,
  onPress,
}: CarouselCardItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const center = index * snapInterval;
    const inputRange = [center - snapInterval, center, center + snapInterval];
    // Keep motion subtle — strong scale makes side peeks look off-center.
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.96, 1, 0.96],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.82, 1, 0.82],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={{ width: cardWidth, marginRight: cardGap }}>
      <Animated.View style={animatedStyle}>
        <DestinationCard
          destination={item}
          regionLabel={regionLabel}
          tourCountLabel={tourCountLabel}
          viewToursLabel={viewToursLabel}
          viewMode="vertical"
          width={cardWidth}
          height={cardHeight}
          onPress={onPress}
        />
      </Animated.View>
    </View>
  );
}

type HorizontalListCardProps = {
  item: DestinationCardData;
  index: number;
  width: number;
  regionLabel: string;
  tourCountLabel: string;
  viewToursLabel: string;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
};

/** Landscape list row — enter fade/slide; press scale lives on DestinationCard. */
function HorizontalListCard({
  item,
  index,
  width,
  regionLabel,
  tourCountLabel,
  viewToursLabel,
  style,
  onPress,
}: HorizontalListCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(340)
        .delay(Math.min(index, 10) * 42)
        .springify()
        .damping(18)
        .stiffness(160)}
    >
      <DestinationCard
        destination={item}
        regionLabel={regionLabel}
        tourCountLabel={tourCountLabel}
        viewToursLabel={viewToursLabel}
        viewMode="horizontal"
        width={width}
        height={176}
        style={style}
        onPress={onPress}
      />
    </Animated.View>
  );
}

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
  viewMode,
  regionLabel,
  onClearFilters,
  onDestinationPress,
}: DestinationsCatalogListProps) {
  const theme = useTheme();
  const t = messages.mobile.destinations;
  const mt = messages.mobile.tours;
  const { width: windowWidth } = useWindowDimensions();
  const { keyboardHeight } = useKeyboardInsets();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [carouselHeight, setCarouselHeight] = useState(0);

  const listRef = useRef<FlatList<DestinationCardData>>(null);
  const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();
  const carouselScrollX = useSharedValue(0);

  const destinations = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount],
  );
  const hasMore = visibleCount < results.length;
  const isCarousel = viewMode === 'vertical';

  const listBottomPadding = useTabBarScrollPadding(theme.spacing.sm);
  const keyboardPadding = searchActive ? keyboardHeight : 0;
  const bottomClearance = listBottomPadding + keyboardPadding;

  const cardGap = theme.spacing.sm;
  const topPad = theme.spacing.sm;
  const sideInset = CAROUSEL_SIDE_INSET;
  const carouselCardWidth = Math.max(260, windowWidth - sideInset * 2);
  const snapInterval = carouselCardWidth + cardGap;

  /** Card ends above the floating tab bar. */
  const carouselCardHeight =
    carouselHeight > 0
      ? Math.max(280, carouselHeight - topPad - bottomClearance)
      : 320;

  const styles = createStyles(theme, bottomClearance);

  const onCarouselScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      carouselScrollX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    carouselScrollX.value = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [debouncedQuery, activeFilterCount, results.length, viewMode, carouselScrollX]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, results.length));
    setLoadingMore(false);
  }, [hasMore, loading, loadingMore, results.length]);

  const showInitialLoading = loading && sourceCount === 0;
  const showInitialError = error && sourceCount === 0;
  const hasQuery = (debouncedQuery ?? '').trim().length > 0;
  const isSearchEmpty = hasQuery && results.length === 0;
  const isFilterEmpty = !hasQuery && activeFilterCount > 0 && results.length === 0;

  const emptyComponent =
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
    ) : null;

  const listCardWidth = windowWidth - theme.spacing.md * 2;

  if (showInitialLoading) {
    return <LoadingSkeleton />;
  }

  if (showInitialError) {
    return (
      <ErrorState message={t.error} retryLabel={t.retry} onRetry={onRefresh} />
    );
  }

  if (isCarousel) {
    return (
      <View
        style={styles.flex}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          if (next > 0 && next !== carouselHeight) {
            setCarouselHeight(next);
          }
        }}
      >
        <AnimatedFlatList
          ref={listRef}
          style={styles.carouselList}
          data={destinations}
          keyExtractor={(item) => item.slug}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEnabled={!searchActive || searchSubmitted}
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={snapInterval}
          snapToAlignment="start"
          disableIntervalMomentum
          onScroll={onCarouselScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: snapInterval,
            offset: snapInterval * index,
            index,
          })}
          accessibilityLabel={destinationsUiCopy.carouselA11yLabel}
          accessibilityHint={destinationsUiCopy.carouselA11yHint}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.6}
          contentContainerStyle={
            destinations.length === 0
              ? styles.emptyList
              : [styles.carouselContent, { paddingTop: topPad }]
          }
          ListHeaderComponent={<View style={{ width: sideInset }} />}
          ListFooterComponent={
            <View style={styles.carouselFooterRow}>
              {loadingMore ? (
                <View style={styles.carouselFooter}>
                  <ActivityIndicator color={color(theme, 'primary')} />
                </View>
              ) : null}
              <View style={{ width: sideInset }} />
            </View>
          }
          ListEmptyComponent={emptyComponent}
          renderItem={({ item, index }) => (
            <CarouselCardItem
              item={item}
              index={index}
              scrollX={carouselScrollX}
              snapInterval={snapInterval}
              cardWidth={carouselCardWidth}
              cardHeight={carouselCardHeight}
              cardGap={index === destinations.length - 1 ? 0 : cardGap}
              regionLabel={regionLabel(item.region)}
              tourCountLabel={t.tourCount(item.tourCount)}
              viewToursLabel={t.viewTours}
              onPress={() => onDestinationPress(item)}
            />
          )}
        />
      </View>
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
      ListEmptyComponent={emptyComponent}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={color(theme, 'primary')} />
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <HorizontalListCard
          item={item}
          index={index}
          width={listCardWidth}
          regionLabel={regionLabel(item.region)}
          tourCountLabel={t.tourCount(item.tourCount)}
          viewToursLabel={t.viewTours}
          style={styles.listCard}
          onPress={() => onDestinationPress(item)}
        />
      )}
    />
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, listBottomPadding: number) {
  return StyleSheet.create({
    flex: { flex: 1 },
    carouselList: {
      flex: 1,
    },
    list: {
      paddingTop: theme.spacing.sm,
      paddingBottom: listBottomPadding,
      paddingHorizontal: theme.spacing.md,
    },
    listCard: {
      marginBottom: theme.spacing.md,
    },
    carouselContent: {
      alignItems: 'flex-start',
    },
    emptyList: {
      flexGrow: 1,
      paddingBottom: listBottomPadding,
    },
    footer: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    carouselFooter: {
      width: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    carouselFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
}
