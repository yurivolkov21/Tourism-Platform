import Link from 'next/link';
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react';

import { Card, CardContent, Separator, buttonVariants, cn } from '@tourism/ui';
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/**
 * Confirmation panel for `/checkout/success`. PAID → a confirmed receipt; PENDING (Stripe webhook not
 * landed yet) → a "confirming…" state with a refresh control. Never claims PAID it can't see.
 */
export function CheckoutResult({ booking }: { booking: BookingDto }) {
  const t = messages.booking.success;
  const paid = booking.status === 'PAID';
  const travellers =
    booking.numChildren > 0
      ? `${booking.numAdults} adults · ${booking.numChildren} children`
      : `${booking.numAdults} adult${booking.numAdults > 1 ? 's' : ''}`;

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="flex items-start gap-3">
          {paid ? (
            <CheckCircle2Icon className="text-primary mt-0.5 size-7 shrink-0" />
          ) : (
            <Loader2Icon className="text-muted-foreground mt-0.5 size-7 shrink-0 animate-spin" />
          )}
          <div>
            <h1 className="font-heading text-2xl font-semibold">
              {paid ? t.confirmedTitle : t.pendingTitle}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              {paid ? t.confirmedBody : t.pendingBody}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2.5">
          <Row label={t.refLabel} value={booking.code} />
          <Row label={t.tourLabel} value={booking.tour.title} />
          <Row
            label={t.departureLabel}
            value={formatDate(booking.departure.startDate)}
          />
          <Row label={t.travellersLabel} value={travellers} />
          <Row
            label={t.totalLabel}
            value={formatPrice(booking.currency, Number(booking.totalAmount))}
          />
          <Row label={t.contactLabel} value={booking.contactEmail} />
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
      </CardContent>
    </Card>
  );
}

export default CheckoutResult;
