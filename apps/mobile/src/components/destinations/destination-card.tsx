import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { DestinationCardData } from '@tourism/core';
import { AppText, color, useTheme } from '@tourism/mobile-ui';

import { RemoteImage } from '../remote-image';

type DestinationCardProps = {
  destination: DestinationCardData;
  regionLabel: string;
  tourCountLabel: string;
  viewToursLabel: string;
  onPress?: () => void;
};

export function DestinationCard({
  destination,
  regionLabel,
  tourCountLabel,
  viewToursLabel,
  onPress,
}: DestinationCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const tagline = destination.description?.trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[destination.name, regionLabel, tourCountLabel, viewToursLabel].join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <RemoteImage
        uri={destination.image}
        style={styles.imageWrap}
        imageStyle={styles.image}
        accessibilityLabel={destination.name}
      />
      <View style={styles.body}>
        <AppText variant="caption" muted numberOfLines={1}>
          {regionLabel}
        </AppText>
        <AppText variant="headline" numberOfLines={2} style={styles.name}>
          {destination.name}
        </AppText>
        {tagline ? (
          <AppText variant="body" muted numberOfLines={2} style={styles.tagline}>
            {tagline}
          </AppText>
        ) : null}
        <View style={styles.footer}>
          <AppText variant="caption" style={styles.tourCount}>
            {tourCountLabel}
          </AppText>
          <View style={styles.ctaRow}>
            <AppText variant="caption" style={styles.cta}>
              {viewToursLabel}
            </AppText>
            <Ionicons name="arrow-forward" size={14} color={color(theme, 'primary')} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color(theme, 'border'),
      backgroundColor: color(theme, 'card'),
    },
    cardPressed: {
      opacity: 0.92,
    },
    imageWrap: {
      width: '100%',
      height: 168,
      backgroundColor: color(theme, 'muted'),
    },
    image: {
      width: '100%',
      height: 168,
    },
    body: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    name: {
      fontFamily: theme.fonts.sansSemibold,
    },
    tagline: {
      marginTop: 2,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    tourCount: {
      color: color(theme, 'muted-foreground'),
      fontFamily: theme.fonts.sansMedium,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cta: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansSemibold,
    },
  });
}
