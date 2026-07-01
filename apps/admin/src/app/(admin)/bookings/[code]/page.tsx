import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, Separator } from '@tourism/ui';

import { BookingStatusBadge } from '../../../../components/bookings/booking-status-badge';
import { CopyCodeButton } from '../../../../components/bookings/copy-code-button';
import { RefundBooking } from '../../../../components/bookings/refund-booking';
import { getBooking } from '../../../../lib/bookings/data';
import type { AdminBookingDetail } from '../../../../lib/bookings/detail';
import { buildBookingTimeline, formatRelativeTime, stripePaymentUrl } from '../../../../lib/bookings/detail';
import { formatGuests, formatMoney } from '../../../../lib/bookings/format';

interface BookingDetailPageProps {
  params: Promise<{ code: string }>;
}

/** Label shown for each lifecycle event in the order summary (friendlier than the raw step key). */
const LIFECYCLE_LABELS: Record<string, string> = {
  created: 'Booked',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** One label/value row in the summary rail. */
function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/** One label/value pair in the main content cards. */
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

  let booking: AdminBookingDetail;
  try {
    booking = await getBooking(code);
  } catch {
    notFound();
  }

  const paymentLabel = booking.paymentProvider === 'STRIPE' ? 'Stripe' : 'PayPal';
  const stripeUrl = stripePaymentUrl(booking.providerPaymentId, booking.paymentProvider);
  // Lifecycle events that actually happened (have a timestamp) — rendered as compact date rows.
  const lifecycle = buildBookingTimeline(booking).filter((s) => s.at);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/bookings"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to bookings
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{booking.code}</h1>
            <CopyCodeButton code={booking.code} />
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {formatMoney(booking.totalAmount, booking.currency)} ·{' '}
            {formatGuests(booking.numAdults, booking.numChildren)}
          </p>
        </div>
        <RefundBooking
          code={booking.code}
          status={booking.status}
          totalAmount={booking.totalAmount}
          currency={booking.currency}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Fact label="Name" value={booking.contactName} />
                <Fact
                  label="Email"
                  value={
                    <a
                      href={`mailto:${booking.contactEmail}`}
                      className="hover:text-primary break-all hover:underline"
                    >
                      {booking.contactEmail}
                    </a>
                  }
                />
                <Fact
                  label="Phone"
                  value={
                    booking.contactPhone ? (
                      <a
                        href={`tel:${booking.contactPhone}`}
                        className="hover:text-primary hover:underline"
                      >
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
            </CardContent>
          </Card>
        </div>

        {/* Order summary rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <SummaryRow label="Status" value={<BookingStatusBadge status={booking.status} />} />
                <SummaryRow
                  label="Total"
                  value={
                    <span className="font-semibold tabular-nums">
                      {formatMoney(booking.totalAmount, booking.currency)}
                    </span>
                  }
                />
                <SummaryRow
                  label="Guests"
                  value={formatGuests(booking.numAdults, booking.numChildren)}
                />
                <SummaryRow label="Payment" value={paymentLabel} />
              </dl>

              {/* Lifecycle dates — only events that happened, as compact rows (replaces the timeline). */}
              <Separator />
              <dl className="space-y-3">
                {lifecycle.map((step) => (
                  <SummaryRow
                    key={step.key}
                    label={LIFECYCLE_LABELS[step.key] ?? step.label}
                    value={
                      <span className="font-normal">
                        {formatDate(step.at as string)}
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          {formatRelativeTime(step.at as string)}
                        </span>
                      </span>
                    }
                  />
                ))}
              </dl>

              {booking.providerPaymentId ? (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Payment reference</p>
                    <p className="font-mono text-xs break-all">{booking.providerPaymentId}</p>
                    {stripeUrl ? (
                      <a
                        href={stripeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                      >
                        View in Stripe
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </>
              ) : null}

              {booking.status === 'REFUNDED' ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Refund</p>
                    <dl className="space-y-2">
                      <Fact
                        label="Reason"
                        value={booking.refundReason?.trim() || 'No reason recorded'}
                      />
                      {booking.refundedBy ? (
                        <Fact
                          label="By"
                          value={booking.refundedBy.fullName?.trim() || booking.refundedBy.email}
                        />
                      ) : null}
                    </dl>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
