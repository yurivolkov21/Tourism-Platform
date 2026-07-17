import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import type { TourCardData } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  LoadingSkeleton,
  ScreenToolbar,
  Snackbar,
  SpotlightEmptyState,
  TourCard,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import { TabScreen } from '../../components/tab-screen';
import {
  useFloatingTabBarInset,
  useTabBarScrollPadding,
} from '../../components/floating-pill-tab-bar';
import { useAuth } from '../../lib/auth/auth-provider';
import { savedScreenCopy } from '../../lib/saved-screen-copy';
import { toursUiCopy } from '../../lib/tours/tours-ui-copy';
import {
  getTourAvailabilityProps,
  getTourBadgeLabel,
} from '../../lib/tours/card-labels';
import { useWishlist } from '../../lib/wishlist/wishlist-provider';

export default function SavedScreen() {
  const theme = useTheme();
  const t = savedScreenCopy;
  const mt = messages.mobile.tours;
  const at = messages.mobile.auth;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { ready, savedTours, isSaved, toggleSave, refresh } = useWishlist();
  const { status } = useAuth();
  const listBottomPadding = useTabBarScrollPadding(theme.spacing.md);
  const snackbarOffset = useFloatingTabBarInset() + theme.spacing.sm;
  const cardWidth = width - theme.spacing.md * 2;
  const styles = createStyles(theme, listBottomPadding);

  const [refreshing, setRefreshing] = useState(false);
  const [removedTour, setRemovedTour] = useState<TourCardData | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const data = useMemo(() => savedTours, [savedTours]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleToggleSave = useCallback(
    (tour: TourCardData) => {
      const removing = isSaved(tour.id);
      void toggleSave(tour);
      if (removing) {
        setRemovedTour(tour);
      }
    },
    [isSaved, toggleSave],
  );

  const undoRemove = useCallback(() => {
    if (removedTour) {
      void toggleSave(removedTour);
    }
    setRemovedTour(null);
  }, [removedTour, toggleSave]);

  const dismissSnackbar = useCallback(() => {
    setRemovedTour(null);
  }, []);

  if (status === 'signedOut') {
    return (
      <TabScreen largeTitle={false} scroll={false} contentStyle={styles.screen}>
        <ScreenToolbar title={t.title} />
        <SpotlightEmptyState
          title={at.signInPromptSaved}
          message={at.signInPromptSavedHint}
          centered
          actionLabel={at.signInCta}
          onAction={() => router.push('/(auth)/login')}
        />
      </TabScreen>
    );
  }

  return (
    <TabScreen largeTitle={false} scroll={false} contentStyle={styles.screen}>
      <ScreenToolbar title={t.title} />
      {!ready ? (
        <LoadingSkeleton variant="landscape" />
      ) : data.length === 0 ? (
        <SpotlightEmptyState
          title={t.emptyTitle}
          message={t.emptyHint}
          centered
          actionLabel={t.exploreCta}
          onAction={() => router.navigate('/tours')}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={color(theme, 'primary')}
            />
          }
          renderItem={({ item }) => {
            const availability = getTourAvailabilityProps(item);
            return (
              <TourCard
                tour={item}
                viewMode="horizontal"
                width={cardWidth}
                height={220}
                style={styles.card}
                daysLabel={mt.days}
                reviewsLabel={mt.reviews}
                viewTourLabel={mt.viewTour}
                badgeLabel={getTourBadgeLabel(item)}
                availabilityLabel={availability.label}
                availabilityUrgent={availability.urgent}
                saved={isSaved(item.id)}
                saveLabel={toursUiCopy.saveTour}
                unsaveLabel={toursUiCopy.unsaveTour}
                onToggleSave={() => handleToggleSave(item)}
                onPress={() =>
                  router.push({
                    pathname: '/tour/[slug]',
                    params: { slug: item.slug },
                  })
                }
              />
            );
          }}
        />
      )}
      <Snackbar
        visible={removedTour != null}
        message={removedTour ? t.removedToast(removedTour.title) : ''}
        actionLabel={t.undo}
        onAction={undoRemove}
        onDismiss={dismissSnackbar}
        bottomOffset={snackbarOffset}
      />
    </TabScreen>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  listBottomPadding: number,
) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    list: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: listBottomPadding,
    },
    card: {
      marginBottom: theme.spacing.md,
    },
  });
}
