import { useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  Accordion,
  AppText,
  Badge,
  Button,
  Screen,
  Spinner,
  useTheme,
} from '@tourism/mobile-ui';
import {
  DepartureSheet,
  type DepartureSheetRef,
} from '../../../components/departure-sheet';
import {
  EnquirySheet,
  type EnquirySheetRef,
} from '../../../components/enquiry-sheet';
import { GalleryPager } from '../../../components/gallery-pager';
import { HeartButton } from '../../../components/heart-button';
import { TourBadges } from '../../../components/tour-badges';
import { useAuth } from '../../../lib/auth-context';
import { fetchTourDetail, fetchTourReviews } from '../../../lib/tour-detail';
import type { TourBadge } from '../../../lib/tours';

const t = messages.mobile.tourDetail;
const th = messages.mobile.home;
const tb = messages.mobile.booking;

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
      hitSlop={8}
      android_ripple={{ color: theme.colors['muted'], foreground: true }}
      style={({ pressed }) => ({
        position: 'absolute',
        top: insets.top + theme.spacing(2),
        left: theme.spacing(4),
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors['background'],
        opacity: process.env.EXPO_OS === 'ios' && pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="title">‹</AppText>
    </Pressable>
  );
}

export default function TourDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const departureSheetRef = useRef<DepartureSheetRef>(null);
  const enquirySheetRef = useRef<EnquirySheetRef>(null);

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
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Spinner />
        </View>
      </Screen>
    );
  }
  if (detailQ.isError) {
    return (
      <Screen scroll={false}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(3),
          }}
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
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing(3),
          }}
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
  const dollar = tour.currency === 'USD' ? '$' : '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors['background'] }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <GalleryPager images={tour.gallery} title={tour.title} />
          <View
            style={{
              position: 'absolute',
              top: insets.top + theme.spacing(2),
              right: theme.spacing(4),
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(2),
            }}
          >
            <HeartButton tourId={tour.id} />
            <TourBadges badges={tour.badges as TourBadge[]} />
          </View>
        </View>
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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(1),
                }}
              >
                <Ionicons
                  name="star"
                  size={14}
                  color={theme.colors['rating']}
                />
                <AppText variant="caption">{tour.rating.toFixed(1)}</AppText>
                <AppText variant="caption" muted>
                  ({tour.reviewCount} {messages.featuredTours.reviewsLabel})
                </AppText>
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing(3),
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(1),
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={theme.colors['muted-foreground']}
                />
                <AppText variant="caption" muted>
                  {th.durationDays(tour.durationDays)}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(1),
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={13}
                  color={theme.colors['muted-foreground']}
                />
                <AppText variant="caption" muted>
                  {t.maxGroup(tour.maxGroupSize)}
                </AppText>
              </View>
              {tour.difficulty ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing(1),
                  }}
                >
                  <Ionicons
                    name="walk-outline"
                    size={13}
                    color={theme.colors['muted-foreground']}
                  />
                  <AppText variant="caption" muted>
                    {tour.difficulty}
                  </AppText>
                </View>
              ) : null}
            </View>
            {tour.nextDepartureDate ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing(2),
                  flexWrap: 'wrap',
                }}
              >
                <AppText
                  variant="body"
                  style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
                >
                  {t.nextDeparture(tour.nextDepartureDate)}
                </AppText>
                {tour.nextDepartureSeatsLeft != null ? (
                  tour.nextDepartureSeatsLeft <= 5 ? (
                    <Badge
                      tone="warning"
                      label={t.seatsLeft(tour.nextDepartureSeatsLeft)}
                    />
                  ) : (
                    <AppText variant="caption" muted>
                      {t.seatsLeft(tour.nextDepartureSeatsLeft)}
                    </AppText>
                  )
                ) : null}
              </View>
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
                {tour.itinerary.slice(0, 3).map((day) => (
                  <Accordion
                    key={day.day}
                    title={`${t.dayLabel(day.day)}: ${day.title}`}
                  >
                    <AppText variant="body">{day.body}</AppText>
                  </Accordion>
                ))}
                {tour.itinerary.length > 3 ? (
                  <Button
                    variant="outline"
                    label={t.showAllDays(tour.itinerary.length)}
                    onPress={() => router.push(`/tours/${slug}/itinerary`)}
                  />
                ) : null}
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
                {reviewsQ.data.slice(0, 3).map((review) => (
                  <View key={review.id} style={{ gap: theme.spacing(1) }}>
                    <AppText variant="caption" muted>
                      {'★'.repeat(review.rating)} · {review.author}
                      {review.date ? ` · ${review.date}` : ''}
                    </AppText>
                    <AppText variant="body">{review.quote}</AppText>
                  </View>
                ))}
                {tour.reviewCount > 3 ? (
                  <Button
                    variant="outline"
                    label={t.seeAllReviews(tour.reviewCount)}
                    onPress={() => router.push(`/tours/${slug}/reviews`)}
                  />
                ) : null}
              </View>
            </Section>
          ) : null}

          {tour.faqs.length > 0 ? (
            <Section title={t.faqsTitle}>
              <View style={{ gap: theme.spacing(2) }}>
                {tour.faqs.slice(0, 3).map((faq) => (
                  <Accordion key={faq.question} title={faq.question}>
                    <AppText variant="body">{faq.answer}</AppText>
                  </Accordion>
                ))}
                {tour.faqs.length > 3 ? (
                  <Button
                    variant="outline"
                    label={t.showAllFaqs(tour.faqs.length)}
                    onPress={() => router.push(`/tours/${slug}/faqs`)}
                  />
                ) : null}
              </View>
            </Section>
          ) : null}

          {tour.policies.length > 0 ? (
            <Section title={t.policiesTitle}>
              <View style={{ gap: theme.spacing(3) }}>
                {tour.policies.map((policy) => (
                  <View key={policy.title} style={{ gap: theme.spacing(1) }}>
                    <AppText
                      variant="body"
                      style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
                    >
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
        <View style={{ flexShrink: 1 }}>
          <AppText variant="caption" muted>
            {t.from}
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: theme.spacing(2),
            }}
          >
            <AppText
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                fontSize: 18,
                lineHeight: 24,
                color: theme.colors['foreground'],
              }}
            >
              {dollar}
              {tour.basePrice}
            </AppText>
            {tour.compareAtPrice ? (
              <AppText
                variant="caption"
                muted
                style={{ textDecorationLine: 'line-through' }}
              >
                {dollar}
                {tour.compareAtPrice}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
          <Button
            variant="outline"
            label={t.inquireNow}
            onPress={() => enquirySheetRef.current?.open()}
          />
          <Button
            label={tb.bookCta}
            onPress={() =>
              // Only a *known* guest goes to sign-in; while the session is still
              // restoring ('loading') open the sheet — the contact step re-checks.
              status === 'signedOut'
                ? router.push('/auth/sign-in?reason=booking')
                : departureSheetRef.current?.open()
            }
          />
        </View>
      </View>

      <DepartureSheet
        ref={departureSheetRef}
        slug={slug}
        basePrice={tour.basePrice}
        currency={tour.currency}
      />
      <EnquirySheet
        ref={enquirySheetRef}
        tourId={tour.id}
        tourTitle={tour.title}
      />
    </View>
  );
}
