import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';

import { normalizeText } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Screen,
  ScreenToolbar,
  SearchField,
  SectionHeader,
  SpotlightEmptyState,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import { useTabBarScrollPadding } from '../../components/floating-pill-tab-bar';
import {
  useHideTabBarOnScroll,
  useTabBarVisibility,
} from '../../components/tab-bar-visibility';
import { TripBookingCard } from '../../components/trip-booking-card';
import { useAuth } from '../../lib/auth/auth-provider';
import {
  getNextTrip,
  splitBookings,
  useDemoBookings,
} from '../../lib/demo/demo-bookings';

export default function TripsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = messages.mobile.trips;
  const at = messages.mobile.auth;
  const dash = messages.auth.account.dashboard.nextTrip;
  const styles = createStyles(theme, useTabBarScrollPadding());
  const { bookings, loading, refreshing, error, load } = useDemoBookings();
  const { show } = useTabBarVisibility();
  const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();
  const { status } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length > 0;

  const visibleBookings = searching
    ? bookings.filter((b) =>
        normalizeText(`${b.tourTitle} ${b.destination} ${b.code}`).includes(
          normalizeText(trimmedQuery),
        ),
      )
    : bookings;

  // The hero slot only makes sense on the unfiltered view.
  const nextTrip = searching ? null : getNextTrip(visibleBookings);
  const { upcoming, past } = splitBookings(visibleBookings);
  const otherUpcoming = upcoming.filter((b) => b.code !== nextTrip?.code);

  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) setQuery('');
      return !open;
    });
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        show();
      };
    }, [show]),
  );

  const openDetail = (bookingCode: string) => {
    router.push({ pathname: '/trip/[code]', params: { code: bookingCode } });
  };

  if (status === 'signedOut') {
    return (
      <Screen largeTitle={false} scroll={false} contentStyle={styles.screenRoot}>
        <ScreenToolbar title={t.title} />
        <SpotlightEmptyState
          title={at.signInPromptTrips}
          message={at.signInPromptTripsHint}
          centered
          actionLabel={at.signInCta}
          onAction={() => router.push('/(auth)/login')}
        />
      </Screen>
    );
  }

  if (loading && bookings.length === 0) {
    return (
      <Screen
        largeTitle={false}
        scroll={false}
        contentStyle={styles.screenRoot}
      >
        <ScreenToolbar title={t.title} />
        <LoadingSkeleton variant="landscape" />
      </Screen>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <Screen
        largeTitle={false}
        scroll={false}
        contentStyle={styles.screenRoot}
      >
        <ScreenToolbar title={t.title} />
        <ErrorState
          message={t.error}
          retryLabel={t.retry}
          onRetry={() => void load()}
        />
      </Screen>
    );
  }

  if (bookings.length === 0) {
    return (
      <Screen
        largeTitle={false}
        scroll={false}
        contentStyle={styles.screenRoot}
      >
        <ScreenToolbar title={t.title} />
        <SpotlightEmptyState
          title={t.emptyTitle}
          message={t.emptyHint}
          centered
          actionLabel={t.exploreCta}
          onAction={() => router.navigate('/tours')}
        />
      </Screen>
    );
  }

  return (
    <Screen largeTitle={false} scroll={false} contentStyle={styles.screenRoot}>
      <ScreenToolbar
        title={t.title}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.searchLabel}
            accessibilityState={{ expanded: searchOpen }}
            hitSlop={10}
            onPress={toggleSearch}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
          >
            <Ionicons
              name={searchOpen ? 'close' : 'search-outline'}
              size={22}
              color={color(theme, 'muted-foreground')}
            />
          </Pressable>
        }
      />
      {searchOpen ? (
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchPlaceholder}
          accessibilityLabel={t.searchLabel}
        />
      ) : null}
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={color(theme, 'primary')}
          />
        }
      >
        {searching && visibleBookings.length === 0 ? (
          <EmptyState message={t.searchEmpty} />
        ) : null}

        {nextTrip ? (
          <TripBookingCard
            booking={nextTrip}
            eyebrow={t.nextTrip}
            height={260}
            countdownLabel={
              nextTrip.daysUntilDeparture != null
                ? dash.countdown(nextTrip.daysUntilDeparture)
                : undefined
            }
            onPress={() => openDetail(nextTrip.code)}
          />
        ) : null}

        {otherUpcoming.length > 0 ? (
          <>
            <SectionHeader title={t.upcoming} />
            {otherUpcoming.map((booking) => (
              <TripBookingCard
                key={booking.code}
                booking={booking}
                countdownLabel={
                  booking.daysUntilDeparture != null
                    ? dash.countdown(booking.daysUntilDeparture)
                    : undefined
                }
                onPress={() => openDetail(booking.code)}
              />
            ))}
          </>
        ) : null}

        {past.length > 0 ? (
          <>
            <SectionHeader title={t.past} />
            {past.map((booking) => (
              <TripBookingCard
                key={booking.code}
                booking={booking}
                past
                onPress={() => openDetail(booking.code)}
              />
            ))}
          </>
        ) : null}
      </Animated.ScrollView>
    </Screen>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  scrollBottomPadding: number,
) {
  return StyleSheet.create({
    screenRoot: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: theme.spacing.sm,
      paddingBottom: scrollBottomPadding,
    },
    headerAction: {
      width: theme.minTouch,
      height: theme.minTouch,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActionPressed: {
      opacity: 0.55,
    },
  });
}
