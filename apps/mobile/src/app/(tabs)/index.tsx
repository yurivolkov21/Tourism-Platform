import type { ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { AppText, Badge, Button, Screen, Skeleton, useTheme } from '@tourism/mobile-ui';
import { DestinationCard } from '../../components/destination-card';
import { SectionHeading } from '../../components/section-heading';
import { TourCard } from '../../components/tour-card';
import { fetchDestinations } from '../../lib/destinations';
import { fetchFeaturedTours } from '../../lib/tours';

const t = messages.mobile.home;
const hero = messages.hero;
const featured = messages.featuredTours;
const dest = messages.destinations;
const features = messages.features;

// Same curated Vietnam hero as the web home (shared brand chrome).
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1634951412593-b2cdca1ae519?w=1200&q=70&auto=format&fit=crop';

const WHY_ICONS = ['map-outline', 'shield-checkmark-outline', 'people-outline'] as const;

/** Full-bleed hero — centred copy over a scrim, like the web hero in a phone viewport. */
function Hero() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: 440 }}>
      <Image
        source={{ uri: HERO_IMAGE }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={hero.imageAlt}
      />
      {/* overlay token carries its own alpha (#…80) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors['overlay'] }]} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing(5),
          paddingTop: insets.top + theme.spacing(5),
          gap: theme.spacing(3),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) }}>
          <Badge label={hero.eyebrowBadge} />
          <AppText variant="caption" style={{ color: theme.colors['on-media'], opacity: 0.9 }}>
            {hero.eyebrowText}
          </AppText>
        </View>
        <AppText
          variant="display"
          style={{
            color: theme.colors['on-media'],
            fontSize: 30,
            lineHeight: 38,
            textAlign: 'center',
          }}
        >
          {hero.titleLead} {hero.titleAccent} {hero.titleTail}
        </AppText>
        <AppText
          variant="body"
          style={{ color: theme.colors['on-media'], opacity: 0.85, textAlign: 'center' }}
        >
          {hero.subtitle}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hero.searchPlaceholder}
          onPress={() => router.push('/explore?focusSearch=1')}
          style={({ pressed }) => ({
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing(2),
            backgroundColor: theme.colors['background'],
            borderRadius: 999,
            paddingLeft: theme.spacing(4),
            paddingRight: theme.spacing(1),
            paddingVertical: theme.spacing(1),
            marginTop: theme.spacing(2),
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="search-outline" size={16} color={theme.colors['muted-foreground']} />
          <AppText variant="body" muted style={{ flex: 1 }}>
            {hero.searchPlaceholder}
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
            <Ionicons name="search" size={18} color={theme.colors['primary-foreground']} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: theme.spacing(4) }}>{children}</View>;
}

export default function HomeScreen() {
  const theme = useTheme();
  const toursQ = useQuery({ queryKey: ['tours', 'featured'], queryFn: fetchFeaturedTours });
  const destQ = useQuery({ queryKey: ['destinations'], queryFn: fetchDestinations });

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0, paddingTop: 0 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing(8), gap: theme.spacing(6) }}
        refreshControl={
          <RefreshControl
            refreshing={toursQ.isRefetching}
            onRefresh={() => {
              toursQ.refetch();
              destQ.refetch();
            }}
            colors={[theme.colors['primary']]}
            tintColor={theme.colors['primary']}
            progressBackgroundColor={theme.colors['card']}
          />
        }
      >
        <Hero />

        <Section>
          <SectionHeading
            eyebrow={hero.eyebrowBadge}
            title={featured.heading}
            subtitle={featured.subtitle}
          />
          {toursQ.isPending ? (
            <View style={{ flexDirection: 'row', gap: theme.spacing(3) }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} width={260} height={300} borderRadius={theme.radius.lg} />
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
                <TourCard tour={item} onPress={() => router.push(`/tours/${item.slug}`)} />
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
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
            <SectionHeading title={dest.heading} subtitle={dest.subtitle} />
            <FlatList
              horizontal
              data={destQ.data}
              keyExtractor={(d) => d.slug}
              renderItem={({ item }) => (
                <DestinationCard
                  destination={item}
                  onPress={() =>
                    router.push({ pathname: '/explore', params: { destination: item.name } })
                  }
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: theme.spacing(3) }} />}
              showsHorizontalScrollIndicator={false}
            />
          </Section>
        ) : null}

        <Section>
          <SectionHeading title={features.heading} subtitle={features.subtitle} />
          <View style={{ gap: theme.spacing(4) }}>
            {features.items.slice(0, 3).map((item, i) => (
              <View
                key={item.title}
                style={{ flexDirection: 'row', gap: theme.spacing(3), alignItems: 'flex-start' }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors['secondary'],
                  }}
                >
                  <Ionicons name={WHY_ICONS[i]} size={20} color={theme.colors['primary']} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="body" style={{ fontFamily: theme.fontFamilies.sansSemiBold }}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" muted>
                    {item.description}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section>
          <View
            style={{
              backgroundColor: theme.colors['primary'],
              borderRadius: theme.radius.xl,
              padding: theme.spacing(5),
              gap: theme.spacing(3),
            }}
          >
            <AppText variant="title" style={{ color: theme.colors['primary-foreground'] }}>
              {t.ctaTitle}
            </AppText>
            <AppText
              variant="body"
              style={{ color: theme.colors['primary-foreground'], opacity: 0.85 }}
            >
              {t.ctaSubtitle}
            </AppText>
            <Button
              variant="outline"
              label={t.ctaButton}
              onPress={() => router.push('/explore')}
              style={{ backgroundColor: theme.colors['background'], borderColor: 'transparent' }}
            />
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}
