import { ShieldCheckIcon, StarIcon, UtensilsIcon } from 'lucide-react';

import { Card, CardContent, Separator, buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { Departure } from '../../lib/tours';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Sticky booking aside — price (with any saving), rating, meals, upcoming departures, and the
 * book/enquire CTAs. UI-only: CTAs jump to the on-page enquiry form (real booking is a later pass). */
export function BookingBox({
  currency,
  basePrice,
  compareAtPrice,
  rating,
  reviewCount,
  meals,
  departures,
}: {
  currency: string;
  basePrice: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  meals: string;
  departures: Departure[];
}) {
  const t = messages.tourDetail.booking;
  const deposit = formatPrice(currency, Math.max(100, Math.round((basePrice * 0.3) / 10) * 10));

  return (
    <Card className="lg:sticky lg:top-24">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-sm">{t.fromLabel}</span>
            <span className="font-heading text-primary text-3xl font-bold">
              {formatPrice(currency, basePrice)}
            </span>
            {compareAtPrice ? (
              <span className="text-price-compare text-sm line-through">
                {formatPrice(currency, compareAtPrice)}
              </span>
            ) : null}
            <span className="text-muted-foreground text-sm">/ {t.perPerson}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <StarIcon className="fill-rating text-rating size-4" />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({t.reviewsInline(reviewCount)})</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-start gap-2 text-sm">
          <UtensilsIcon className="text-primary mt-0.5 size-4 shrink-0" />
          <span>
            <span className="text-muted-foreground">{messages.tourDetail.inclusionLabels.meals}: </span>
            <span className="font-medium">{meals}</span>
          </span>
        </div>

        <div>
          <h3 className="font-sans mb-3 text-sm font-semibold tracking-wide uppercase">
            {t.departures}
          </h3>
          <ul className="space-y-2.5">
            {departures.map((departure) => (
              <li key={departure.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{departure.date}</span>
                <span className="text-muted-foreground">{t.seatsLeft(departure.seatsLeft)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5">
          <a href="#contact" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            {t.requestCta}
          </a>
          <p className="text-muted-foreground text-center text-xs">{t.deposit(deposit)}</p>
          <a
            href="#contact"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
          >
            {t.enquireCta}
          </a>
        </div>

        <p className="text-muted-foreground flex items-start gap-2 text-xs text-pretty">
          <ShieldCheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
          {t.trustLine}
        </p>
      </CardContent>
    </Card>
  );
}

export default BookingBox;
