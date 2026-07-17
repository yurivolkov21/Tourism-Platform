import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { PagerViewProps } from 'react-native-pager-view';
import { useSharedValue } from 'react-native-reanimated';

import type { DestinationCardData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { Screen } from '@tourism/mobile-ui';

import { DestinationsCatalogList } from '../../components/destinations/destinations-catalog-list';
import { DestinationsFilterSheet } from '../../components/destinations/destinations-filter-sheet';
import { useTabBarVisibility } from '../../components/tab-bar-visibility';
import { ToursBrowseTabs } from '../../components/tours/tours-browse-tabs';
import {
  BrowseTabIndex,
  browseTabFromIndex,
  type BrowseTab,
} from '../../components/tours/tours-browse-types';
import { ToursCatalogList } from '../../components/tours/tours-catalog-list';
import { ToursFilterSheet } from '../../components/tours/tours-filter-sheet';
import { ToursHomeHeader } from '../../components/tours/tours-home-header';
import { ToursListingControls } from '../../components/tours/tours-listing-controls';
import { ToursSearchRecentPanel } from '../../components/tours/tours-recommendation-rail';
import { ToursSearchBackdrop } from '../../components/tours/tours-search-backdrop';
import { useToursSearchMode } from '../../lib/search/use-tours-search-mode';
import { useDestinationCatalog } from '../../lib/destinations/use-destination-catalog';
import { destinationsUiCopy } from '../../lib/destinations/destinations-ui-copy';
import { useDestinationsListingState } from '../../lib/destinations/use-destinations-listing-state';
import { useTourCatalog } from '../../lib/tours/use-tour-catalog';
import { useToursListingState } from '../../lib/tours/use-tours-listing-state';
import { toursUiCopy } from '../../lib/tours/tours-ui-copy';
import {
  AnimatedBrowsePager,
  useBrowsePagerRef,
  useBrowsePagerScrollHandler,
  useRepositionBrowsePagerOnResize,
} from '../../components/tours/use-browse-pager';

const demoAvatar = require('../../../assets/images/avatar-dog.png');

export default function ToursScreen() {
  const t = messages.mobile.tours;
  const td = messages.mobile.destinations;
  const tp = messages.toursPage;
  const profile = messages.mobile.more.profile;
  const { width } = useWindowDimensions();

  const [activeBrowseTab, setActiveBrowseTab] = useState<BrowseTab>('tours');

  const pagerRef = useBrowsePagerRef();
  const activeBrowseTabRef = useRef(activeBrowseTab);
  activeBrowseTabRef.current = activeBrowseTab;
  const browseScrollProgress = useSharedValue(0);
  const pageScrollHandler = useBrowsePagerScrollHandler(browseScrollProgress);

  const search = useToursSearchMode();
  const catalog = useTourCatalog();
  const destCatalog = useDestinationCatalog();
  const listing = useToursListingState({
    allTours: catalog.allTours,
    query: search.debouncedQuery,
  });
  const destListing = useDestinationsListingState({
    allDestinations: destCatalog.allDestinations,
    query: search.debouncedQuery,
  });
  const { show, hide } = useTabBarVisibility();

  useFocusEffect(
    useCallback(() => {
      return () => {
        show();
      };
    }, [show]),
  );

  const showTabBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (search.isActive && !search.hasSubmitted) {
      if (showTabBarTimerRef.current) {
        clearTimeout(showTabBarTimerRef.current);
        showTabBarTimerRef.current = null;
      }
      hide();
      return;
    }

    showTabBarTimerRef.current = setTimeout(() => {
      show();
      showTabBarTimerRef.current = null;
    }, 300);

    return () => {
      if (showTabBarTimerRef.current) {
        clearTimeout(showTabBarTimerRef.current);
        showTabBarTimerRef.current = null;
      }
    };
  }, [hide, search.hasSubmitted, search.isActive, show]);

  useRepositionBrowsePagerOnResize(
    pagerRef,
    browseScrollProgress,
    BrowseTabIndex[activeBrowseTabRef.current],
    width,
  );

  const openNotificationsPreview = () => {
    Alert.alert(t.notificationsLabel, t.notificationsComingSoon);
  };

  const selectBrowseTab = useCallback(
    (tab: BrowseTab) => {
      if (tab === activeBrowseTab) return;
      setActiveBrowseTab(tab);
      pagerRef.current?.setPage(BrowseTabIndex[tab]);
    },
    [activeBrowseTab, pagerRef],
  );

  const onPageSelected = useCallback(
    (position: number) => {
      const tab = browseTabFromIndex(position);
      browseScrollProgress.value = position;
      setActiveBrowseTab((current) => (current === tab ? current : tab));
    },
    [browseScrollProgress],
  );

  const handleDestinationPress = useCallback(
    (destination: DestinationCardData) => {
      listing.prefilterDestination(destination.name);
      selectBrowseTab('tours');
    },
    [listing, selectBrowseTab],
  );

  const handleTourOpen = useCallback(() => {
    const trimmed = search.query.trim();
    if (trimmed) {
      search.commitRecent(trimmed);
    }
  }, [search]);

  const browseTabLabels: Record<BrowseTab, string> = {
    tours: t.browseTabs.tours,
    destinations: t.browseTabs.destinations,
  };

  const discoveryControls =
    activeBrowseTab === 'tours' ? (
      <ToursListingControls
        hideSearch
        embedded
        resultCountLabel={t.foundTours(listing.resultCount)}
        refineLabel={t.refineLabel}
        activeCount={listing.activeCount}
        onRefinePress={listing.openListingSheet}
        clearAllLabel={tp.clearAll}
        activeChips={listing.activeChips.map((chip) =>
          chip.facet === 'destinations'
            ? { ...chip, icon: 'location-outline' as const }
            : chip,
        )}
        onRemoveChip={listing.removeChip}
        onClearAll={listing.clearFilters}
        viewMode={listing.viewMode}
        viewModeLabel={
          listing.viewMode === 'vertical'
            ? toursUiCopy.viewModeToggleToHorizontal
            : toursUiCopy.viewModeToggleToVertical
        }
        onViewModePress={() =>
          listing.setViewMode(
            listing.viewMode === 'vertical' ? 'horizontal' : 'vertical',
          )
        }
      />
    ) : (
      <ToursListingControls
        hideSearch
        embedded
        resultCountLabel={td.foundDestinations(destListing.resultCount)}
        refineLabel={td.refineLabel}
        activeCount={destListing.activeCount}
        onRefinePress={destListing.openListingSheet}
        clearAllLabel={td.clearAll}
        activeChips={destListing.activeChips}
        onRemoveChip={destListing.removeChip}
        onClearAll={destListing.clearFilters}
        viewMode={destListing.viewMode}
        viewModeLabel={
          destListing.viewMode === 'vertical'
            ? destinationsUiCopy.viewModeToggleToHorizontal
            : destinationsUiCopy.viewModeToggleToVertical
        }
        onViewModePress={() =>
          destListing.setViewMode(
            destListing.viewMode === 'vertical' ? 'horizontal' : 'vertical',
          )
        }
      />
    );

  return (
    <Screen scroll={false} largeTitle={false} contentStyle={styles.screenRoot}>
      <ToursHomeHeader
        welcomeLabel={t.welcomeLabel}
        name={profile.name}
        avatarSource={demoAvatar}
        notificationLabel={t.notificationsLabel}
        onNotificationPress={openNotificationsPreview}
        sectionTitle={t.recommendationLabel}
        searchLabel={t.searchLabel}
        searchPlaceholder={t.searchPlaceholder}
        searchActive={search.isActive}
        hasSubmitted={search.hasSubmitted}
        searchProgress={search.progress}
        query={search.query}
        onQueryChange={search.setQuery}
        onSearchToggle={search.toggleSearch}
        onSearchResume={search.openSearch}
        onClear={search.clearQuery}
        onSubmit={search.submitSearch}
        inputRef={search.inputRef}
        discoveryControls={discoveryControls}
      />
      <View style={styles.contentStack}>
        <View
          style={styles.pagerStack}
          pointerEvents={
            search.isActive && !search.hasSubmitted ? 'none' : 'auto'
          }
        >
          <ToursBrowseTabs
            activeBrowseTab={activeBrowseTab}
            onSelectTab={selectBrowseTab}
            labels={browseTabLabels}
            scrollProgress={browseScrollProgress}
          />
          <AnimatedBrowsePager
            ref={pagerRef}
            style={styles.pager}
            initialPage={BrowseTabIndex.tours}
            offscreenPageLimit={1}
            scrollEnabled={
              !search.isActive &&
              !(
                activeBrowseTab === 'destinations' &&
                destListing.viewMode === 'vertical'
              ) &&
              !(activeBrowseTab === 'tours' && listing.viewMode === 'vertical')
            }
            onPageScroll={
              pageScrollHandler as unknown as NonNullable<
                PagerViewProps['onPageScroll']
              >
            }
            onPageSelected={(event) =>
              onPageSelected(event.nativeEvent.position)
            }
          >
            <View key="tours" style={styles.page} collapsable={false}>
              <ToursCatalogList
                tours={listing.results}
                sourceTourCount={catalog.allTours.length}
                loading={catalog.loading}
                refreshing={catalog.refreshing}
                error={catalog.error}
                onRefresh={() => void catalog.loadCatalog({ refresh: true })}
                debouncedQuery={search.debouncedQuery}
                activeFilterCount={listing.listingFilterCount}
                searchActive={search.isActive}
                searchSubmitted={search.hasSubmitted}
                viewMode={listing.viewMode}
                onClearFilters={listing.clearFilters}
                onTourOpen={handleTourOpen}
              />
            </View>
            <View key="destinations" style={styles.page} collapsable={false}>
              <DestinationsCatalogList
                destinations={destListing.results}
                sourceCount={destCatalog.allDestinations.length}
                loading={destCatalog.loading}
                refreshing={destCatalog.refreshing}
                error={destCatalog.error}
                onRefresh={() =>
                  void destCatalog.loadCatalog({ refresh: true })
                }
                debouncedQuery={search.debouncedQuery}
                activeFilterCount={destListing.activeCount}
                searchActive={search.isActive}
                searchSubmitted={search.hasSubmitted}
                viewMode={destListing.viewMode}
                regionLabel={destListing.displayRegion}
                onClearFilters={destListing.clearFilters}
                onDestinationPress={handleDestinationPress}
              />
            </View>
          </AnimatedBrowsePager>
        </View>
        <ToursSearchBackdrop
          searchActive={search.isActive && !search.hasSubmitted}
          overlayProgress={search.overlayProgress}
          onDismiss={search.dismissSearchOverlay}
          dismissLabel={t.searchLabel}
        />
        <ToursSearchRecentPanel
          searchRecentLabel={t.searchRecentLabel}
          query={search.query}
          recentTerms={search.recentTerms}
          searchActive={search.isActive}
          hasSubmitted={search.hasSubmitted}
          overlayProgress={search.overlayProgress}
          onRecentPress={search.applySearchTerm}
        />
      </View>
      <ToursFilterSheet
        visible={listing.listingSheetOpen}
        onClose={listing.closeListingSheet}
        value={listing.filters}
        sort={listing.sort}
        onToggle={listing.toggleFilter}
        onSortChange={listing.setSort}
        categoryOptions={listing.categoryOptions}
        activeCount={listing.activeCount}
        resultCount={listing.resultCount}
        loading={catalog.loading}
        onClearAll={listing.clearFilters}
      />
      <DestinationsFilterSheet
        visible={destListing.listingSheetOpen}
        onClose={destListing.closeListingSheet}
        value={destListing.filters}
        sort={destListing.sort}
        regionOptions={destListing.regionOptions}
        activeCount={destListing.activeCount}
        resultCount={destListing.resultCount}
        loading={destCatalog.loading}
        onToggle={destListing.toggleFilter}
        onSortChange={destListing.setSort}
        onClearAll={destListing.clearFilters}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  contentStack: {
    flex: 1,
    position: 'relative',
  },
  pagerStack: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
