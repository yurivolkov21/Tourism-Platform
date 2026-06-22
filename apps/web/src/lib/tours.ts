import { getBySlug } from '@tourism/core';

import type { TourCardData } from '../components/tours/tour-card';
import { destinations } from './destinations.fixtures';

export interface ItineraryDay {
  day: number;
  title: string;
  body: string;
}

export interface Departure {
  id: string;
  date: string;
  seatsLeft: number;
}

/** Tour-detail view-model: the card + generated placeholder detail (review-only; from API later). */
export interface TourDetailVM extends TourCardData {
  destinationSlug: string;
  region: string;
  overview: string;
  gallery: string[];
  highlights: string[];
  itinerary: ItineraryDay[];
  included: string[];
  notIncluded: string[];
  departures: Departure[];
}

/** Every tour across the destination fixtures, deduped by slug (input order preserved). */
export function allTours(): TourCardData[] {
  const seen = new Set<string>();
  const out: TourCardData[] = [];
  for (const destination of destinations) {
    for (const tour of destination.tours) {
      if (!seen.has(tour.slug)) {
        seen.add(tour.slug);
        out.push(tour);
      }
    }
  }
  return out;
}

/** Tour slugs for `generateStaticParams`. */
export function tourSlugs(): string[] {
  return allTours().map((tour) => tour.slug);
}

export function getTourBySlug(slug: string): TourCardData | undefined {
  return getBySlug(allTours(), slug);
}

// The destination (with its region + imagery) that owns a tour.
function ownerOf(slug: string) {
  return destinations.find((d) => d.tours.some((t) => t.slug === slug));
}

// Standard inclusions — the same placeholder set for every tour until real data lands.
const INCLUDED: readonly string[] = [
  'Private air-conditioned transfers, door to door',
  'A knowledgeable English-speaking local guide',
  'All entrance fees and permits on the itinerary',
  'Meals as listed (B / L / D) and bottled water',
  'Accommodation on multi-day trips',
];
const NOT_INCLUDED: readonly string[] = [
  'International and domestic flights',
  'Travel insurance (required)',
  'Personal expenses, drinks and tips',
  'Anything not listed under “included”',
];

function buildItinerary(destination: string, days: number): ItineraryDay[] {
  if (days <= 1) {
    return [
      {
        day: 1,
        title: `A full day in ${destination}`,
        body: `Morning hotel pickup, a guided day through the highlights and hidden corners of ${destination}, then a relaxed transfer back in the evening.`,
      },
    ];
  }
  const itinerary: ItineraryDay[] = [];
  for (let day = 1; day <= days; day += 1) {
    if (day === 1) {
      itinerary.push({
        day,
        title: `Arrival in ${destination}`,
        body: `Meet your guide, settle in, and take an orientation walk to get your bearings around ${destination}.`,
      });
    } else if (day === days) {
      itinerary.push({
        day,
        title: 'Departure',
        body: 'A relaxed final morning with time for any last sights or souvenirs before your onward transfer.',
      });
    } else {
      itinerary.push({
        day,
        title: `Exploring ${destination}`,
        body: `A full day discovering the landscapes, culture and food of ${destination} at an unhurried pace.`,
      });
    }
  }
  return itinerary;
}

function buildHighlights(destination: string): string[] {
  return [
    `Hand-picked highlights of ${destination} with a local expert guide`,
    'Small-group, unhurried pace — time to actually take it in',
    'Comfortable private transfers, door to door',
    'Authentic local meals and quiet, off-the-list stops',
  ];
}

function buildDepartures(slug: string): Departure[] {
  const now = new Date();
  const seats = [4, 8, 12];
  return [30, 60, 90].map((offset, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    return {
      id: `${slug}-${i}`,
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      seatsLeft: seats[i],
    };
  });
}

/** Build the full detail VM for a tour, or `undefined` if the slug is unknown. */
export function getTourDetail(slug: string): TourDetailVM | undefined {
  const tour = getTourBySlug(slug);
  if (!tour) return undefined;
  const owner = ownerOf(slug);
  const gallery = Array.from(
    new Set(
      [tour.image, owner?.image, ...(owner?.gallery ?? [])].filter(
        (src): src is string => Boolean(src),
      ),
    ),
  );

  return {
    ...tour,
    destinationSlug: owner?.slug ?? '',
    region: owner?.region ?? '',
    overview: owner?.intro ?? '',
    gallery,
    highlights: buildHighlights(tour.destination),
    itinerary: buildItinerary(tour.destination, tour.durationDays),
    included: [...INCLUDED],
    notIncluded: [...NOT_INCLUDED],
    departures: buildDepartures(slug),
  };
}
