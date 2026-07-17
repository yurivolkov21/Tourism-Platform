import { useEffect, useId, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  EmptyState,
  color,
  useBottomSafeInset,
  useTheme,
  useTopSafeInset,
} from '@tourism/mobile-ui';

import { RemoteImage } from '../../components/remote-image';
import { MediaPill, statusDotColor } from '../../components/trip-booking-card';
import type { TripBooking } from '../../lib/bookings/types';
import { getDemoBookingByCode } from '../../lib/demo/demo-bookings';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPrice(currency: string, amount: number): string {
  return currency === 'USD'
    ? `$${amount.toLocaleString('en-US')}`
    : `${currency} ${amount.toLocaleString('en-US')}`;
}

function DetailRow({
  label,
  value,
  valueColor,
  emphasized = false,
  isLast = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  emphasized?: boolean;
  isLast?: boolean;
}) {
  const theme = useTheme();
  const styles = createRowStyles(theme);

  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      <AppText
        variant="body"
        style={[
          emphasized ? styles.valueEmphasized : styles.value,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <AppText
      variant="caption"
      style={{
        textAlign: 'center',
        color: color(theme, 'rating'),
        fontFamily: theme.fonts.sansSemibold,
        letterSpacing: 0.6,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
      }}
    >
      {label}
    </AppText>
  );
}

export default function TripDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const theme = useTheme();
  const t = messages.booking.detail;
  const l = messages.booking.list;
  const p = messages.booking.page;
  const mt = messages.mobile.trips;
  const dash = messages.auth.account.dashboard.nextTrip;
  // undefined = still loading, null = not found.
  const [booking, setBooking] = useState<TripBooking | null | undefined>(
    undefined,
  );
  const topInset = useTopSafeInset();
  const bottomInset = useBottomSafeInset(theme.spacing.md);
  const styles = createStyles(theme);
  const onMedia = color(theme, 'on-media');
  const overlayGradientId = `${useId().replace(/:/g, '')}-overlay`;

  useEffect(() => {
    let active = true;
    if (typeof code !== 'string') {
      setBooking(null);
      return;
    }
    getDemoBookingByCode(code).then(
      (found) => {
        if (active) setBooking(found ?? null);
      },
      () => {
        if (active) setBooking(null);
      },
    );
    return () => {
      active = false;
    };
  }, [code]);

  if (booking === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: t.title, headerShown: true }} />
        <View style={styles.loading}>
          <ActivityIndicator color={color(theme, 'primary')} />
        </View>
      </>
    );
  }

  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ title: t.title, headerShown: true }} />
        <EmptyState
          message={mt.notFound}
          actionLabel={mt.back}
          onAction={() => router.back()}
        />
      </>
    );
  }

  const travellers =
    booking.numChildren > 0
      ? `${p.adultsLine(booking.numAdults)} · ${p.childrenLine(booking.numChildren)}`
      : p.adultsLine(booking.numAdults);
  const provider =
    booking.paymentProvider.charAt(0) +
    booking.paymentProvider.slice(1).toLowerCase();
  const isPending = booking.status === 'PENDING';
  const isPaid = booking.status === 'PAID';

  const showDemoAlert = (title: string, body: string) => {
    Alert.alert(title, body, [{ text: 'OK' }]);
  };

  const confirmCancel = () => {
    Alert.alert(t.cancelConfirmTitle, t.cancelConfirmBody, [
      { text: t.keep, style: 'cancel' },
      {
        text: t.cancelConfirmCta,
        style: 'destructive',
        onPress: () => showDemoAlert(t.cancel, mt.cancelDemo),
      },
    ]);
  };

  const openTour = () => {
    router.push({
      pathname: '/tour/[slug]',
      params: { slug: booking.tourSlug },
    });
  };

  const circleAction = isPending
    ? {
        icon: 'trash-outline' as const,
        label: t.cancel,
        onPress: confirmCancel,
      }
    : isPaid
      ? {
          icon: 'chatbubble-ellipses-outline' as const,
          label: t.requestCta,
          onPress: () => showDemoAlert(t.requestCta, mt.requestDemo),
        }
      : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* White status-bar icons while this photo-backed screen is mounted. */}
      <StatusBar style="light" />
      <View style={styles.root}>
        <RemoteImage
          uri={booking.image}
          style={styles.backdrop}
          accessibilityLabel={booking.tourTitle}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient
                id={overlayGradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0" stopColor="#000000" stopOpacity={0.34} />
                <Stop offset="0.34" stopColor="#000000" stopOpacity={0.22} />
                <Stop offset="0.62" stopColor="#000000" stopOpacity={0.72} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0.9} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={`url(#${overlayGradientId})`}
            />
          </Svg>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mt.back}
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { top: topInset + theme.spacing.sm },
            pressed && styles.backButtonPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={26} color={onMedia} />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: topInset + 220,
              paddingBottom: bottomInset + 96,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {booking.daysUntilDeparture != null ? (
            <View style={styles.pillRow}>
              <MediaPill
                label={dash.countdown(booking.daysUntilDeparture)}
                icon="calendar-outline"
              />
            </View>
          ) : null}

          <AppText variant="largeTitle" style={styles.title}>
            {booking.tourTitle}
          </AppText>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={onMedia} />
            <AppText
              variant="caption"
              style={styles.location}
              numberOfLines={1}
            >
              {booking.destination}
            </AppText>
          </View>

          <SectionLabel label={t.title} />
          <DetailRow
            label={l.departureLabel}
            value={formatDate(booking.departureDate)}
          />
          <DetailRow label={l.travellersLabel} value={travellers} />
          <DetailRow
            label={mt.statusLabel}
            value={l.status[booking.status]}
            valueColor={statusDotColor(theme, booking.status)}
          />
          <DetailRow label={l.refLabel} value={booking.code} />
          <DetailRow label={t.paymentLabel} value={provider} />
          <DetailRow
            label={mt.bookedOnLabel}
            value={formatDate(booking.bookedOn)}
          />
          <DetailRow
            label={l.totalLabel}
            value={formatPrice(booking.currency, booking.totalAmount)}
            emphasized
            isLast
          />

          <SectionLabel label={t.contactLabel} />
          <DetailRow label={mt.contactNameLabel} value={booking.contactName} />
          <DetailRow
            label={mt.contactEmailLabel}
            value={booking.contactEmail}
            isLast={!booking.contactPhone && !booking.specialRequests}
          />
          {booking.contactPhone ? (
            <DetailRow
              label={mt.contactPhoneLabel}
              value={booking.contactPhone}
              isLast={!booking.specialRequests}
            />
          ) : null}
          {booking.specialRequests ? (
            <DetailRow
              label={t.requestsLabel}
              value={booking.specialRequests}
              isLast
            />
          ) : null}
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: bottomInset }]}>
          <Button
            label={isPending ? t.payNow : l.viewTour}
            onPress={
              isPending ? () => showDemoAlert(t.payNow, mt.payDemo) : openTour
            }
            style={styles.actionPill}
          />
          {circleAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={circleAction.label}
              onPress={circleAction.onPress}
              style={({ pressed }) => [
                styles.actionCircle,
                pressed && styles.actionCirclePressed,
              ]}
            >
              <Ionicons name={circleAction.icon} size={20} color={onMedia} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </>
  );
}

function createRowStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingVertical: 13,
      paddingHorizontal: theme.spacing.md,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(255, 255, 255, 0.22)',
    },
    label: {
      color: color(theme, 'on-media'),
      opacity: 0.75,
      fontSize: 15,
    },
    value: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansMedium,
      fontSize: 15,
      flexShrink: 1,
      textAlign: 'right',
    },
    valueEmphasized: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansSemibold,
      fontSize: 18,
      flexShrink: 1,
      textAlign: 'right',
    },
  });
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'background'),
    },
    root: {
      flex: 1,
      backgroundColor: color(theme, 'foreground'),
    },
    backButton: {
      position: 'absolute',
      left: theme.spacing.md,
      zIndex: 10,
      width: 44,
      height: 44,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    backButtonPressed: {
      opacity: 0.6,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
    },
    pillRow: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      textAlign: 'center',
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.heading,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0, 0, 0, 0.65)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      marginTop: theme.spacing.sm,
    },
    location: {
      color: color(theme, 'on-media'),
      opacity: 0.92,
      fontFamily: theme.fonts.sansMedium,
    },
    actions: {
      position: 'absolute',
      left: theme.spacing.md,
      right: theme.spacing.md,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    actionPill: {
      flex: 1,
      borderRadius: 999,
    },
    actionCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'overlay'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'on-media'),
    },
    actionCirclePressed: {
      opacity: 0.75,
    },
  });
}
