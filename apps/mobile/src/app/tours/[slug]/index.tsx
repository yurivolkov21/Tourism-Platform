import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  Accordion,
  AppText,
  Badge,
  Button,
  Chip,
  Screen,
  Spinner,
  StickyCTABar,
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
import { ItineraryDayTimeline } from '../../../components/itinerary-timeline';
import { TourBadges } from '../../../components/tour-badges';
import { useAuth } from '../../../lib/auth-context';
import {
  buildAccommodation,
  fetchTourDetail,
  fetchTourReviews,
  parseMealsLine,
  parseTransportLine,
} from '../../../lib/tour-detail';
import type { TourBadge } from '../../../lib/tours';

const t = messages.mobile.tourDetail;
const th = messages.mobile.home;
const tb = messages.mobile.booking;
// Same catalog entry the web's TourValue reads — single source for the copy.
const tv = messages.tourDetail.value;

type TabId = 'overview' | 'itinerary' | 'details' | 'reviews';

// P5.8: the 8 content sections below are grouped into 4 tabs (user feedback
// — the plain vertical list read as too long to scan). Each tab swaps in its
// own panel; an earlier jump-scroll version (tap a tab, scroll the shared
// list to it) hit a persistent RN bug where stickyHeaderIndices combined
// with onScroll-driven state updates during an animated scrollTo left the
// other tabs unresponsive to taps — swapping panels sidesteps that class of
// bug entirely (no sticky header, no scroll-position tracking).
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: t.overviewTitle },
  { id: 'itinerary', label: t.itineraryTitle },
  { id: 'details', label: t.detailsTabLabel },
  { id: 'reviews', label: t.reviewsTabLabel },
];

/** Web TourSection parity: card panel with a primary accent-bar heading —
 * the shared language for every tour-detail block. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        gap: theme.spacing(3),
        borderWidth: 1,
        borderColor: theme.colors['border'],
        borderRadius: theme.radius.lg,
        borderCurve: 'continuous',
        backgroundColor: theme.colors['card'],
        padding: theme.spacing(4),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(2),
        }}
      >
        <View
          style={{
            width: 5,
            height: 22,
            borderRadius: 999,
            backgroundColor: theme.colors['primary'],
          }}
        />
        {/* P5.6: section titles carry the serif display voice. */}
        <AppText
          variant="title"
          style={{ fontFamily: theme.fontFamilies.headingBold, fontSize: 20 }}
        >
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

/** "What's included" — web TourIncluded parity: meals/transport/accommodation
 * spec rows, the included-activities checklist, then a compact exclusions
 * list inside the same panel. */
function InclusionsPanel({
  included,
  excluded,
  durationDays,
}: {
  included: string[];
  excluded: string[];
  durationDays: number;
}) {
  const theme = useTheme();
  const labels = messages.tourDetail.inclusionLabels;

  const specRows: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }[] = [
    {
      icon: 'restaurant-outline',
      label: labels.meals,
      value: parseMealsLine(included) ?? 'Meals as listed',
    },
    {
      icon: 'car-outline',
      label: labels.transport,
      value: parseTransportLine(included) ?? 'Private transfers',
    },
    {
      icon: 'bed-outline',
      label: labels.accommodation,
      value: buildAccommodation(durationDays),
    },
  ];

  const divider = {
    borderBottomWidth: 1,
    borderColor: theme.colors['border'],
  } as const;

  return (
    <Section title={t.includedTitle}>
      <View>
        {specRows.map((row) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              gap: theme.spacing(2),
              paddingVertical: theme.spacing(3),
              ...divider,
            }}
          >
            <Ionicons
              name={row.icon}
              size={18}
              color={theme.colors['primary']}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText
                variant="caption"
                muted
                style={{
                  fontFamily: theme.fontFamilies.sansSemiBold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontSize: 11,
                }}
              >
                {row.label}
              </AppText>
              <AppText
                variant="body"
                style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
              >
                {row.value}
              </AppText>
            </View>
          </View>
        ))}

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing(2),
            paddingVertical: theme.spacing(3),
          }}
        >
          <MaterialCommunityIcons
            name="bag-personal-outline"
            size={18}
            color={theme.colors['primary']}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: theme.spacing(2) }}>
            <AppText
              variant="caption"
              muted
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: 11,
              }}
            >
              {labels.activities}
            </AppText>
            {included.map((item) => (
              <View
                key={item}
                style={{ flexDirection: 'row', gap: theme.spacing(2) }}
              >
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={theme.colors['success']}
                  style={{ marginTop: 2 }}
                />
                <AppText variant="body" style={{ flex: 1 }}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {excluded.length > 0 ? (
          <View
            style={{
              borderTopWidth: 1,
              borderColor: theme.colors['border'],
              paddingTop: theme.spacing(3),
              gap: theme.spacing(2),
            }}
          >
            <AppText
              variant="body"
              style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
            >
              {messages.tourDetail.notIncluded}
            </AppText>
            {excluded.map((item) => (
              <View
                key={item}
                style={{ flexDirection: 'row', gap: theme.spacing(2) }}
              >
                <Ionicons
                  name="close"
                  size={15}
                  color={theme.colors['muted-foreground']}
                  style={{ marginTop: 2 }}
                />
                <AppText variant="body" muted style={{ flex: 1 }}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Section>
  );
}

/** "Value of the package" — value props led by a primary dot (web TourValue). */
function ValuePanel() {
  const theme = useTheme();
  return (
    <Section title={tv.heading}>
      <View style={{ gap: theme.spacing(4) }}>
        {tv.props.map((prop) => (
          <View
            key={prop.title}
            style={{ flexDirection: 'row', gap: theme.spacing(2) }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                marginTop: 7,
                backgroundColor: theme.colors['primary'],
              }}
            />
            <View style={{ flex: 1, gap: theme.spacing(1) }}>
              <AppText
                variant="body"
                style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
              >
                {prop.title}
              </AppText>
              <AppText variant="body" muted>
                {prop.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

/** Overview's icon-led spec grid (web TourOverview parity) — two columns of
 * primary icon + uppercase label + value. */
function SpecGrid({
  tour,
}: {
  tour: { destination: string; durationDays: number };
}) {
  const theme = useTheme();
  const s = messages.tourDetail.specs;
  const rows: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }[] = [
    { icon: 'location-outline', label: s.destination, value: tour.destination },
    {
      icon: 'time-outline',
      label: s.duration,
      value: messages.tourDetail.durationValue(tour.durationDays),
    },
    // Same computed placeholders as the web until real data lands from the API.
    { icon: 'calendar-outline', label: s.departure, value: 'Flexible dates' },
    {
      icon: 'bed-outline',
      label: s.accommodation,
      value: buildAccommodation(tour.durationDays),
    },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: theme.spacing(4),
      }}
    >
      {rows.map((row) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            gap: theme.spacing(2),
            width: '50%',
            paddingRight: theme.spacing(2),
          }}
        >
          <Ionicons
            name={row.icon}
            size={18}
            color={theme.colors['primary']}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText
              variant="caption"
              muted
              style={{
                fontFamily: theme.fontFamilies.sansSemiBold,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontSize: 11,
              }}
            >
              {row.label}
            </AppText>
            <AppText
              variant="body"
              style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
            >
              {row.value}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Tab row — plain in-flow (not sticky, not scrollable), a horizontal Chip
 * row reused from Explore's destination filter. Tapping swaps which panel
 * renders below (see `TABS` comment for why this replaced jump-scroll). */
function SectionTabBar({
  active,
  onPress,
}: {
  active: TabId;
  onPress: (id: TabId) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderColor: theme.colors['border'],
      }}
    >
      {/* Horizontal scroll, not flexWrap — keeps all 4 chips on one row.
          Safe to nest here now: the earlier touch-breaking bug was a
          ScrollView-in-sticky-header conflict, and this bar isn't sticky
          anymore (see the TABS comment above). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          gap: theme.spacing(2),
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(4),
          paddingBottom: theme.spacing(3),
        }}
      >
        {TABS.map((tab) => (
          <Chip
            key={tab.id}
            label={tab.label}
            selected={active === tab.id}
            onPress={() => onPress(tab.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// onTextLayout's `lines` count is POST-clamp (capped at numberOfLines
// itself), not the text's true unclamped line count — it can never exceed 4
// once numberOfLines={4} is set, so it can't tell us whether text overflowed.
// A character-length heuristic sidesteps that: ~45 chars/line × 2 lines.
const REVIEW_CLAMP_LINES = 2;
const REVIEW_CLAMP_CHARS = 90;

/** Review quote clamped to 2 lines with a tap-to-expand "Read more" — only
 * shown for quotes long enough to actually overflow. */
function ReviewQuote({ text }: { text: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const truncated = text.length > REVIEW_CLAMP_CHARS;
  return (
    <View>
      <AppText
        variant="body"
        numberOfLines={expanded ? undefined : REVIEW_CLAMP_LINES}
      >
        {text}
      </AppText>
      {truncated ? (
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={4}>
          <AppText
            variant="caption"
            style={{
              color: theme.colors['primary'],
              marginTop: theme.spacing(1),
            }}
          >
            {expanded ? t.showLess : t.readMore}
          </AppText>
        </Pressable>
      ) : null}
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
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  function selectTab(id: TabId) {
    setActiveTab(id);
    // Without this, switching tabs while scrolled deep into a long panel
    // can land on a blank stretch of the new (shorter) panel — a single
    // one-shot scroll, not tracked/re-fired on every scroll frame like the
    // jump-scroll version was, so it doesn't reintroduce that bug class.
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

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
        ref={scrollRef}
        // Clears the StickyCTABar: bar body (~96) + device bottom inset +
        // breathing room — a flat constant under-clears at large font scales
        // (adversarial-review finding).
        contentContainerStyle={{
          paddingBottom: 96 + insets.bottom + theme.spacing(6),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <GalleryPager
            images={tour.gallery}
            title={tour.title}
            // P5.6: the identity block lives ON the hero (Navel Screen-28).
            overlay={
              <View style={{ gap: theme.spacing(1) }}>
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
                    <AppText
                      variant="caption"
                      style={{ color: theme.colors['on-media'] }}
                    >
                      {tour.rating.toFixed(1)}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{ color: theme.colors['on-media'], opacity: 0.85 }}
                    >
                      ({tour.reviewCount} {messages.featuredTours.reviewsLabel})
                    </AppText>
                  </View>
                ) : null}
                <AppText
                  numberOfLines={3}
                  style={{
                    fontFamily: theme.fontFamilies.headingBold,
                    fontSize: 32,
                    lineHeight: 38,
                    color: theme.colors['on-media'],
                  }}
                >
                  {tour.title}
                </AppText>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing(1),
                  }}
                >
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={theme.colors['on-media']}
                  />
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors['on-media'], opacity: 0.85 }}
                  >
                    {tour.destination}
                  </AppText>
                </View>
              </View>
            }
          />
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
          <View
            style={{
              paddingHorizontal: theme.spacing(4),
              paddingTop: theme.spacing(3),
              gap: theme.spacing(1),
            }}
          >
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
        </View>

        <SectionTabBar active={activeTab} onPress={selectTab} />

        <View
          style={{
            paddingHorizontal: theme.spacing(4),
            paddingTop: theme.spacing(4),
            gap: theme.spacing(5),
          }}
        >
          {activeTab === 'overview' ? (
            <>
              <Section title={t.overviewTitle}>
                <View style={{ gap: theme.spacing(4) }}>
                  {tour.overview !== '' ? (
                    <AppText variant="body" muted>
                      {tour.overview}
                    </AppText>
                  ) : null}
                  <SpecGrid tour={tour} />
                </View>
              </Section>

              {tour.highlights.length > 0 ? (
                <Section title={t.highlightsTitle}>
                  <View style={{ gap: theme.spacing(3) }}>
                    {tour.highlights.map((item) => (
                      <View
                        key={item}
                        style={{
                          flexDirection: 'row',
                          gap: theme.spacing(2),
                        }}
                      >
                        <Ionicons
                          name="sparkles-outline"
                          size={15}
                          color={theme.colors['primary']}
                          style={{ marginTop: 3 }}
                        />
                        <AppText variant="body" muted style={{ flex: 1 }}>
                          {item}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </Section>
              ) : null}

              {/* Web order parity: Overview → Highlights → Value. */}
              <ValuePanel />
            </>
          ) : null}

          {activeTab === 'itinerary' && tour.itinerary.length > 0 ? (
            <Section title={t.itineraryTitle}>
              <View style={{ gap: theme.spacing(2) }}>
                {/* The Itinerary tab is already its own isolated panel now
                    (P5.8) — no more reason to cap at 3 days + link out to a
                    separate full-itinerary page like the old single-scroll
                    layout needed. */}
                {tour.itinerary.map((day) => (
                  <Accordion
                    key={day.day}
                    title={`${t.dayLabel(day.day)}: ${day.title}`}
                  >
                    <ItineraryDayTimeline body={day.body} />
                  </Accordion>
                ))}
              </View>
            </Section>
          ) : null}

          {activeTab === 'details' ? (
            <>
              <InclusionsPanel
                included={tour.included}
                excluded={tour.excluded}
                durationDays={tour.durationDays}
              />

              {tour.policies.length > 0 ? (
                <Section title={t.policiesTitle}>
                  <View style={{ gap: theme.spacing(3) }}>
                    {tour.policies.map((policy) => (
                      <View
                        key={policy.title}
                        style={{ gap: theme.spacing(1) }}
                      >
                        <AppText
                          variant="body"
                          style={{
                            fontFamily: theme.fontFamilies.sansSemiBold,
                          }}
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
            </>
          ) : null}

          {activeTab === 'reviews' ? (
            <>
              {reviewsQ.data && reviewsQ.data.length > 0 ? (
                <Section title={t.reviewsTitle}>
                  <View style={{ gap: theme.spacing(3) }}>
                    {reviewsQ.data.slice(0, 3).map((review) => (
                      <View key={review.id} style={{ gap: theme.spacing(1) }}>
                        <AppText variant="caption" muted>
                          {/* Pad to 5 chars so every row's star run is the
                              same width (a 4-star review previously read one
                              char shorter than a 5-star one, misaligning the
                              list). */}
                          {'★'.repeat(review.rating)}
                          {'☆'.repeat(Math.max(0, 5 - review.rating))} ·{' '}
                          {review.author}
                          {review.date ? ` · ${review.date}` : ''}
                        </AppText>
                        <ReviewQuote text={review.quote} />
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
            </>
          ) : null}
        </View>
      </ScrollView>

      <BackOverlay />

      <StickyCTABar
        leading={
          <View>
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
              {/* P5.6: money gets the display treatment. */}
              <AppText
                style={{
                  fontFamily: theme.fontFamilies.sansSemiBold,
                  fontSize: 22,
                  lineHeight: 28,
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
        }
      >
        <View style={{ flexDirection: 'row', gap: theme.spacing(2) }}>
          <Button
            variant="outline"
            label={t.inquireNow}
            onPress={() => enquirySheetRef.current?.open()}
          />
          <Button
            label={tb.bookCta}
            style={{ flexGrow: 1 }}
            onPress={() =>
              // Only a *known* guest goes to sign-in; while the session is still
              // restoring ('loading') open the sheet — the contact step re-checks.
              status === 'signedOut'
                ? router.push('/auth/sign-in?reason=booking')
                : departureSheetRef.current?.open()
            }
          />
        </View>
      </StickyCTABar>

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
