import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { REGION_ORDER, groupByRegion } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Screen,
  Skeleton,
  useTheme,
} from '@tourism/mobile-ui';
import { DestinationHeroCard } from '../../components/destination-hero-card';
import { RegionTabs } from '../../components/region-tabs';
import { UpcomingTripCard } from '../../components/upcoming-trip-card';
import { useAuth } from '../../lib/auth-context';
import { fetchMyBookings } from '../../lib/booking';
import { fetchDestinations } from '../../lib/destinations';
import { firstName, selectUpcomingTrip } from '../../lib/home';
import { fetchProfile } from '../../lib/profile';

const t = messages.mobile.home;

/** Today as a YYYY-MM-DD UTC date, to rank upcoming trips against departures. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * P5.7 S4 — Screen-17 header: avatar tile + "Welcome {name}" on the left,
 * a round search button on the right (pushes Explore with the keyboard up).
 */
function HomeHeader() {
  const theme = useTheme();
  const { status } = useAuth();
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: status === 'signedIn',
  });
  const name = profileQ.data ? firstName(profileQ.data.fullName) : '';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(3),
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.lg,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
        }}
      >
        {profileQ.data?.initial ? (
          <AppText variant="title" style={{ color: theme.colors['primary'] }}>
            {profileQ.data.initial}
          </AppText>
        ) : (
          <Ionicons
            name="person-outline"
            size={20}
            color={theme.colors['primary']}
          />
        )}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="caption" muted>
          {t.welcome}
        </AppText>
        <AppText
          variant="title"
          numberOfLines={1}
          style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {name || messages.brand.name}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.searchButton}
        testID="home-search"
        onPress={() => router.push('/explore?focusSearch=1')}
        android_ripple={{ color: theme.colors['muted'], borderless: true }}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors['secondary'],
          opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="search" size={20} color={theme.colors['primary']} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const [region, setRegion] = useState<string>(REGION_ORDER[0]);

  const destQ = useQuery({
    queryKey: ['destinations'],
    queryFn: fetchDestinations,
  });
  const bookingsQ = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: fetchMyBookings,
    enabled: signedIn,
  });

  const groups = useMemo(() => groupByRegion(destQ.data ?? []), [destQ.data]);
  const current = groups.find((g) => g.region === region)?.items ?? [];
  const upcoming = bookingsQ.data
    ? selectUpcomingTrip(bookingsQ.data, todayIso())
    : null;

  const cardWidth = Math.round(width * 0.68);

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing(3),
          paddingBottom: theme.spacing(8),
          gap: theme.spacing(5),
        }}
        refreshControl={
          <RefreshControl
            refreshing={destQ.isRefetching}
            onRefresh={() => {
              destQ.refetch();
              if (signedIn) bookingsQ.refetch();
            }}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
      >
        <View style={{ paddingHorizontal: theme.spacing(4) }}>
          <HomeHeader />
        </View>

        {/* Brass statement headline + hairline (Navel Screen-17). */}
        <View
          style={{ paddingHorizontal: theme.spacing(4), gap: theme.spacing(3) }}
        >
          <AppText
            variant="display"
            style={{
              fontSize: 30,
              lineHeight: 36,
              color: theme.colors['primary'],
            }}
          >
            {t.browseHeadline}
          </AppText>
          <View
            style={{ height: 1, backgroundColor: theme.colors['border'] }}
          />
        </View>

        {signedIn && upcoming ? (
          <View style={{ paddingHorizontal: theme.spacing(4) }}>
            <Animated.View entering={FadeIn.duration(200)}>
              <UpcomingTripCard
                booking={upcoming}
                onPress={() => router.push(`/bookings/${upcoming.code}`)}
              />
            </Animated.View>
          </View>
        ) : null}

        {/* Region browser: rotated tabs + giant destination cards. */}
        {destQ.isPending ? (
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing(3),
              paddingLeft: theme.spacing(4),
            }}
          >
            <Skeleton width={44} height={280} borderRadius={theme.radius.md} />
            <Skeleton
              width={cardWidth}
              height={Math.round(cardWidth / 0.62)}
              borderRadius={theme.radius.xl}
            />
          </View>
        ) : destQ.isError ? (
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
            <Button label={t.retry} onPress={() => destQ.refetch()} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row' }}>
            <RegionTabs
              regions={REGION_ORDER}
              active={region}
              onChange={setRegion}
            />
            {current.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: theme.spacing(10),
                  paddingHorizontal: theme.spacing(4),
                }}
              >
                <AppText variant="body" muted style={{ textAlign: 'center' }}>
                  {t.regionEmpty}
                </AppText>
              </View>
            ) : (
              <FlatList
                horizontal
                data={current}
                keyExtractor={(d) => d.slug}
                renderItem={({ item }) => (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <DestinationHeroCard
                      destination={item}
                      onPress={() =>
                        router.push({
                          pathname: '/explore',
                          params: { destination: item.name },
                        })
                      }
                    />
                  </Animated.View>
                )}
                ItemSeparatorComponent={() => (
                  <View style={{ width: theme.spacing(3) }} />
                )}
                snapToInterval={cardWidth + theme.spacing(3)}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: theme.spacing(4) }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
