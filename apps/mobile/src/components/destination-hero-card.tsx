import { Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, ScrimImage, useTheme } from '@tourism/mobile-ui';
import type { DestinationChipVm } from '../lib/destinations';

/** Giant portrait card of the Home region browser (Navel Screen-17): tours
 * count pill on the photo, huge Fraunces name + region at the foot, brass
 * arrow — the whole card (and the arrow) push the filtered Explore. */
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
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.9 : 1,
      })}
    >
      <ScrimImage
        uri={destination.image}
        alt={destination.name}
        aspectRatio={0.62}
      >
        <View
          style={{ gap: theme.spacing(1), paddingBottom: theme.spacing(1) }}
        >
          <AppText
            variant="caption"
            style={{ color: theme.colors['on-media'], opacity: 0.85 }}
          >
            {destination.toursCount} {messages.destinations.toursLabel}
          </AppText>
          <AppText
            numberOfLines={2}
            style={{
              fontFamily: theme.fontFamilies.headingBold,
              fontSize: 30,
              lineHeight: 36,
              color: theme.colors['on-media'],
            }}
          >
            {destination.name}
          </AppText>
          {destination.region ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing(1),
              }}
            >
              <Ionicons
                name="location-outline"
                size={13}
                color={theme.colors['on-media']}
              />
              <AppText
                variant="caption"
                style={{ color: theme.colors['on-media'], opacity: 0.85 }}
              >
                {destination.region}
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrimImage>
      {/* Brass arrow — visual affordance; the whole card is the button. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: theme.spacing(3),
          bottom: theme.spacing(3),
          width: 64,
          height: 44,
          borderRadius: theme.radius.lg,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['primary'],
          opacity: 0.92,
        }}
      >
        <Ionicons
          name="arrow-forward"
          size={20}
          color={theme.colors['primary-foreground']}
        />
      </View>
    </Pressable>
  );
}
