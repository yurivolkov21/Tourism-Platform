import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { TourCardData } from './tour-card';
import { TourAvailability } from './tour-availability';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Full-width horizontal listing card (image left · details middle · price + CTA right). Stacks on
 * mobile. Used on `/tours`; the compact vertical `TourCard` stays for home/region grids. */
export function TourListCard({ tour }: { tour: TourCardData }) {
  const t = messages.toursPage;
  const href = `/tours/${tour.slug}`;
  const topBadge = tour.badges[0];

  const tags = [
    ...(tour.themes ?? []).map((theme) => t.themeLabels[theme]),
    ...(tour.travelStyles ?? []).map((style) => t.styleLabels[style]),
  ].slice(0, 3);

  return (
    <article className="group bg-card ring-border hover:ring-primary/40 hover:shadow-card overflow-hidden rounded-2xl ring-1 transition-all duration-300 ease-out-expo sm:flex">
      {/* Image */}
      <Link
        href={href}
        className="relative block aspect-16/10 shrink-0 overflow-hidden sm:aspect-auto sm:w-64 lg:w-80"
      >
        <Image
          src={tour.image ?? ''}
          alt={tour.title}
          fill
          sizes="(min-width: 1024px) 20rem, (min-width: 640px) 16rem, 100vw"
          className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-105"
        />
        {topBadge ? (
          <span className="text-on-media border-on-media/25 bg-overlay/40 absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {messages.featuredTours.badges[topBadge]}
          </span>
        ) : null}
      </Link>

      {/* Body + price rail */}
      <div className="flex flex-1 flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
        {/* Details */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tracking-wide uppercase">
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5" />
              {tour.destination}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              {tour.durationDays === 1 ? '1 day' : `${tour.durationDays} days`}
            </span>
          </div>

          <h3 className="font-heading text-xl leading-tight font-semibold text-balance">
            <Link href={href} className="hover:text-primary transition-colors">
              {tour.title}
            </Link>
          </h3>

          {tour.summary ? (
            <p className="text-muted-foreground line-clamp-2 text-sm text-pretty">{tour.summary}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <StarIcon className="fill-rating text-rating size-4" />
              <span className="font-semibold">{tour.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({tour.reviewCount})</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
            <TourAvailability
              nextDepartureDate={tour.nextDepartureDate}
              nextDepartureSeatsLeft={tour.nextDepartureSeatsLeft}
            />
          </div>
        </div>

        {/* Price + CTA */}
        <div className="border-border flex shrink-0 flex-col items-start gap-3 border-t pt-4 sm:w-44 sm:items-end sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 sm:text-right">
          <div>
            {tour.compareAtPrice ? (
              <span className="text-muted-foreground mr-1.5 text-sm line-through">
                {formatPrice(tour.currency, tour.compareAtPrice)}
              </span>
            ) : null}
            <span className="text-primary font-heading text-2xl font-bold">
              {formatPrice(tour.currency, tour.basePrice)}
            </span>
            <span className="text-muted-foreground block text-xs">{t.perPerson}</span>
          </div>
          <Link href={href} className={cn(buttonVariants({ size: 'sm' }), 'w-full sm:w-auto')}>
            {t.viewTour}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default TourListCard;
