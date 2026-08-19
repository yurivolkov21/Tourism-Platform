import Link from 'next/link';

import {
  Card,
  CardContent,
  ShineBorder,
  buttonVariants,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import { formatPrice } from './order-summary';
import { AutoRefresh } from './auto-refresh';

/** "15 Aug 2026" from a `YYYY-MM-DD` date (UTC to avoid an off-by-one). */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </div>
      <div className="mt-0.5 font-medium text-pretty">{value}</div>
    </div>
  );
}

/**
 * Booking summary for `/checkout/success`, cut as a **boarding pass**: trip details up top, a
 * punched tear line, then the reference stub. The ticket motif is pure CSS (dashed rule + two
 * `bg-background` circles clipped by the card's `overflow-hidden`) — no images, no JS, no layout
 * risk — and the `ShineBorder` sweep is used here and nowhere else on the page, so it reads as
 * "this one is special" rather than decoration.
 *
 * Status banner lives in `CheckoutHero` above; PAID → email note + CTA, PENDING (webhook not landed
 * yet) → the refresh control. Never claims PAID it can't see.
 */
export function CheckoutResult({ booking }: { booking: BookingDto }) {
  const t = messages.booking.success;
  const paid = booking.status === 'PAID';
  const travellers =
    booking.numChildren > 0
      ? `${booking.numAdults} adults · ${booking.numChildren} children`
      : `${booking.numAdults} adult${booking.numAdults > 1 ? 's' : ''}`;

  return (
    <ShineBorder radius={12} duration={9} className="rounded-xl">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <p className="text-primary text-xs font-bold tracking-wide uppercase">
                {t.ticket.eyebrow}
              </p>
              <h2 className="font-heading mt-1 text-2xl font-semibold text-balance">
                {booking.tour.title}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t.departureLabel}
                value={formatDate(booking.departure.startDate)}
              />
              <Field label={t.travellersLabel} value={travellers} />
            </div>
          </div>

          {/* Punched tear line — the notches are clipped in half by the card's overflow. */}
          <div className="relative" aria-hidden="true">
            <span className="bg-background absolute top-1/2 left-0 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full" />
            <span className="bg-background absolute top-1/2 right-0 size-5 translate-x-1/2 -translate-y-1/2 rounded-full" />
            <div className="border-border mx-6 border-t border-dashed" />
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div>
              <div className="text-muted-foreground text-xs tracking-wide uppercase">
                {t.ticket.refCaption}
              </div>
              <div className="font-heading mt-1 font-mono text-xl font-semibold tracking-[0.2em]">
                {booking.code}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label={t.totalLabel}
                value={formatPrice(
                  booking.currency,
                  Number(booking.totalAmount),
                )}
              />
              <Field label={t.contactLabel} value={booking.contactEmail} />
            </div>

            {paid ? (
              <>
                <p className="text-muted-foreground text-sm">{t.emailNote}</p>
                <Link
                  href="/tours"
                  className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
                >
                  {t.viewTours}
                </Link>
              </>
            ) : (
              <AutoRefresh label={t.refresh} />
            )}
          </div>
        </CardContent>
      </Card>
    </ShineBorder>
  );
}

export default CheckoutResult;
