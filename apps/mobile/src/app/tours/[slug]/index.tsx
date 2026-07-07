import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import { Accordion, AppText, Button, Screen, Spinner, useTheme } from '@tourism/mobile-ui';
import { GalleryPager } from '../../../components/gallery-pager';
import { fetchTourDetail, fetchTourReviews } from '../../../lib/tour-detail';

const t = messages.mobile.tourDetail;
const th = messages.mobile.home;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(2) }}>
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}

function Bullets({ items, mark }: { items: string[]; mark: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing(1) }}>
      {items.map((item) => (
        <AppText key={item} variant="body">
          {mark} {item}
        </AppText>
      ))}
    </View>
  );
}

/** Circular themed back button overlaid on the gallery (global header is hidden). */
function BackOverlay() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.goBack}
      onPress={() => router.back()}
      style={{
        position: 'absolute',
        top: insets.top + theme.spacing(2),
        left: theme.spacing(4),
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['background'],
      }}
    >
      <AppText variant="title">‹</AppText>
    </Pressable>
  );
}

export default function TourDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const detailQ = useQuery({
    queryKey: ['tours', 'detail', slug],
    queryFn: () => fetchTourDetail(slug),
    enabled: !!slug,
  });
  const reviewsQ = useQuery({
    queryKey: ['tours', 'reviews', slug],
    queryFn: () => fetchTourReviews(slug),
    enabled: !!slug,
  });

  if (detailQ.isPending) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (detailQ.isError) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.error}
          </AppText>
          <Button label={t.retry} onPress={() => detailQ.refetch()} />
        </View>
      </Screen>
    );
  }
  if (!detailQ.data) {
    return (
      <Screen scroll={false}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(3) }}
        >
          <AppText variant="body" style={{ textAlign: 'center' }}>
            {t.notFound}
          </AppText>
          <Button label={t.goBack} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const tour = detailQ.data;
  const facts = [
    th.durationDays(tour.durationDays),
    t.maxGroup(tour.maxGroupSize),
    ...(tour.difficulty ? [tour.difficulty] : []),
  ].join(' · ');
  const dollar = tour.currency === 'USD' ? '$' : '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors['background'] }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
        showsVerticalScrollIndicator={false}
      >
        <GalleryPager images={tour.gallery} title={tour.title} />
        <View
          style={{
            paddingHorizontal: theme.spacing(4),
            paddingTop: theme.spacing(4),
            gap: theme.spacing(5),
          }}
        >
          <View style={{ gap: theme.spacing(1) }}>
            <AppText variant="caption" muted>
              {tour.destination}
            </AppText>
            <AppText variant="display">{tour.title}</AppText>
            {tour.reviewCount > 0 ? (
              <AppText variant="caption" muted>
                {t.reviewsLine(tour.rating, tour.reviewCount)}
              </AppText>
            ) : null}
            <AppText variant="caption" muted>
              {facts}
            </AppText>
            {tour.nextDepartureDate ? (
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {t.nextDeparture(tour.nextDepartureDate)}
                {tour.nextDepartureSeatsLeft != null
                  ? ` · ${t.seatsLeft(tour.nextDepartureSeatsLeft)}`
                  : ''}
              </AppText>
            ) : null}
          </View>

          {tour.overview !== '' ? (
            <Section title={t.overviewTitle}>
              <AppText variant="body">{tour.overview}</AppText>
            </Section>
          ) : null}

          {tour.highlights.length > 0 ? (
            <Section title={t.highlightsTitle}>
              <Bullets items={tour.highlights} mark="•" />
            </Section>
          ) : null}

          {tour.itinerary.length > 0 ? (
            <Section title={t.itineraryTitle}>
              <View style={{ gap: theme.spacing(2) }}>
                {tour.itinerary.map((day) => (
                  <Accordion key={day.day} title={`${t.dayLabel(day.day)}: ${day.title}`}>
                    <AppText variant="body">{day.body}</AppText>
                  </Accordion>
                ))}
              </View>
            </Section>
          ) : null}

          {tour.included.length > 0 ? (
            <Section title={t.includedTitle}>
              <Bullets items={tour.included} mark="✓" />
            </Section>
          ) : null}

          {tour.excluded.length > 0 ? (
            <Section title={t.excludedTitle}>
              <Bullets items={tour.excluded} mark="✕" />
            </Section>
          ) : null}

          {reviewsQ.data && reviewsQ.data.length > 0 ? (
            <Section title={t.reviewsTitle}>
              <View style={{ gap: theme.spacing(3) }}>
                {reviewsQ.data.map((review) => (
                  <View key={review.id} style={{ gap: theme.spacing(1) }}>
                    <AppText variant="caption" muted>
                      {'★'.repeat(review.rating)} · {review.author}
                      {review.date ? ` · ${review.date}` : ''}
                    </AppText>
                    <AppText variant="body">{review.quote}</AppText>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {tour.faqs.length > 0 ? (
            <Section title={t.faqsTitle}>
              <View style={{ gap: theme.spacing(2) }}>
                {tour.faqs.map((faq) => (
                  <Accordion key={faq.question} title={faq.question}>
                    <AppText variant="body">{faq.answer}</AppText>
                  </Accordion>
                ))}
              </View>
            </Section>
          ) : null}

          {tour.policies.length > 0 ? (
            <Section title={t.policiesTitle}>
              <View style={{ gap: theme.spacing(3) }}>
                {tour.policies.map((policy) => (
                  <View key={policy.title} style={{ gap: theme.spacing(1) }}>
                    <AppText variant="body" style={{ fontWeight: '600' }}>
                      {policy.title}
                    </AppText>
                    <AppText variant="body" muted>
                      {policy.body}
                    </AppText>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}
        </View>
      </ScrollView>

      <BackOverlay />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing(3),
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(3),
          paddingBottom: insets.bottom + theme.spacing(3),
          borderTopWidth: 1,
          borderTopColor: theme.colors['border'],
          backgroundColor: theme.colors['background'],
        }}
      >
        <View>
          <AppText variant="caption" muted>
            {t.from}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(2) }}>
            <AppText variant="title">
              {dollar}
              {tour.basePrice}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText variant="caption" muted style={{ textDecorationLine: 'line-through' }}>
                {dollar}
                {tour.compareAtPrice}
              </AppText>
            ) : null}
          </View>
        </View>
        <Button label={t.inquireNow} onPress={() => router.push(`/tours/${slug}/enquiry`)} />
      </View>
    </View>
  );
}
