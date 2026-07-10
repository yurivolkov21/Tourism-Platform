import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { TourCardData } from './tour-card';
import { TourAvailability } from './tour-availability';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Image-background tour poster tile (photo + overlaid title/place/rating/price). */
export function TourTile({ tour }: { tour: TourCardData }) {
  const t = messages.featuredTours;
  const topBadge = tour.badges[0];

  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group text-on-media relative block aspect-3/4 overflow-hidden rounded-2xl"
    >
      <Image
        src={tour.image ?? ''}
        alt={tour.title}
        fill
        sizes="(min-width: 1024px) 25vw, 50vw"
        className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
      />
      <div className="from-overlay via-overlay/40 absolute inset-0 bg-linear-to-t to-transparent" />

      {topBadge ? (
        <span className="border-primary-foreground/25 bg-background/15 absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {t.badges[topBadge]}
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
        <div className="text-on-media/85 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tracking-wide uppercase">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" aria-hidden="true" />
            {tour.destination}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {tour.durationDays} {t.daysLabel}
          </span>
        </div>

        <h3 className="font-heading line-clamp-2 text-xl leading-tight font-semibold text-balance">
          {tour.title}
        </h3>

        <TourAvailability
          nextDepartureDate={tour.nextDepartureDate}
          nextDepartureSeatsLeft={tour.nextDepartureSeatsLeft}
          onMedia
        />

        <div className="border-primary-foreground/15 mt-1 flex items-center justify-between gap-2 border-t pt-3">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <StarIcon
              className="text-rating fill-rating size-4"
              aria-hidden="true"
            />
            <span className="font-semibold">{tour.rating.toFixed(1)}</span>
            <span className="text-on-media/70">({tour.reviewCount})</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold">
              {formatPrice(tour.currency, tour.basePrice)}
            </span>
            {tour.compareAtPrice ? (
              <span className="text-on-media/60 text-sm line-through">
                {formatPrice(tour.currency, tour.compareAtPrice)}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default TourTile;
