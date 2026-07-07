import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { useTheme } from '@tourism/mobile-ui';
import { useWishlist } from '../lib/wishlist';

const t = messages.mobile.saved;

/** Circular wishlist heart. Guests are routed to sign-in with the wishlist reason. */
export function HeartButton({ tourId, size = 32 }: { tourId: string; size?: number }) {
  const theme = useTheme();
  const { isGuest, isSaved, toggle } = useWishlist();
  const saved = !isGuest && isSaved(tourId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? t.heartUnsaveLabel : t.heartSaveLabel}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => {
        if (isGuest) {
          router.push('/auth/sign-in?reason=wishlist');
        } else {
          toggle(tourId);
        }
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['background'],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={Math.round(size * 0.55)}
        color={saved ? theme.colors['destructive'] : theme.colors['foreground']}
      />
    </Pressable>
  );
}
