import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Button, Card, Screen, Spinner, useTheme } from '@tourism/mobile-ui';
import { TourCard } from '../../components/tour-card';
import { fetchFeaturedTours } from '../../lib/tours';

const brand = messages.brand;
const t = messages.mobile.home;

/** After ~3s of loading, explain the Render cold start so it doesn't read as broken. */
function SlowServerHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <AppText variant="caption" muted style={{ textAlign: 'center' }}>
      {t.slowServer}
    </AppText>
  );
}

function SkeletonShelf() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          style={{ width: 240, height: 220, backgroundColor: theme.colors['muted'] }}
        />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['tours', 'featured'],
    queryFn: fetchFeaturedTours,
  });

  return (
    <Screen
      scrollProps={{
        refreshControl: (
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        ),
      }}
    >
      <View style={{ gap: theme.spacing(2), paddingVertical: theme.spacing(4) }}>
        <AppText variant="display">{brand.name}</AppText>
        <AppText variant="title">{t.greeting}</AppText>
        <AppText variant="body" muted>
          {t.subtitle}
        </AppText>
      </View>

      <AppText variant="title" style={{ marginBottom: theme.spacing(3) }}>
        {t.featuredTitle}
      </AppText>

      {isPending ? (
        <View style={{ gap: theme.spacing(3) }}>
          <SkeletonShelf />
          <View style={{ alignItems: 'center', gap: theme.spacing(2) }}>
            <Spinner />
            <SlowServerHint />
          </View>
        </View>
      ) : isError ? (
        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing(3),
            paddingVertical: theme.spacing(6),
          }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.error}
          </AppText>
          <Button label={t.retry} onPress={() => refetch()} />
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => <TourCard tour={item} />}
          ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
          showsHorizontalScrollIndicator={false}
        />
      ) : (
        <AppText
          variant="body"
          muted
          style={{ textAlign: 'center', paddingVertical: theme.spacing(6) }}
        >
          {t.empty}
        </AppText>
      )}
    </Screen>
  );
}
