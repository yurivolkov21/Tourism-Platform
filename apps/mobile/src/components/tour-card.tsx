import { View } from 'react-native';
import { Image } from 'expo-image';
import { messages } from '@tourism/i18n';
import { AppText, Card, useTheme } from '@tourism/mobile-ui';
import type { TourCardVm } from '../lib/tours';

const t = messages.mobile.home;

export function TourCard({ tour }: { tour: TourCardVm }) {
  const theme = useTheme();
  return (
    <Card style={{ width: 240 }}>
      <Image
        source={tour.image ? { uri: tour.image } : undefined}
        style={{ width: '100%', height: 130, backgroundColor: theme.colors['muted'] }}
        contentFit="cover"
        accessibilityLabel={tour.title}
      />
      <View style={{ padding: theme.spacing(3), gap: theme.spacing(1) }}>
        <AppText variant="caption" muted>
          {tour.destination} · {t.durationDays(tour.durationDays)}
        </AppText>
        <AppText variant="title" numberOfLines={2}>
          {tour.title}
        </AppText>
        <AppText variant="body">
          {t.from} {tour.currency === 'USD' ? '$' : ''}
          {tour.price}
        </AppText>
      </View>
    </Card>
  );
}
