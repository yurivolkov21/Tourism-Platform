import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { fetchTourReviews } from '../../../lib/tour-detail';

const t = messages.mobile.tourDetail;

/** All reviews (the detail screen teases the first few + See all). */
export default function ReviewsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const reviewsQ = useQuery({
    queryKey: ['tours', 'reviews', slug, 'all'],
    queryFn: () => fetchTourReviews(slug, 50),
    enabled: !!slug,
  });

  return (
    <Screen scroll={false}>
      {reviewsQ.isPending ? (
        <View style={{ gap: theme.spacing(3), paddingVertical: theme.spacing(4) }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} borderRadius={theme.radius.md} />
          ))}
        </View>
      ) : reviewsQ.isError ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.error}
          </AppText>
          <Button label={t.retry} onPress={() => reviewsQ.refetch()} />
        </View>
      ) : (
        <FlatList
          data={reviewsQ.data ?? []}
          keyExtractor={(review) => review.id}
          contentContainerStyle={{ paddingVertical: theme.spacing(4), gap: theme.spacing(4) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ gap: theme.spacing(1) }}>
              <AppText variant="caption" muted>
                {'★'.repeat(item.rating)} · {item.author}
                {item.date ? ` · ${item.date}` : ''}
              </AppText>
              <AppText variant="body">{item.quote}</AppText>
            </View>
          )}
        />
      )}
    </Screen>
  );
}
