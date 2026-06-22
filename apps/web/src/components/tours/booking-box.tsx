import { ShieldCheckIcon } from 'lucide-react';

import { Card, CardContent, Separator, buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { Departure } from '../../lib/tours';

function formatPrice(currency: string, amount: number) {
  const value = amount.toLocaleString('en-US');
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/** Sticky booking aside — price, upcoming departures, and a "Request to book" CTA. UI-only: the CTA
 * jumps to the on-page enquiry form; no real transaction (real booking is wired in a later pass). */
export function BookingBox({
  currency,
  basePrice,
  departures,
}: {
  currency: string;
  basePrice: number;
  departures: Departure[];
}) {
  const t = messages.tourDetail.booking;

  return (
    <Card className="lg:sticky lg:top-24">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-sm">{t.fromLabel}</span>
          <span className="font-heading text-primary text-3xl font-bold">
            {formatPrice(currency, basePrice)}
          </span>
          <span className="text-muted-foreground text-sm">/ {t.perPerson}</span>
        </div>

        <Separator />

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
                <span className="text-muted-foreground">{t.seatsLeft(departure.seatsLeft)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2.5">
          <a href="#contact" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            {t.requestCta}
          </a>
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
