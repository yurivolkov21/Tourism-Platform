import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import type { TourDetailData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import { TourDetailGallery } from '../../components/tours/tour-detail-gallery';
import { TourDetailHero } from '../../components/tours/tour-detail-hero';
import { TourDetailIncluded } from '../../components/tours/tour-detail-included';
import { TourDetailItinerary } from '../../components/tours/tour-detail-itinerary';
import { TourDetailOverview } from '../../components/tours/tour-detail-overview';
import { TourDetailPolicies } from '../../components/tours/tour-detail-policies';
import { TourDetailReviews } from '../../components/tours/tour-detail-reviews';
import { TourDetailStickyBar } from '../../components/tours/tour-detail-sticky-bar';
import { fetchTourDetailOrThrow } from '../../lib/api/tour-detail';

export default function TourDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const theme = useTheme();
  const mt = messages.mobile.tours;
  const ft = messages.featuredTours;

  const [tour, setTour] = useState<TourDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else if (!tour) setLoading(true);
      setNotFound(false);
      try {
        const data = await fetchTourDetailOrThrow(slug);
        setTour(data);
      } catch (err) {
        if (__DEV__) console.warn('[tour-detail] load failed:', err);
        if (!tour) setNotFound(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [slug, tour],
  );

  useEffect(() => {
    setTour(null);
    setLoading(true);
    setNotFound(false);
    void (async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const data = await fetchTourDetailOrThrow(slug);
        setTour(data);
      } catch (err) {
        if (__DEV__) console.warn('[tour-detail] load failed:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const styles = createStyles(theme);
  const badgeLabel = tour?.badge ? messages.featuredTours.badges[tour.badge] : undefined;

  return (
    <>
      <Stack.Screen options={{ title: tour?.title ?? mt.detailTitle, headerShown: true }} />
      <View style={styles.root}>
        {loading && !tour ? (
          <LoadingSkeleton />
        ) : notFound && !tour ? (
          <EmptyState
            message={mt.notFound}
            actionLabel={mt.backToTours}
            onAction={() => router.back()}
          />
        ) : tour ? (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void load(true)}
                  tintColor={color(theme, 'primary')}
                />
              }
            >
              <TourDetailHero tour={tour} daysLabel={mt.days} badgeLabel={badgeLabel} />
              <TourDetailGallery tour={tour} />
              <TourDetailOverview tour={tour} />
              <TourDetailItinerary tour={tour} />
              <TourDetailIncluded tour={tour} />
              <TourDetailPolicies tour={tour} />
              <TourDetailReviews tour={tour} />
            </ScrollView>
            <TourDetailStickyBar
              tour={tour}
              fromLabel={ft.from}
              perPersonLabel={messages.toursPage.perPerson}
              contactLabel={mt.contactAboutTour}
              onContact={() => {
                router.push({
                  pathname: '/contact',
                  params: { tour: tour.title },
                });
              }}
            />
          </>
        ) : (
          <ErrorState
            message={mt.error}
            retryLabel={mt.retry}
            onRetry={() => void load()}
          />
        )}
      </View>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: color(theme, 'background'),
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
  });
}
