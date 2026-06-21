import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, FlameIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { Badge, Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { TourCardData } from '../tours/tour-card';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Large lead card for the single most-booked tour. */
function FeaturedTour({ tour }: { tour: TourCardData }) {
  const t = messages.featuredTours;
  const tp = messages.destinationsPage;

  return (
    <Link
      href={`#tour-${tour.slug}`}
      className="group bg-card ring-border/60 shadow-card hover:shadow-dropdown flex flex-col overflow-hidden rounded-2xl ring-1 transition-all duration-200 ease-out-expo hover:-translate-y-0.5"
    >
      <div className="relative aspect-16/11 w-full overflow-hidden">
        <Image
          src={tour.image ?? ''}
          alt={tour.title}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out-expo group-hover:scale-105"
        />
        <span className="bg-primary text-primary-foreground shadow-card absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
          <FlameIcon className="size-3.5" />
          {tp.popularBadge}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {tour.destination}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" />
            {tour.durationDays} {t.daysLabel}
          </span>
        </div>

        <h3 className="font-heading text-2xl font-semibold text-balance md:text-3xl">{tour.title}</h3>
        <p className="text-muted-foreground text-pretty">{tp.popularLeadHighlight}</p>

        <div className="flex items-center gap-1.5 text-sm">
          <StarIcon className="text-rating fill-rating size-4" />
          <span className="font-medium">{tour.rating.toFixed(1)}</span>
          <span className="text-muted-foreground">
            ({tour.reviewCount} {t.reviewsLabel})
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">{t.from}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-price text-2xl font-bold">
                {formatPrice(tour.currency, tour.basePrice)}
              </span>
              {tour.compareAtPrice ? (
                <span className="text-price-compare text-sm line-through">
                  {formatPrice(tour.currency, tour.compareAtPrice)}
                </span>
              ) : null}
            </div>
          </div>
          <Button render={<a href={`#tour-${tour.slug}`} />} nativeButton={false}>
            {t.view}
          </Button>
        </div>
      </div>
    </Link>
  );
}

/** Compact ranked row for a supporting popular tour. */
function PopularRow({ tour, rank }: { tour: TourCardData; rank: number }) {
  const t = messages.featuredTours;
  const topBadge = tour.badges[0];

  return (
    <Link
      href={`#tour-${tour.slug}`}
      className="group bg-card ring-border/60 shadow-card hover:shadow-dropdown hover:ring-primary/40 flex gap-4 overflow-hidden rounded-xl ring-1 transition-all duration-200 ease-out-expo hover:-translate-y-0.5"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden sm:w-32">
        <Image
          src={tour.image ?? ''}
          alt={tour.title}
          fill
          sizes="128px"
          className="object-cover transition-transform duration-300 ease-out-expo group-hover:scale-105"
        />
        <span className="bg-foreground/80 text-background absolute top-2 left-2 flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums">
          {rank}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1.5 py-3 pr-4">
        <h4 className="group-hover:text-primary line-clamp-2 font-semibold text-balance transition-colors">
          {tour.title}
        </h4>
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <StarIcon className="text-rating fill-rating size-3.5" />
          <span className="text-foreground font-medium">{tour.rating.toFixed(1)}</span>
          <span>
            ({tour.reviewCount} {t.reviewsLabel})
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs">{t.from}</span>
          <span className="text-price font-bold">{formatPrice(tour.currency, tour.basePrice)}</span>
          {topBadge ? (
            <Badge className="bg-secondary text-secondary-foreground ml-auto border-transparent">
              {t.badges[topBadge]}
            </Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/**
 * Overview "Most popular journeys" — an editorial featured-lead bento: the single most-booked
 * tour as a large card, with three ranked supporting tours beside it. Signals popularity through
 * hierarchy (the lead) and a ranked list (#2–#4) rather than a flat, uniform grid.
 */
export function PopularTours({ tours }: { tours: TourCardData[] }) {
  const t = messages.destinationsPage;
  const [lead, ...rest] = tours;
  if (!lead) return null;

  return (
    <section className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.popularHeading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.popularSubtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <FeaturedTour tour={lead} />
          <div className="flex flex-col gap-4">
            {rest.map((tour, i) => (
              <PopularRow key={tour.slug} tour={tour} rank={i + 2} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PopularTours;
