import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import type { TourCardData } from '../tours/tour-card';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Image-background tour card with overlaid copy (poster style). */
function PopularTourCard({ tour }: { tour: TourCardData }) {
  const t = messages.featuredTours;
  const topBadge = tour.badges[0];

  return (
    <Link
      href={`#tour-${tour.slug}`}
      className="group text-primary-foreground relative block aspect-3/4 overflow-hidden rounded-2xl"
    >
      <Image
        src={tour.image ?? ''}
        alt={tour.title}
        fill
        sizes="(min-width: 1024px) 25vw, 50vw"
        className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
      />
      {/* Legibility scrim */}
      <div className="from-overlay via-overlay/40 absolute inset-0 bg-linear-to-t to-transparent" />

      {/* Top chip — the tour's headline badge, frosted */}
      {topBadge ? (
        <span className="border-primary-foreground/25 bg-background/15 absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          {t.badges[topBadge]}
        </span>
      ) : null}

      {/* Bottom overlay copy */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
        <div className="text-primary-foreground/85 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tracking-wide uppercase">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {tour.destination}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" />
            {tour.durationDays} {t.daysLabel}
          </span>
        </div>

        <h3 className="font-heading line-clamp-2 text-xl leading-tight font-semibold text-balance">
          {tour.title}
        </h3>

        <div className="border-primary-foreground/15 mt-1 flex items-center justify-between gap-2 border-t pt-3">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <StarIcon className="text-rating fill-rating size-4" />
            <span className="font-semibold">{tour.rating.toFixed(1)}</span>
            <span className="text-primary-foreground/70">({tour.reviewCount})</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold">{formatPrice(tour.currency, tour.basePrice)}</span>
            {tour.compareAtPrice ? (
              <span className="text-primary-foreground/60 text-sm line-through">
                {formatPrice(tour.currency, tour.compareAtPrice)}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Overview "Most popular journeys" — four equal image-background poster cards. Each tour's photo
 * fills the card with overlaid title, place, rating and price; the headline badge sits as a frosted
 * chip. Image-forward and consistent with the destination tiles, while price/rating keep it
 * unmistakably a bookable tour.
 */
export function PopularTours({ tours }: { tours: TourCardData[] }) {
  const t = messages.destinationsPage;

  return (
    <section className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.popularHeading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.popularSubtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {tours.map((tour) => (
            <PopularTourCard key={tour.slug} tour={tour} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PopularTours;
