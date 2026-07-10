import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { messages } from '@tourism/i18n';
import {
  AppText,
  cardPressedStyle,
  cardShell,
  color,
  useTheme,
} from '@tourism/mobile-ui';

import type { TripBooking, TripBookingStatus } from '../lib/bookings/types';
import { RemoteImage } from './remote-image';

type TripBookingCardProps = {
  booking: TripBooking;
  onPress?: () => void;
  past?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function bookingStatusColors(
  theme: ReturnType<typeof useTheme>,
  status: TripBookingStatus,
): { bg: string; text: string } {
  switch (status) {
    case 'PAID':
      return { bg: color(theme, 'success'), text: color(theme, 'success-foreground') };
    case 'PENDING':
      return { bg: color(theme, 'warning'), text: color(theme, 'warning-foreground') };
    case 'CANCELLED':
    case 'REFUNDED':
      return { bg: color(theme, 'muted'), text: color(theme, 'muted-foreground') };
    default:
      return { bg: color(theme, 'muted'), text: color(theme, 'muted-foreground') };
  }
}

export function TripBookingCard({ booking, onPress, past = false }: TripBookingCardProps) {
  const theme = useTheme();
  const t = messages.booking.list;
  const p = messages.booking.page;
  const styles = createStyles(theme, past);
  const badge = bookingStatusColors(theme, booking.status);
  const travellers =
    booking.numChildren > 0
      ? `${p.adultsLine(booking.numAdults)} · ${p.childrenLine(booking.numChildren)}`
      : p.adultsLine(booking.numAdults);
  const muted = color(theme, 'muted-foreground');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && cardPressedStyle()]}
    >
      <View style={styles.imageWrap}>
        <RemoteImage
          uri={booking.image}
          style={[styles.image, past && styles.imagePast]}
          accessibilityLabel={booking.tourTitle}
        />
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <AppText variant="caption" style={[styles.badgeText, { color: badge.text }]}>
            {t.status[booking.status]}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="headline" numberOfLines={2} style={styles.title}>
            {booking.tourTitle}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={muted} />
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={muted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
            {booking.destination}
          </AppText>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={muted} />
          <AppText variant="caption" muted style={styles.metaText}>
            {formatDate(booking.departureDate)}
          </AppText>
          <View style={styles.metaDot} />
          <Ionicons name="people-outline" size={14} color={muted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
            {travellers}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>, past: boolean) {
  return StyleSheet.create({
    card: cardShell(theme, { subdued: past }),
    imageWrap: {
      height: 120,
      backgroundColor: color(theme, 'muted'),
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePast: {
      opacity: 0.82,
    },
    badge: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.sm,
    },
    badgeText: { fontWeight: '600', fontSize: 11 },
    body: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    title: { flex: 1 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    metaText: { flexShrink: 1 },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: color(theme, 'border'),
      marginHorizontal: 2,
    },
  });
}
