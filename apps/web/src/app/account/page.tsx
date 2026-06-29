import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { messages } from '@tourism/i18n';

import { AccountDashboard } from '../../components/account/account-dashboard';
import type {
  DashboardNextTrip,
  DashboardUpcomingRow,
} from '../../components/account/account-dashboard';
import { fetchMyBookings } from '../../lib/api/booking';
import { fetchProfile } from '../../lib/api/profile';
import { fetchSavedTours } from '../../lib/api/wishlist';
import { fetchTourDetail } from '../../lib/api/tour-detail';
import { daysUntil, summarizeBookings } from '../../lib/account/dashboard';
import { formatTripDate } from '../../lib/booking/my-bookings';
import { createClient } from '../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.auth.account.title} — ${messages.brand.name}`,
};

export const dynamic = 'force-dynamic';

const MAX_UPCOMING_ROWS = 5;

/** "$149" from a "149.00" string (drops a trailing .00; falls back to the currency code). */
function formatPrice(amount: string, currency: string): string {
  const clean = amount.replace(/\.00$/, '');
  return currency === 'USD' ? `$${clean}` : `${clean} ${currency}`;
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/account');

  const [profile, bookings, saved] = await Promise.all([
    fetchProfile(),
    fetchMyBookings(),
    fetchSavedTours(),
  ]);

  const now = new Date();
  const stats = summarizeBookings(bookings, now);
  const t = messages.auth.account.dashboard;

  // One extra fetch for the next trip's hero image (graceful: gradient if it fails).
  const nextTripImage = stats.nextTrip
    ? ((await fetchTourDetail(stats.nextTrip.tour.slug).catch(() => null))?.image ?? null)
    : null;

  const nextTrip: DashboardNextTrip | null = stats.nextTrip
    ? {
        title: stats.nextTrip.tour.title,
        slug: stats.nextTrip.tour.slug,
        code: stats.nextTrip.code,
        dateLabel: formatTripDate(stats.nextTrip.departure.startDate),
        countdown: t.nextTrip.countdown(daysUntil(stats.nextTrip.departure.startDate, now)),
        image: nextTripImage,
      }
    : null;

  const upcoming: DashboardUpcomingRow[] = stats.upcomingTrips.slice(0, MAX_UPCOMING_ROWS).map((b) => ({
    title: b.tour.title,
    dateLabel: formatTripDate(b.departure.startDate),
    status: b.status,
    code: b.code,
  }));

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <AccountDashboard
        name={profile?.fullName ?? ''}
        email={profile?.email ?? user.email ?? ''}
        avatarUrl={profile?.avatarUrl ?? null}
        memberSince={memberSince}
        stats={{
          trips: stats.total,
          upcoming: stats.upcoming,
          completed: stats.completed,
          saved: saved.length,
        }}
        nextTrip={nextTrip}
        saved={saved.slice(0, 3).map((s) => ({
          tourId: s.tourId,
          slug: s.slug,
          title: s.title,
          image: s.image,
          priceLabel: formatPrice(s.basePrice, s.currency),
        }))}
        upcoming={upcoming}
      />
    </main>
  );
}
