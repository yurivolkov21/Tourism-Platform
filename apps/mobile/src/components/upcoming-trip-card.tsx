import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, Badge, useTheme } from '@tourism/mobile-ui';
import type { BookingVm } from '../lib/booking';

const t = messages.booking.list;

export function UpcomingTripCard({
  booking,
  onPress,
}: {
  booking: BookingVm;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={`upcoming-${booking.code}`}
      accessibilityRole="button"
      accessibilityLabel={booking.tourTitle}
      onPress={onPress}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        padding: theme.spacing(3),
        backgroundColor: theme.colors['card'],
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        <Ionicons name="airplane-outline" size={24} color={theme.colors['primary']} />
      </View>
      <View style={{ flex: 1, gap: theme.spacing(1) }}>
        <AppText numberOfLines={1} style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
          {booking.tourTitle}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {t.departureLabel}: {booking.departureLabel}
        </AppText>
        <View style={{ flexDirection: 'row' }}>
          <Badge tone={booking.statusMeta.tone} label={booking.statusMeta.label} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors['muted-foreground']} />
    </Pressable>
  );
}
