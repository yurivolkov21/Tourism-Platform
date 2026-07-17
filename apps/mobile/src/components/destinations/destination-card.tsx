import { useId } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { DestinationCardData } from '@tourism/core';
import { AppText, color, useTheme } from '@tourism/mobile-ui';

import type { DestinationViewMode } from '../../lib/destinations/destination-filter-types';
import { destinationsUiCopy } from '../../lib/destinations/destinations-ui-copy';
import { RemoteImage } from '../remote-image';

type DestinationCardProps = {
  destination: DestinationCardData;
  regionLabel: string;
  tourCountLabel: string;
  viewToursLabel: string;
  viewMode?: DestinationViewMode;
  /** Explicit size for carousel / list cells. */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

const textHalo = {
  textShadowColor: 'rgba(0, 0, 0, 0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
} as const;

export function DestinationCard({
  destination,
  regionLabel,
  tourCountLabel,
  viewToursLabel,
  viewMode = 'vertical',
  width,
  height,
  style,
  onPress,
}: DestinationCardProps) {
  const theme = useTheme();
  const landscape = viewMode === 'horizontal';
  const styles = createStyles(theme, landscape, width, height);
  const onMedia = color(theme, 'on-media');
  const topLocation = [regionLabel, destination.country].filter(Boolean).join(', ');
  const idBase = useId().replace(/:/g, '');
  const topGradientId = `${idBase}-top`;
  const bottomGradientId = `${idBase}-bottom`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[destination.name, topLocation, tourCountLabel, viewToursLabel].join(
        ', ',
      )}
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
    >
      <RemoteImage
        uri={destination.image}
        style={styles.imageWrap}
        imageStyle={styles.image}
        accessibilityLabel={destination.name}
      />

      <View style={styles.topScrim} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={topGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={landscape ? 0.45 : 0.4} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${topGradientId})`} />
        </Svg>
      </View>
      <View style={styles.bottomScrim} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={bottomGradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.4" stopColor="#000000" stopOpacity={landscape ? 0.28 : 0.32} />
              <Stop offset="1" stopColor="#000000" stopOpacity={landscape ? 0.62 : 0.68} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${bottomGradientId})`} />
        </Svg>
      </View>

      <View style={styles.topBar} pointerEvents="none">
        <View style={styles.locationChip}>
          <Ionicons name="location-outline" size={14} color={onMedia} />
          <AppText variant="caption" style={styles.locationText} numberOfLines={1}>
            {topLocation}
          </AppText>
        </View>
      </View>

      <View style={styles.footer} pointerEvents="box-none">
        <View style={styles.copy} pointerEvents="none">
          <AppText variant="caption" style={styles.eyebrow} numberOfLines={1}>
            {destinationsUiCopy.recommendedEyebrow}
          </AppText>
          <AppText
            variant="headline"
            style={styles.title}
            numberOfLines={landscape ? 1 : 2}
          >
            {destination.name}
          </AppText>
          <View style={styles.metaRow}>
            <Ionicons name="map-outline" size={14} color={onMedia} />
            <AppText variant="caption" style={styles.meta} numberOfLines={1}>
              {tourCountLabel}
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
            size={landscape ? 18 : 20}
            color={color(theme, 'primary-foreground')}
          />
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  landscape: boolean,
  width: number | undefined,
  height: number | undefined,
) {
  const resolvedHeight = height ?? (landscape ? 176 : 320);
  const inset = landscape ? theme.spacing.md : theme.spacing.lg;

  return StyleSheet.create({
    card: {
      width: width ?? undefined,
      height: resolvedHeight,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: color(theme, 'muted'),
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.985 }],
    },
    imageWrap: {
      ...StyleSheet.absoluteFillObject,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    topScrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: landscape ? '32%' : '26%',
    },
    bottomScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: landscape ? '62%' : '52%',
    },
    topBar: {
      position: 'absolute',
      top: inset,
      left: inset,
      right: inset,
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 4,
      minWidth: 0,
    },
    locationText: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      maxWidth: '92%',
      textAlign: 'left',
      ...textHalo,
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
      gap: landscape ? 4 : 6,
      paddingRight: theme.spacing.xs,
    },
    eyebrow: {
      color: color(theme, 'on-media'),
      opacity: 0.92,
      fontFamily: theme.fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      ...textHalo,
    },
    title: {
      color: color(theme, 'on-media'),
      fontFamily: theme.fonts.sansSemibold,
      fontSize: landscape ? 22 : 28,
      lineHeight: landscape ? 28 : 34,
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0, 0, 0, 0.65)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    meta: {
      color: color(theme, 'on-media'),
      opacity: 0.95,
      fontFamily: theme.fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
      ...textHalo,
    },
    cta: {
      minWidth: landscape ? 52 : 58,
      height: landscape ? 44 : 48,
      paddingHorizontal: landscape ? theme.spacing.md : theme.spacing.lg,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color(theme, 'primary'),
      marginBottom: 2,
    },
  });
}
