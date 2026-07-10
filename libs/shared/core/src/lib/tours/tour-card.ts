import type { ApiClient } from '../api/client.js';
import type { ApiMeta } from '../api-response.js';
import type { components } from '../api/schema.js';

type TourSummaryDto = components['schemas']['TourSummaryDto'];

export type TourBadgeKey =
  | 'BEST_VALUE'
  | 'LIMITED_OFFER'
  | 'EXCLUSIVE'
  | 'NEW'
  | 'POPULAR';

/** Cover when the API returns no tour media (matches web destination placeholder). */
export const TOUR_CARD_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=1100&q=70&auto=format&fit=crop';

export type TourCardData = {
  slug: string;
  title: string;
  destination: string;
  /** All linked destination names (M:N). */
  destinations?: string[];
  durationDays: number;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  badges: TourBadgeKey[];
  image?: string;
  summary?: string;
  category?: string;
  categoryName?: string;
  nextDepartureDate?: string | null;
  nextDepartureSeatsLeft?: number | null;
};

export function toTourCard(dto: TourSummaryDto): TourCardData {
  const primary =
    dto.destinations.find((d) => d.isPrimary) ?? dto.destinations[0];
  const hero = dto.media.find((m) => m.role === 'hero') ?? dto.media[0];
  return {
    slug: dto.slug,
    title: dto.title,
    destination: primary?.destination.name ?? '',
    destinations: dto.destinations.map((d) => d.destination.name).filter(Boolean),
    durationDays: dto.durationDays,
    basePrice: Number(dto.basePrice),
    compareAtPrice: dto.compareAtPrice ? Number(dto.compareAtPrice) : undefined,
    currency: dto.currency,
    rating: dto.averageRating,
    reviewCount: dto.reviewsCount,
    badges: (dto.badges ?? []) as TourBadgeKey[],
    image: hero?.url ?? TOUR_CARD_IMAGE_FALLBACK,
    summary: dto.summary ?? undefined,
    category: dto.category?.slug,
    categoryName: dto.category?.name,
    nextDepartureDate: dto.nextDepartureDate,
    nextDepartureSeatsLeft: dto.nextDepartureSeatsLeft,
  };
}

export type TourCardsPageParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  featured?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'basePrice' | 'durationDays' | 'title';
  sortOrder?: 'asc' | 'desc';
};

export type TourCardsPageMeta = Required<
  Pick<ApiMeta, 'page' | 'pageSize' | 'total' | 'totalPages'>
>;

export type TourCardsPageResult = {
  items: TourCardData[];
  meta: TourCardsPageMeta;
};

function parseTourCardsPage(
  data: { data?: TourSummaryDto[]; meta?: ApiMeta } | undefined,
  fallbackPage: number,
  fallbackPageSize: number,
): TourCardsPageResult {
  const list = data?.data ?? [];
  const meta = data?.meta;
  const pageSize = meta?.pageSize ?? fallbackPageSize;
  const total = meta?.total ?? list.length;
  const totalPages = meta?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));
  return {
    items: list.map(toTourCard),
    meta: {
      page: meta?.page ?? fallbackPage,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function fetchTourCardsPageFromApi(
  api: ApiClient,
  params: TourCardsPageParams = {},
): Promise<TourCardsPageResult> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const search = params.search?.trim();
  const { data } = await api.GET('/api/v1/tours', {
    params: {
      query: {
        page,
        pageSize,
        featured: params.featured,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ...(search ? { search } : {}),
      },
    },
  });
  return parseTourCardsPage(
    data as { data?: TourSummaryDto[]; meta?: ApiMeta } | undefined,
    page,
    pageSize,
  );
}

export async function fetchTourCardsFromApi(
  api: ApiClient,
  params: { pageSize?: number; featured?: boolean } = {},
): Promise<TourCardData[]> {
  const { items } = await fetchTourCardsPageFromApi(api, {
    page: 1,
    pageSize: params.pageSize ?? 100,
    featured: params.featured,
  });
  return items;
}
