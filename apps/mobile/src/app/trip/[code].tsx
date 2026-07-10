import { type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  EmptyState,
  Screen,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import { RemoteImage } from '../../components/remote-image';
import { bookingStatusColors } from '../../components/trip-booking-card';
import { getMockTripByCode } from '../../lib/demo/mock-trip-bookings';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPrice(currency: string, amount: number): string {
  return currency === 'USD'
    ? `$${amount.toLocaleString('en-US')}`
    : `${currency} ${amount.toLocaleString('en-US')}`;
}

function DetailField({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 12,
        gap: 4,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: color(theme, 'border'),
      }}
    >
      <AppText variant="caption" muted style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </AppText>
      <AppText variant="body" style={{ fontWeight: '500' }}>
        {value}
      </AppText>
    </View>
  );
}

function DetailGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        marginHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: color(theme, 'card'),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: color(theme, 'border'),
      }}
    >
      {children}
    </View>
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
  const booking = typeof code === 'string' ? getMockTripByCode(code) : undefined;
  const styles = createStyles(theme);

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

  const badge = bookingStatusColors(theme, booking.status);
  const travellers =
    booking.numChildren > 0
      ? `${p.adultsLine(booking.numAdults)} · ${p.childrenLine(booking.numChildren)}`
      : p.adultsLine(booking.numAdults);
  const provider =
    booking.paymentProvider.charAt(0) + booking.paymentProvider.slice(1).toLowerCase();
  const contactLine = [booking.contactName, booking.contactEmail, booking.contactPhone]
    .filter(Boolean)
    .join(' · ');
  const isPending = booking.status === 'PENDING';

  const showDemoAlert = (title: string, body: string) => {
    Alert.alert(title, body, [{ text: 'OK' }]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t.title, headerShown: true }} />
      <Screen scroll largeTitle={false}>
        <RemoteImage uri={booking.image} style={styles.hero} accessibilityLabel={booking.tourTitle} />

        <View style={styles.titleBlock}>
          <AppText variant="headline" style={styles.title}>
            {booking.tourTitle}
          </AppText>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <AppText variant="caption" style={[styles.badgeText, { color: badge.text }]}>
              {l.status[booking.status]}
            </AppText>
          </View>
        </View>

        <DetailGroup>
          <DetailField label={l.departureLabel} value={formatDate(booking.departureDate)} />
          <DetailField label={l.travellersLabel} value={travellers} />
          <DetailField label={l.refLabel} value={booking.code} />
          <DetailField label={l.totalLabel} value={formatPrice(booking.currency, booking.totalAmount)} />
          <DetailField label={t.paymentLabel} value={provider} isLast />
        </DetailGroup>

        <DetailGroup>
          <DetailField label={t.contactLabel} value={contactLine} isLast={!booking.specialRequests} />
          {booking.specialRequests ? (
            <DetailField label={t.requestsLabel} value={booking.specialRequests} isLast />
          ) : null}
        </DetailGroup>

        <AppText variant="caption" muted style={styles.bookedOn}>
          {l.bookedOn(formatDate(booking.bookedOn))}
        </AppText>

        <View style={styles.actions}>
          {isPending ? (
            <>
              <Button label={t.payNow} onPress={() => showDemoAlert(t.payNow, mt.payDemo)} />
              <Button
                label={t.cancel}
                variant="secondary"
                onPress={() =>
                  Alert.alert(t.cancelConfirmTitle, t.cancelConfirmBody, [
                    { text: t.keep, style: 'cancel' },
                    {
                      text: t.cancelConfirmCta,
                      style: 'destructive',
                      onPress: () => showDemoAlert(t.cancel, mt.cancelDemo),
                    },
                  ])
                }
              />
            </>
          ) : booking.status === 'PAID' ? (
            <Button
              label={t.requestCta}
              variant="secondary"
              onPress={() => showDemoAlert(t.requestCta, mt.requestDemo)}
            />
          ) : null}
        </View>
      </Screen>
    </>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    hero: {
      marginHorizontal: theme.spacing.md,
      height: 200,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
      marginBottom: theme.spacing.md,
    },
    titleBlock: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      color: color(theme, 'foreground'),
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.sm,
    },
    badgeText: { fontWeight: '600', fontSize: 11 },
    bookedOn: {
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    actions: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
  });
}
