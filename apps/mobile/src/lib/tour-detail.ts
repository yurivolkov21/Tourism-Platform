import { ApiRequestError, type components } from '@tourism/core';
import { getApiClient } from './api';

type TourDetailDto = components['schemas']['TourDetailDto'];
type PublicReviewDto = components['schemas']['PublicReviewDto'];

export interface TourDetailVm {
  id: string;
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  maxGroupSize: number;
  difficulty?: string;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  badges: string[];
  /** Pre-formatted for display, e.g. "15 Aug 2026". */
  nextDepartureDate?: string;
  nextDepartureSeatsLeft?: number;
  overview: string;
  gallery: string[];
  highlights: string[];
  itinerary: { day: number; title: string; body: string }[];
  included: string[];
  excluded: string[];
  faqs: { question: string; answer: string }[];
  policies: { kind: string; title: string; body: string }[];
}

/** "15 Aug 2026" from an ISO date; echoes the input when unparseable. */
export function formatDepartureDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

export function toTourDetailVm(dto: TourDetailDto): TourDetailVm {
  const primary = dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    destination: primary?.destination.name ?? '',
    durationDays: dto.durationDays,
    maxGroupSize: dto.maxGroupSize,
    difficulty: dto.difficulty ?? undefined,
    basePrice: Number(dto.basePrice),
    compareAtPrice: dto.compareAtPrice ? Number(dto.compareAtPrice) : undefined,
    currency: dto.currency,
    rating: dto.averageRating,
    reviewCount: dto.reviewsCount,
    badges: dto.badges ?? [],
    nextDepartureDate: dto.nextDepartureDate
      ? formatDepartureDate(dto.nextDepartureDate)
      : undefined,
    nextDepartureSeatsLeft: dto.nextDepartureSeatsLeft ?? undefined,
    overview: dto.summary ?? '',
    gallery: dto.media.map((m) => m.url),
    highlights: dto.highlights ?? [],
    itinerary: dto.itinerary.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      body: d.description ?? '',
    })),
    included: dto.included ?? [],
    excluded: dto.excluded ?? [],
    faqs: dto.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    policies: dto.policies.map((p) => ({ kind: p.kind, title: p.title, body: p.body })),
  };
}

/** Full detail VM, or null when the slug is unknown/unpublished (404). */
export async function fetchTourDetail(slug: string): Promise<TourDetailVm | null> {
  const api = getApiClient();
  try {
    const { data } = await api.GET('/api/v1/tours/{slug}', { params: { path: { slug } } });
    const dto = (data as unknown as { data?: TourDetailDto } | undefined)?.data;
    return dto ? toTourDetailVm(dto) : null;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export interface TourReviewVm {
  id: string;
  author: string;
  date: string;
  rating: number;
  quote: string;
}

/** "May 2026" from an ISO timestamp (empty string on a bad value). */
function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Approved reviews (detail teaser keeps the small default; See-all asks for more). */
export async function fetchTourReviews(slug: string, pageSize = 6): Promise<TourReviewVm[]> {
  const api = getApiClient();
  const { data } = await api.GET('/api/v1/tours/{slug}/reviews', {
    params: { path: { slug }, query: { pageSize } },
  });
  const list = (data as unknown as { data: PublicReviewDto[] }).data ?? [];
  return list.map((r) => ({
    id: r.id,
    author: r.reviewer.fullName,
    date: formatReviewDate(r.createdAt),
    rating: r.rating,
    quote: r.body,
  }));
}
