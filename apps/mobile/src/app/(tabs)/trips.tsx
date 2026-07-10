import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';

import { messages } from '@tourism/i18n';
import {
  AppText,
  Screen,
  SectionHeader,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import { useTabBarScrollPadding } from '../../components/floating-pill-tab-bar';
import {
  useHideTabBarOnScroll,
  useTabBarVisibility,
} from '../../components/tab-bar-visibility';
import { RemoteImage } from '../../components/remote-image';
import {
  TripBookingCard,
  bookingStatusColors,
} from '../../components/trip-booking-card';
import {
  MOCK_TRIP_BOOKINGS,
  getNextTrip,
  splitMockBookings,
} from '../../lib/demo/mock-trip-bookings';

function formatHeroDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function TripsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = messages.mobile.trips;
  const list = messages.booking.list;
  const dash = messages.auth.account.dashboard.nextTrip;
  const styles = createStyles(theme, useTabBarScrollPadding());
  const nextTrip = getNextTrip(MOCK_TRIP_BOOKINGS);
  const { upcoming, past } = splitMockBookings(MOCK_TRIP_BOOKINGS);
  const otherUpcoming = upcoming.filter((b) => b.code !== nextTrip?.code);
  const nextTripBadge = nextTrip ? bookingStatusColors(theme, nextTrip.status) : null;
  const muted = color(theme, 'muted-foreground');
  const { show } = useTabBarVisibility();
  const { onScroll, scrollEventThrottle } = useHideTabBarOnScroll();

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

  return (
    <Screen title={t.title} scroll={false} contentStyle={styles.screenRoot}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
      >
      {nextTrip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.nextTrip}: ${nextTrip.tourTitle}`}
          onPress={() => openDetail(nextTrip.code)}
          style={({ pressed }) => [pressed && styles.heroPressed]}
        >
          <View style={styles.hero}>
            <View style={styles.heroImageWrap}>
              <RemoteImage
                uri={nextTrip.image}
                style={styles.heroImage}
                accessibilityLabel={nextTrip.tourTitle}
              />
              {nextTrip.daysUntilDeparture != null ? (
                <View style={styles.countdownPill}>
                  <Ionicons name="calendar-outline" size={14} color={color(theme, 'primary')} />
                  <AppText variant="caption" style={styles.countdownText}>
                    {dash.countdown(nextTrip.daysUntilDeparture)}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.heroBody}>
              <View style={styles.heroHeaderRow}>
                <AppText variant="caption" style={styles.heroEyebrow}>
                  {t.nextTrip}
                </AppText>
                {nextTripBadge ? (
                  <View
                    style={[styles.heroStatus, { backgroundColor: nextTripBadge.bg }]}
                  >
                    <AppText
                      variant="caption"
                      style={[styles.heroStatusText, { color: nextTripBadge.text }]}
                    >
                      {list.status[nextTrip.status]}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText variant="headline" style={styles.heroTitle} numberOfLines={2}>
                {nextTrip.tourTitle}
              </AppText>

              <View style={styles.heroMetaRow}>
                <Ionicons name="location-outline" size={15} color={muted} />
                <AppText variant="body" style={styles.heroMeta}>
                  {nextTrip.destination}
                </AppText>
              </View>

              <View style={styles.heroMetaRow}>
                <Ionicons name="calendar-outline" size={15} color={muted} />
                <AppText variant="body" style={styles.heroMeta}>
                  {formatHeroDate(nextTrip.departureDate)}
                </AppText>
              </View>
            </View>
          </View>
        </Pressable>
      ) : null}

      {otherUpcoming.length > 0 ? (
        <>
          <SectionHeader title={t.upcoming} />
          {otherUpcoming.map((booking) => (
            <TripBookingCard
              key={booking.code}
              booking={booking}
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

function createStyles(theme: ReturnType<typeof useTheme>, scrollBottomPadding: number) {
  return StyleSheet.create({
    screenRoot: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: scrollBottomPadding,
    },
    heroPressed: { opacity: 0.96 },
    hero: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.radius.lg + 4,
      overflow: 'hidden',
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      ...Platform.select({
        ios: {
          shadowColor: color(theme, 'foreground'),
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 14,
        },
        android: { elevation: 4 },
      }),
    },
    heroImageWrap: {
      height: 148,
      backgroundColor: color(theme, 'muted'),
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    countdownPill: {
      position: 'absolute',
      top: theme.spacing.sm,
      left: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: color(theme, 'card'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        },
        android: { elevation: 3 },
      }),
    },
    countdownText: {
      color: color(theme, 'foreground'),
      fontWeight: '600',
    },
    heroBody: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    heroEyebrow: {
      color: color(theme, 'primary'),
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
      flex: 1,
    },
    heroStatus: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.sm,
    },
    heroStatusText: {
      fontWeight: '600',
      fontSize: 11,
    },
    heroTitle: {
      color: color(theme, 'foreground'),
      fontSize: 20,
      lineHeight: 26,
    },
    heroMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    heroMeta: {
      color: color(theme, 'foreground'),
      flex: 1,
    },
  });
}
