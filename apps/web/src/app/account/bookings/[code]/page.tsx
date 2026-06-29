import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { Badge, Card, CardContent, Separator, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { BookingActions } from '../../../../components/booking/booking-actions';
import { formatPrice } from '../../../../components/booking/order-summary';
import { fetchBooking } from '../../../../lib/api/booking';
import { bookingStatusTone, formatTripDate } from '../../../../lib/booking/my-bookings';
import { createClient } from '../../../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.booking.detail.title} — ${messages.brand.name}`,
};

// Per-user + authed → never statically optimised. (Proxy gates /account/*; re-check here.)
export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/account/bookings/${code}`);

  const booking = await fetchBooking(code);
  if (!booking) notFound();

  const t = messages.booking.detail;
  const l = messages.booking.list;
  const p = messages.booking.page;
  const travellers =
    booking.numChildren > 0
      ? `${p.adultsLine(booking.numAdults)} · ${p.childrenLine(booking.numChildren)}`
      : p.adultsLine(booking.numAdults);
  const provider =
    booking.paymentProvider.charAt(0) + booking.paymentProvider.slice(1).toLowerCase();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Link
        href="/account/bookings"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-4" />
        {t.back}
      </Link>

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-heading text-2xl font-semibold text-balance sm:text-3xl">
              {booking.tour.title}
            </h1>
            <Badge className={cn('shrink-0', bookingStatusTone(booking.status))}>
              {l.status[booking.status] ?? booking.status}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label={l.departureLabel} value={formatTripDate(booking.departure.startDate)} />
            <Field label={l.travellersLabel} value={travellers} />
            <Field label={l.refLabel} value={booking.code} />
            <Field
              label={l.totalLabel}
              value={formatPrice(booking.currency, Number(booking.totalAmount))}
            />
            <Field label={t.paymentLabel} value={provider} />
          </div>

          <Separator />

          <Field
            label={t.contactLabel}
            value={[booking.contactName, booking.contactEmail, booking.contactPhone]
              .filter(Boolean)
              .join(' · ')}
          />
          <p className="text-muted-foreground text-xs">
            {l.bookedOn(formatTripDate(booking.createdAt))}
          </p>

          {booking.specialRequests ? (
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                {t.requestsLabel}
              </p>
              <p className="mt-0.5 text-pretty">{booking.specialRequests}</p>
            </div>
          ) : null}

          <Separator />

          <BookingActions booking={booking} />

          <Link
            href={`/tours/${booking.tour.slug}`}
            className="text-primary inline-flex text-sm font-medium hover:underline"
          >
            {l.viewTour}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
