import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

import { Button, Separator } from '@tourism/ui';

import { BookingStatusBadge } from '../../../../components/bookings/booking-status-badge';
import { RefundBooking } from '../../../../components/bookings/refund-booking';
import { getBooking, type Booking } from '../../../../lib/bookings/data';
import { formatGuests, formatMoney } from '../../../../lib/bookings/format';

interface BookingDetailPageProps {
  params: Promise<{ code: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { code } = await params;

  let booking: Booking;
  try {
    booking = await getBooking(code);
  } catch {
    notFound();
  }

  const paymentLabel = booking.paymentProvider === 'STRIPE' ? 'Stripe' : 'PayPal';

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/bookings" />}>
        <ArrowLeft data-icon="inline-start" />
        Back to bookings
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{booking.code}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {formatMoney(booking.totalAmount, booking.currency)} · {formatGuests(booking.numAdults, booking.numChildren)}
          </p>
        </div>
        <RefundBooking
          code={booking.code}
          status={booking.status}
          totalAmount={booking.totalAmount}
          currency={booking.currency}
        />
      </div>

      <Separator />

      {/* Order facts */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Fact label="Status" value={<BookingStatusBadge status={booking.status} />} />
        <Fact label="Total" value={formatMoney(booking.totalAmount, booking.currency)} />
        <Fact label="Guests" value={formatGuests(booking.numAdults, booking.numChildren)} />
        <Fact label="Payment" value={paymentLabel} />
        <Fact label="Booked" value={formatDateTime(booking.createdAt)} />
        <Fact label="Last updated" value={formatDateTime(booking.updatedAt)} />
      </dl>

      <Separator />

      {/* Trip */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Trip</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {/* No admin tour detail route yet (only /tours/[slug]/edit) — link to the editable page. */}
          <Fact
            label="Tour"
            value={
              <Link
                href={`/tours/${booking.tour.slug}/edit`}
                className="hover:text-primary hover:underline"
              >
                {booking.tour.title}
              </Link>
            }
          />
          <Fact
            label="Departure"
            value={`${formatDate(booking.departure.startDate)} → ${formatDate(booking.departure.endDate)}`}
          />
        </dl>
      </section>

      <Separator />

      {/* Customer */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Customer</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Fact label="Name" value={booking.contactName} />
          <Fact
            label="Email"
            value={
              <a href={`mailto:${booking.contactEmail}`} className="hover:text-primary hover:underline">
                {booking.contactEmail}
              </a>
            }
          />
          <Fact
            label="Phone"
            value={
              booking.contactPhone ? (
                <a href={`tel:${booking.contactPhone}`} className="hover:text-primary hover:underline">
                  {booking.contactPhone}
                </a>
              ) : (
                '—'
              )
            }
          />
        </dl>
        {booking.specialRequests?.trim() ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Special requests</p>
            <p className="text-sm whitespace-pre-line">{booking.specialRequests}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
