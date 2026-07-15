import { Pressable, View } from 'react-native';
import { messages } from '@tourism/i18n';
import { AppText, ScrimImage, useTheme } from '@tourism/mobile-ui';
import type { DestinationChipVm } from '../lib/destinations';

/** Vertical image tile for the Home destinations rail (P5.6: name sits on the
 * ScrimImage gradient instead of a flat overlay band). */
export function DestinationCard({
  destination,
  onPress,
}: {
  destination: DestinationChipVm;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={destination.name}
      testID={`destination-${destination.slug}`}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 140 }}>
        <ScrimImage
          uri={destination.image}
          alt={destination.name}
          aspectRatio={140 / 180}
        >
          <View style={{ gap: 2 }}>
            <AppText
              variant="body"
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                color: theme.colors['on-media'],
              }}
            >
              {destination.name}
            </AppText>
            {destination.toursCount > 0 ? (
              <AppText
                variant="caption"
                style={{ color: theme.colors['on-media'], opacity: 0.85 }}
              >
                {destination.toursCount} {messages.destinations.toursLabel}
              </AppText>
            ) : null}
          </View>
        </ScrimImage>
      </View>
    </Pressable>
  );
}
