import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { BookingCard } from '../../../components/booking/booking-card';
import { fetchMyBookings } from '../../../lib/api/booking';
import { createClient } from '../../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.booking.list.title} — ${messages.brand.name}`,
};

// Per-user + authed → never statically optimised. (Proxy already gates /account/*; re-check here.)
export const dynamic = 'force-dynamic';

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/account/bookings');

  const bookings = await fetchMyBookings();
  const t = messages.booking.list;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
      </header>

      {bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.code} booking={booking} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">{t.empty}</p>
          <Link
            href="/tours"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-6')}
          >
            {t.browse}
          </Link>
        </div>
      )}
    </main>
  );
}
