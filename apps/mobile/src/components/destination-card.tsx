import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';
import type { DestinationChipVm } from '../lib/destinations';

/** Vertical image tile for the Home destinations rail (name over a scrim band). */
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
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 140,
          height: 180,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
          backgroundColor: theme.colors['muted'],
        }}
      >
        <Image
          source={destination.image ? { uri: destination.image } : undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          accessibilityLabel={destination.name}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.colors['overlay'],
            padding: theme.spacing(2),
            gap: 2,
          }}
        >
          <AppText
            variant="body"
            style={{ fontFamily: theme.fontFamilies.sansSemiBold, color: theme.colors['on-media'] }}
          >
            {destination.name}
          </AppText>
          {destination.toursCount > 0 ? (
            <AppText variant="caption" style={{ color: theme.colors['on-media'], opacity: 0.85 }}>
              {destination.toursCount} {messages.destinations.toursLabel}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
