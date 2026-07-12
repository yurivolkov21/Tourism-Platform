import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { CheckoutResult } from '../../../components/booking/checkout-result';
import { fetchBooking } from '../../../lib/api/booking';
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

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:py-16">
      <CheckoutResult booking={booking} />
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
