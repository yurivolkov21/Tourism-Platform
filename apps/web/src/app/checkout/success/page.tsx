import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AnimatedContent, buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { BeforeYouGo } from '../../../components/booking/before-you-go';
import { BookingTimeline } from '../../../components/booking/booking-timeline';
import { CheckoutHero } from '../../../components/booking/checkout-hero';
import { CheckoutResult } from '../../../components/booking/checkout-result';
import { TripHighlights } from '../../../components/booking/trip-highlights';
import { TripInclusions } from '../../../components/booking/trip-inclusions';
import { fetchBooking } from '../../../lib/api/booking';
import { fetchTripEssentials } from '../../../lib/api/trip-essentials';
import { captureBooking } from '../../../lib/booking/actions';
import { createClient } from '../../../lib/supabase/server';

export const metadata: Metadata = {
  title: messages.booking.success.confirmedTitle,
};

export const dynamic = 'force-dynamic';

/**
 * Payment return page. The API fixes the result URL to `/checkout/success?code=<code>` (+ Stripe's
 * `session_id`). We read the booking by code:
 *  - **PayPal + PENDING** → capture the approved order (idempotent), then re-read.
 *  - **Stripe** → the webhook flips PAID server-side; if still PENDING we show "confirming…" + refresh.
 * Auth is required to read an owned booking; a signed-out visitor is sent to login and back.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; session_id?: string }>;
}) {
  const sp = await searchParams;
  const code = sp.code?.trim();
  const t = messages.booking.success;

  if (!code) return <NotFound message={t.notFound} />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const target = `/checkout/success?code=${encodeURIComponent(code)}`;
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }

  let booking = await fetchBooking(code);
  if (!booking) return <NotFound message={t.notFound} />;

  // PayPal returns the buyer here while the order is only APPROVED — finalise it (idempotent), re-read.
  if (booking.paymentProvider === 'PAYPAL' && booking.status === 'PENDING') {
    const captured = await captureBooking(code);
    if (captured) booking = (await fetchBooking(code)) ?? booking;
  }

  // Never lets a tour-lookup hiccup block the booking confirmation — `trip` degrades to `null` and
  // every section below already handles that (hero falls back to a gradient, highlights/inclusions
  // hide, before-you-go falls back to generic copy).
  const trip = await fetchTripEssentials(booking.tour.slug).catch(() => null);

  // Sections below the fold rise in as they're reached. The hero is deliberately NOT wrapped — it's
  // the payment confirmation and must be on screen the instant the page paints.
  const sections = [
    <CheckoutResult key="ticket" booking={booking} />,
    <BookingTimeline key="timeline" booking={booking} />,
    <TripHighlights key="highlights" items={trip?.highlights ?? []} />,
    <TripInclusions
      key="inclusions"
      included={trip?.included ?? []}
      excluded={trip?.excluded ?? []}
    />,
    <BeforeYouGo key="before" meetingPoint={trip?.meetingPoint} />,
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 lg:py-16">
      {/* The hero owns the stat row now — the photo dissolves into the page background and the row
          sits in that dissolved zone, so the two read as one surface with no seam between them. */}
      <CheckoutHero booking={booking} trip={trip} />

      {sections.map((section, index) => (
        <AnimatedContent
          key={section.key}
          distance={24}
          duration={0.6}
          delay={index * 0.08}
          threshold={0.05}
        >
          {section}
        </AnimatedContent>
      ))}
    </main>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <p className="text-muted-foreground">{message}</p>
      <Link
        href="/tours"
        className={cn(buttonVariants({ variant: 'outline' }), 'mt-6')}
      >
        {messages.booking.success.viewTours}
      </Link>
    </main>
  );
}
