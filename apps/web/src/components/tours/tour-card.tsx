import Image from 'next/image';
import { ClockIcon, ImageIcon, MapPinIcon, StarIcon } from 'lucide-react';

import type { TravelStyle, TourTheme } from '@tourism/core';

import { Badge, Button, Card, CardContent, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourAvailability } from './tour-availability';

export type TourBadgeKey = keyof typeof messages.featuredTours.badges;

// Shape mirrors a future tour-card DTO from @tourism/core (basePrice/compareAtPrice/durationDays/
// badges per the Prisma Tour model). `destination`, `rating`, `reviewCount`, `coverImage` are
// derived/aggregated server-side (schema has no image field or denormalized rating yet).
export type TourCardData = {
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  basePrice: number;
  compareAtPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  badges: TourBadgeKey[];
  // Optional cover (temporary Unsplash URL for review; from MediaAsset later). Falls back to a placeholder.
  image?: string;
  // Editable alt text from the cover MediaAsset; null/undefined = fall back to the tour title.
  imageAlt?: string | null;
  // One-line summary for the listing card (optional; populated on fixtures).
  summary?: string;
  // Category slug (filter value) + display name, from the API's TourCategoryRefDto.
  category?: string;
  categoryName?: string;
  // Filter tags (optional; populated on fixtures for the /tours facets).
  travelStyles?: TravelStyle[];
  themes?: TourTheme[];
  // Next-departure availability (soonest open upcoming departure) for the card badge.
  nextDepartureDate?: string | null;
  nextDepartureSeatsLeft?: number | null;
};

const badgeClass: Record<TourBadgeKey, string> = {
  BEST_VALUE: 'bg-success text-success-foreground',
  LIMITED_OFFER: 'bg-warning text-warning-foreground',
  EXCLUSIVE: 'bg-primary text-primary-foreground',
  NEW: 'bg-info text-info-foreground',
  POPULAR: 'bg-rating text-foreground',
};

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

export function TourCard({ tour }: { tour: TourCardData }) {
  const t = messages.featuredTours;

  return (
    <Card className="group flex h-full flex-col overflow-hidden p-0 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-dropdown">
      {/* Cover — temporary Unsplash image when provided, else a placeholder slot */}
      <div className="relative aspect-(--aspect-card) w-full overflow-hidden">
        {tour.image ? (
          <Image
            src={tour.image}
            alt={tour.imageAlt ?? tour.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 ease-out-expo group-hover:scale-105"
          />
        ) : (
          <div className="from-primary via-primary/80 to-rating flex h-full w-full items-center justify-center bg-linear-to-br">
            <ImageIcon className="text-primary-foreground/80 size-7" />
          </div>
        )}
        {tour.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {tour.badges.map((b) => (
              <Badge
                key={b}
                className={cn('border-transparent', badgeClass[b])}
              >
                {t.badges[b]}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" aria-hidden="true" />
            {tour.destination}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {tour.durationDays} {t.daysLabel}
          </span>
        </div>

        {/* Reserve a fixed 2-line block (min-h-14 = 2× the text-lg line-height) so 1- and 2-line
            titles take the same height; longer titles clamp with an ellipsis. */}
        <h3 className="font-sans text-lg font-semibold leading-7 line-clamp-2 min-h-14">
          {tour.title}
        </h3>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5">
            <StarIcon
              className="text-rating fill-rating size-4"
              aria-hidden="true"
            />
            <span className="font-medium">{tour.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({tour.reviewCount} {t.reviewsLabel})
            </span>
          </span>
          <TourAvailability
            nextDepartureDate={tour.nextDepartureDate}
            nextDepartureSeatsLeft={tour.nextDepartureSeatsLeft}
          />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">{t.from}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-price text-xl font-bold">
                {formatPrice(tour.currency, tour.basePrice)}
              </span>
              {tour.compareAtPrice ? (
                <span className="text-price-compare text-sm line-through">
                  {formatPrice(tour.currency, tour.compareAtPrice)}
                </span>
              ) : null}
            </div>
          </div>
          <Button
            size="sm"
            render={<a href={`/tours/${tour.slug}`} />}
            nativeButton={false}
          >
            {t.view}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default TourCard;
