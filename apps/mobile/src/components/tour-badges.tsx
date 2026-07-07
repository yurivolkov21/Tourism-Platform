import { View } from 'react-native';
import { messages } from '@tourism/i18n';
import { Badge, useTheme, type BadgeTone } from '@tourism/mobile-ui';
import type { TourBadge } from '../lib/tours';

/** Web parity tone map (apps/web tour-card badgeClass). */
const TONE: Record<TourBadge, BadgeTone> = {
  BEST_VALUE: 'success',
  LIMITED_OFFER: 'warning',
  EXCLUSIVE: 'primary',
  NEW: 'info',
  POPULAR: 'rating',
};

export function TourBadges({ badges }: { badges: TourBadge[] }) {
  const theme = useTheme();
  if (badges.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) }}>
      {badges.map((badge) => (
        <Badge key={badge} label={messages.featuredTours.badges[badge]} tone={TONE[badge]} />
      ))}
    </View>
  );
}
