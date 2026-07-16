import { Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, ScrimImage, useTheme } from '@tourism/mobile-ui';
import type { DestinationChipVm } from '../lib/destinations';

const t = messages.mobile.home;

/** Giant full-height card of the Home region browser (Navel Screen-18):
 * location pin top-right on the photo, "Recommended" eyebrow + huge Fraunces
 * name + tours row at the foot, and a translucent brass arrow panel — the
 * whole card (arrow included) pushes the filtered Explore. */
export function DestinationHeroCard({
  destination,
  onPress,
}: {
  destination: DestinationChipVm;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * 0.68);
  return (
    <Pressable
      testID={`region-card-${destination.slug}`}
      accessibilityRole="button"
      accessibilityLabel={destination.name}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        width: cardWidth,
        height: '100%',
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.9 : 1,
      })}
    >
      <ScrimImage uri={destination.image} alt={destination.name} fill>
        {/* Foot content clears the arrow panel on the right. */}
        <View style={{ gap: theme.spacing(1), paddingRight: 88 }}>
          <AppText
            variant="caption"
            style={{ color: theme.colors['on-media'], opacity: 0.85 }}
          >
            {t.recommendedEyebrow}
          </AppText>
          <AppText
            numberOfLines={2}
            style={{
              fontFamily: theme.fontFamilies.headingBold,
              fontSize: 34,
              lineHeight: 40,
              color: theme.colors['on-media'],
            }}
          >
            {destination.name}
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(1),
              marginTop: theme.spacing(1),
            }}
          >
            <Ionicons
              name="compass-outline"
              size={14}
              color={theme.colors['on-media']}
            />
            <AppText
              variant="caption"
              style={{ color: theme.colors['on-media'], opacity: 0.85 }}
            >
              {destination.toursCount} {messages.destinations.toursLabel}
            </AppText>
          </View>
        </View>
      </ScrimImage>
      {/* Location pin — top-right on the photo (Navel Screen-18). */}
      {destination.region ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: theme.spacing(4),
            right: theme.spacing(4),
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(1),
            maxWidth: cardWidth - theme.spacing(8),
          }}
        >
          <Ionicons
            name="location-sharp"
            size={13}
            color={theme.colors['on-media']}
          />
          <AppText
            variant="caption"
            numberOfLines={1}
            style={{ color: theme.colors['on-media'] }}
          >
            {destination.region}
          </AppText>
        </View>
      ) : null}
      {/* Translucent brass arrow panel — visual affordance; the whole card is
          the button. Token hex + alpha suffix keeps the no-hex rule intact. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: theme.spacing(4),
          bottom: theme.spacing(4),
          width: 84,
          height: 56,
          borderRadius: theme.radius.lg,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['primary'] + '4D',
        }}
      >
        <Ionicons
          name="arrow-forward"
          size={24}
          color={theme.colors['primary']}
        />
      </View>
    </Pressable>
  );
}
