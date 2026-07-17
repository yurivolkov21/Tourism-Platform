import { Ionicons } from '@expo/vector-icons';
import { useId, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { messages } from '@tourism/i18n';
import { AppText, cardElevation, color, useTheme } from '@tourism/mobile-ui';

import type { TripBooking, TripBookingStatus } from '../lib/bookings/types';
import { RemoteImage } from './remote-image';

type TripBookingCardProps = {
  booking: TripBooking;
  onPress?: () => void;
  past?: boolean;
  /** Small uppercase line above the title (e.g. "Your next trip"). */
  eyebrow?: string;
  /** e.g. "In 44 days" — shown as a pill over the image. */
  countdownLabel?: string;
  height?: number;
};

const textHalo = {
  textShadowColor: 'rgba(0, 0, 0, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function statusDotColor(
  theme: ReturnType<typeof useTheme>,
  status: TripBookingStatus,
): string {
  switch (status) {
    case 'PAID':
      return color(theme, 'success');
    case 'PENDING':
      return color(theme, 'warning');
    default:
      return color(theme, 'muted-foreground');
  }
}

/** Quiet status line (colored dot + label) — used by the trip detail screen. */
export function BookingStatusLine({
  status,
  emphasized = false,
}: {
  status: TripBookingStatus;
  emphasized?: boolean;
}) {
  const theme = useTheme();
  const t = messages.booking.list;
  const styles = createStatusStyles(theme);

  return (
    <View style={styles.row}>
      <View
        style={[styles.dot, { backgroundColor: statusDotColor(theme, status) }]}
      />
      <AppText
        variant="caption"
        style={[styles.label, emphasized && styles.labelEmphasized]}
      >
        {t.status[status]}
      </AppText>
    </View>
  );
}

/** Top + bottom gradient scrims that keep overlay text readable on any photo. */
export function MediaScrims({
  topHeight = '34%',
  bottomHeight = '64%',
}: {
  topHeight?: DimensionValue;
  bottomHeight?: DimensionValue;
}) {
  const idBase = useId().replace(/:/g, '');
  const topGradientId = `${idBase}-top`;
  const bottomGradientId = `${idBase}-bottom`;

  return (
    <>
      <View
        style={[scrimStyles.top, { height: topHeight }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={topGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.4} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${topGradientId})`}
          />
        </Svg>
      </View>
      <View
        style={[scrimStyles.bottom, { height: bottomHeight }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={bottomGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.45" stopColor="#000000" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.66} />
            </LinearGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${bottomGradientId})`}
          />
        </Svg>
      </View>
    </>
  );
}

const scrimStyles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

/** Translucent overlay pill (countdown, status) for text over photos. */
export function MediaPill({
  label,
  icon,
  dotColor,
}: {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  dotColor?: string;
}) {
  const theme = useTheme();
  const styles = createPillStyles(theme);
  const onMedia = color(theme, 'on-media');

  return (
    <View style={styles.pill}>
      {icon ? <Ionicons name={icon} size={13} color={onMedia} /> : null}
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      ) : null}
      <AppText variant="caption" style={styles.text} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

function createPillStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: 5,
      backgroundColor: color(theme, 'overlay'),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'on-media'),
    },
    text: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      flexShrink: 1,
      ...textHalo,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
  });
}

/** Immersive full-image booking card (tours-catalog visual language). */
export function TripBookingCard({
  booking,
  onPress,
  past = false,
  eyebrow,
  countdownLabel,
  height,
}: TripBookingCardProps) {
  const theme = useTheme();
  const t = messages.booking.list;
  const p = messages.booking.page;
  const styles = createStyles(theme, past, height);
  const onMedia = color(theme, 'on-media');

  const travellers =
    booking.numChildren > 0
      ? `${p.adultsLine(booking.numAdults)} · ${p.childrenLine(booking.numChildren)}`
      : p.adultsLine(booking.numAdults);

  const accessibilityLabel = [
    eyebrow,
    booking.tourTitle,
    formatDate(booking.departureDate),
    travellers,
    t.status[booking.status],
    countdownLabel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <RemoteImage
        uri={booking.image}
        style={styles.imageWrap}
        imageStyle={past ? styles.imagePast : undefined}
        accessibilityLabel={booking.tourTitle}
      />

      <MediaScrims />

      <View style={styles.topBar} pointerEvents="none">
        {countdownLabel ? (
          <MediaPill label={countdownLabel} icon="calendar-outline" />
        ) : (
          <View style={styles.topBarSpacer} />
        )}
        <MediaPill
          label={t.status[booking.status]}
          dotColor={statusDotColor(theme, booking.status)}
        />
      </View>

      <View style={styles.footer} pointerEvents="none">
        <View style={styles.copy}>
          {eyebrow ? (
            <AppText variant="caption" style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="headline" style={styles.title} numberOfLines={2}>
            {booking.tourTitle}
          </AppText>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={onMedia} />
            <AppText variant="caption" style={styles.meta} numberOfLines={1}>
              {formatDate(booking.departureDate)}
            </AppText>
            <View style={styles.metaDot} />
            <Ionicons name="people-outline" size={13} color={onMedia} />
            <AppText variant="caption" style={styles.meta} numberOfLines={1}>
              {travellers}
            </AppText>
          </View>
        </View>

        <View
          style={styles.cta}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons
            name="arrow-forward"
            size={18}
            color={color(theme, 'primary-foreground')}
          />
        </View>
      </View>
    </Pressable>
  );
}

function createStatusStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    label: {
      color: color(theme, 'muted-foreground'),
    },
    labelEmphasized: {
      color: color(theme, 'foreground'),
      fontFamily: theme.fonts.sansMedium,
    },
  });
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  past: boolean,
  height: number | undefined,
) {
  const inset = theme.spacing.md;
  const large = (height ?? 190) >= 220;

  return StyleSheet.create({
    card: {
      height: height ?? 190,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
      ...cardElevation(theme, { subdued: past }),
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.98 }],
    },
    imageWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    imagePast: {
      opacity: 0.75,
    },
    topBar: {
      position: 'absolute',
      top: inset,
      left: inset,
      right: inset,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    topBarSpacer: {
      flex: 1,
    },
    footer: {
      position: 'absolute',
      left: inset,
      right: inset,
      bottom: inset,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.md,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    eyebrow: {
      color: color(theme, 'on-media'),
      opacity: 0.92,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontFamily: theme.fonts.sansSemibold,
      fontSize: 10,
      lineHeight: 13,
      ...textHalo,
    },
    title: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.heading,
      fontSize: large ? 21 : 17,
      lineHeight: large ? 26 : 22,
      letterSpacing: -0.3,
      textShadowColor: 'rgba(0, 0, 0, 0.65)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    meta: {
      color: color(theme, 'on-media'),
      opacity: 0.95,
      fontFamily: theme.fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      flexShrink: 1,
      ...textHalo,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: color(theme, 'on-media'),
      opacity: 0.55,
    },
    cta: {
      minWidth: 44,
      minHeight: 44,
      width: 48,
      height: 44,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'primary'),
    },
  });
}
