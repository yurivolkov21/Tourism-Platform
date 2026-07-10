import Link from 'next/link';
import { ArrowRightIcon, StarIcon, UtensilsIcon } from 'lucide-react';

import {
  Card,
  CardContent,
  Separator,
  ShineBorder,
  buttonVariants,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { Departure } from '../../lib/tours';
import { WishlistButton } from './wishlist-button';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Sticky booking aside — price (with any saving), rating, meals, upcoming departures, and the CTAs:
 * "Book now" opens the real booking flow (`/tours/[slug]/book`); "Ask a question" jumps to the on-page
 * enquiry form. */
export function BookingBox({
  slug,
  tourId,
  currency,
  basePrice,
  compareAtPrice,
  rating,
  reviewCount,
  meals,
  departures,
}: {
  slug: string;
  /** Real tour UUID — powers the wishlist save toggle (signed-in only). */
  tourId: string;
  currency: string;
  basePrice: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  meals: string;
  departures: Departure[];
}) {
  const t = messages.tourDetail.booking;

  return (
    <ShineBorder radius={12} className="lg:sticky lg:top-24">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground text-sm">
                {t.fromLabel}
              </span>
              <span className="font-heading text-primary text-3xl font-bold">
                {formatPrice(currency, basePrice)}
              </span>
              {compareAtPrice ? (
                <span className="text-price-compare text-sm line-through">
                  {formatPrice(currency, compareAtPrice)}
                </span>
              ) : null}
              <span className="text-muted-foreground text-sm">
                / {t.perPerson}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <StarIcon
                className="fill-rating text-rating size-4"
                aria-hidden="true"
              />
              <span className="font-semibold">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({t.reviewsInline(reviewCount)})
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-2 text-sm">
            <UtensilsIcon className="text-primary mt-0.5 size-4 shrink-0" />
            <span>
              <span className="text-muted-foreground">
                {messages.tourDetail.inclusionLabels.meals}:{' '}
              </span>
              <span className="font-medium">{meals}</span>
            </span>
          </div>

          {departures.length > 0 ? (
            <div>
              <h3 className="font-sans mb-3 text-sm font-semibold tracking-wide uppercase">
                {t.departures}
              </h3>
              <ul className="space-y-2.5">
                {departures.map((departure) => (
                  <li
                    key={departure.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-medium">{departure.date}</span>
                    <span className="text-muted-foreground">
                      {t.seatsLeft(departure.seatsLeft)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Two ways to travel — scheduled (instant) vs private (your dates, on request) */}
          <div className="space-y-2.5">
            <Link
              href={`/tours/${slug}/book`}
              className="border-primary/40 bg-primary/5 hover:border-primary block rounded-xl border p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t.twoWays.scheduledTitle}</span>
                <ArrowRightIcon className="text-primary size-4" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                {t.twoWays.scheduledDesc}
              </p>
            </Link>
            <Link
              href={`/tours/${slug}/book?mode=private`}
              className="hover:border-primary/60 block rounded-xl border p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{t.twoWays.privateTitle}</span>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[0.7rem] font-medium">
                  {t.twoWays.privateBadge}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
                {t.twoWays.privateDesc}
              </p>
            </Link>
            <a
              href="#contact"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'w-full',
              )}
            >
              {t.enquireCta}
            </a>
            <WishlistButton tourId={tourId} />
          </div>
        </CardContent>
      </Card>
    </ShineBorder>
  );
}

export default BookingBox;
