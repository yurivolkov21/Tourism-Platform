/**
 * Token-lean shapes for bot tool results (pure — TDD'd).
 * The model pays per token: strip ids/media/urls, keep the sales-relevant
 * text. `costPrice` must never reach the model (public-strip invariant).
 */

/** Last `limit` messages, order preserved — bounds per-request prompt size. */
export function windowHistory<T>(messages: T[], limit: number): T[] {
  return messages.length <= limit ? messages : messages.slice(-limit);
}

interface TourListItemLike {
  slug: string;
  title: string;
  summary?: string | null;
  durationDays: number;
  basePrice: unknown;
  currency: string;
  averageRating?: number | null;
  reviewsCount?: number | null;
  category?: { name: string } | null;
}

export function toTourSummary(item: TourListItemLike) {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary ?? undefined,
    durationDays: item.durationDays,
    priceFrom: `${String(item.basePrice)} ${item.currency}`,
    rating: item.averageRating ?? undefined,
    reviewsCount: item.reviewsCount ?? undefined,
    category: item.category?.name,
  };
}

interface TourDetailLike extends TourListItemLike {
  included?: string[];
  excluded?: string[];
  highlights?: string[];
  meetingPoint?: string | null;
  maxGroupSize?: number | null;
  difficulty?: string | null;
  itinerary?: Array<{
    day: number;
    title: string;
    description?: string | null;
  }>;
  faqs?: Array<{ question: string; answer: string }>;
  policies?: Array<{ kind: string; title: string; body: string }>;
  destinations?: Array<{ destination: { name: string } }>;
}

export function toTourDetailForBot(tour: TourDetailLike) {
  return {
    ...toTourSummary(tour),
    destinations: tour.destinations?.map((d) => d.destination.name) ?? [],
    included: tour.included ?? [],
    excluded: tour.excluded ?? [],
    highlights: tour.highlights ?? [],
    meetingPoint: tour.meetingPoint ?? undefined,
    maxGroupSize: tour.maxGroupSize ?? undefined,
    difficulty: tour.difficulty ?? undefined,
    itinerary: (tour.itinerary ?? []).map(({ day, title, description }) => ({
      day,
      title,
      description,
    })),
    faqs: (tour.faqs ?? []).map(({ question, answer }) => ({
      question,
      answer,
    })),
    policies: (tour.policies ?? []).map(({ kind, title, body }) => ({
      kind,
      title,
      body,
    })),
    bookingPath: `/tours/${tour.slug}/book`,
  };
}
