import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { Badge, Card, CardContent, Separator, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { BookingDto } from '../../lib/api/booking';
import {
  bookingStatusTone,
  formatTripDate,
} from '../../lib/booking/my-bookings';
import { formatPrice } from './order-summary';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

/** One booking in the "My bookings" list — tour, status, departure, party size, reference, total. */
export function BookingCard({ booking }: { booking: BookingDto }) {
  const t = messages.booking.list;
  const p = messages.booking.page;
  const travellers =
    booking.numChildren > 0
      ? `${p.adultsLine(booking.numAdults)} · ${p.childrenLine(booking.numChildren)}`
      : p.adultsLine(booking.numAdults);

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-heading text-lg font-semibold text-balance">
            {booking.tour.title}
          </h2>
          <Badge className={cn('shrink-0', bookingStatusTone(booking.status))}>
            {t.status[booking.status] ?? booking.status}
          </Badge>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field
            label={t.departureLabel}
            value={formatTripDate(booking.departure.startDate)}
          />
          <Field label={t.travellersLabel} value={travellers} />
          <Field label={t.refLabel} value={booking.code} />
          <Field
            label={t.totalLabel}
            value={formatPrice(booking.currency, Number(booking.totalAmount))}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-muted-foreground text-xs">
            {t.bookedOn(formatTripDate(booking.createdAt))}
          </p>
          <Link
            href={`/account/bookings/${booking.code}`}
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {t.viewDetails}
            <ArrowUpRightIcon className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default BookingCard;
