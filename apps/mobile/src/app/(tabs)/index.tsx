import type { ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Screen,
  Skeleton,
  useTheme,
} from '@tourism/mobile-ui';
import { DestinationCard } from '../../components/destination-card';
import { HeartButton } from '../../components/heart-button';
import { SavedMiniCard } from '../../components/saved-mini-card';
import { SectionHeading } from '../../components/section-heading';
import { TourCard } from '../../components/tour-card';
import { UpcomingTripCard } from '../../components/upcoming-trip-card';
import { useAuth } from '../../lib/auth-context';
import { fetchMyBookings } from '../../lib/booking';
import { fetchDestinations } from '../../lib/destinations';
import { firstName, selectUpcomingTrip, timeGreetingKey } from '../../lib/home';
import { fetchProfile } from '../../lib/profile';
import { fetchFeaturedTours } from '../../lib/tours';
import { fetchSavedTours } from '../../lib/wishlist';

const t = messages.mobile.home;

/** Today as a YYYY-MM-DD UTC date, to rank upcoming trips against departures. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.spacing(4) }}>{children}</View>
  );
}

function Greeting() {
  const theme = useTheme();
  const { status } = useAuth();
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });
  const greeting = t.greetings[timeGreetingKey(new Date().getHours())];
  const name = profileQ.data ? firstName(profileQ.data.fullName) : '';
  return (
    <View style={{ gap: theme.spacing(1) }}>
      <AppText variant="display" style={{ fontSize: 26, lineHeight: 32 }}>
        {name ? t.greetingWithName(greeting, name) : greeting}
      </AppText>
      <AppText variant="body" muted>
        {t.tagline}
      </AppText>
    </View>
  );
}

function SearchPill() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.searchPlaceholder}
      onPress={() => router.push('/explore?focusSearch=1')}
      android_ripple={{ color: theme.colors['muted'] }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(2),
        backgroundColor: theme.colors['card'],
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: 999,
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(1),
        paddingVertical: theme.spacing(1),
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.9 : 1,
      })}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={theme.colors['muted-foreground']}
      />
      <AppText variant="body" muted style={{ flex: 1 }}>
        {t.searchPlaceholder}
      </AppText>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['primary'],
        }}
      >
        <Ionicons
          name="search"
          size={18}
          color={theme.colors['primary-foreground']}
        />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  const toursQ = useQuery({
    queryKey: ['tours', 'featured'],
    queryFn: fetchFeaturedTours,
  });
  const destQ = useQuery({
    queryKey: ['destinations'],
    queryFn: fetchDestinations,
  });
  const bookingsQ = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: fetchMyBookings,
    enabled: signedIn,
  });
  const savedQ = useQuery({
    queryKey: ['wishlist', 'list'],
    queryFn: fetchSavedTours,
    enabled: signedIn,
  });

  const upcoming = bookingsQ.data
    ? selectUpcomingTrip(bookingsQ.data, todayIso())
    : null;
  const saved = savedQ.data ?? [];

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing(3),
          paddingBottom: theme.spacing(8),
          gap: theme.spacing(6),
        }}
        refreshControl={
          <RefreshControl
            refreshing={toursQ.isRefetching}
            onRefresh={() => {
              toursQ.refetch();
              destQ.refetch();
              if (signedIn) {
                bookingsQ.refetch();
                savedQ.refetch();
              }
            }}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
      >
        <Section>
          <View style={{ gap: theme.spacing(4) }}>
            <Greeting />
            <SearchPill />
          </View>
        </Section>

        {signedIn && upcoming ? (
          <Section>
            <SectionHeading title={t.upcomingTitle} />
            <Animated.View entering={FadeIn.duration(200)}>
              <UpcomingTripCard
                booking={upcoming}
                onPress={() => router.push(`/bookings/${upcoming.code}`)}
              />
            </Animated.View>
          </Section>
        ) : null}

        {signedIn && saved.length > 0 ? (
          <Section>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing(3),
              }}
            >
              <AppText variant="title">{t.savedTitle}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.seeAll}
                onPress={() => router.push('/saved')}
                hitSlop={8}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: theme.colors['primary'],
                    fontFamily: theme.fontFamilies.sansSemiBold,
                  }}
                >
                  {t.seeAll}
                </AppText>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={saved.slice(0, 6)}
              keyExtractor={(item) => item.tourId}
              renderItem={({ item }) => (
                <SavedMiniCard
                  tour={item}
                  onPress={() => router.push(`/tours/${item.slug}`)}
                />
              )}
              ItemSeparatorComponent={() => (
                <View style={{ width: theme.spacing(3) }} />
              )}
              showsHorizontalScrollIndicator={false}
            />
          </Section>
        ) : null}

        <Section>
          <SectionHeading title={t.featuredTitle} />
          {toursQ.isPending ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
              {[0, 1].map((i) => (
                <Skeleton
                  key={i}
                  width={260}
                  height={300}
                  borderRadius={theme.radius.lg}
                />
              ))}
            </View>
          ) : toursQ.isError ? (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing(3),
                paddingVertical: theme.spacing(4),
              }}
            >
              <AppText variant="body" style={{ textAlign: 'center' }}>
                {t.error}
              </AppText>
              <Button label={t.retry} onPress={() => toursQ.refetch()} />
            </View>
          ) : toursQ.data && toursQ.data.length > 0 ? (
            <FlatList
              horizontal
              data={toursQ.data}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => (
                <Animated.View entering={FadeIn.duration(200)}>
                  <TourCard
                    tour={item}
                    heartSlot={<HeartButton tourId={item.id} />}
                    onPress={() => router.push(`/tours/${item.slug}`)}
                  />
                </Animated.View>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ width: theme.spacing(3) }} />
              )}
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <AppText variant="body" muted style={{ textAlign: 'center' }}>
              {t.empty}
            </AppText>
          )}
        </Section>

        {destQ.data && destQ.data.length > 0 ? (
          <Section>
            <SectionHeading title={t.destinationsTitle} />
            <FlatList
              horizontal
              data={destQ.data}
              keyExtractor={(d) => d.slug}
              renderItem={({ item }) => (
                <DestinationCard
                  destination={item}
                  onPress={() =>
                    router.push({
                      pathname: '/explore',
                      params: { destination: item.name },
                    })
                  }
                />
              )}
              ItemSeparatorComponent={() => (
                <View style={{ width: theme.spacing(3) }} />
              )}
              showsHorizontalScrollIndicator={false}
            />
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
