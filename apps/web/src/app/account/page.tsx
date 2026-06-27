import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { messages } from '@tourism/i18n';

import { AccountDashboard } from '../../components/account/account-dashboard';
import type { DashboardNextTrip } from '../../components/account/account-dashboard';
import { fetchMyBookings } from '../../lib/api/booking';
import { fetchProfile } from '../../lib/api/profile';
import { fetchWishlistCount } from '../../lib/api/wishlist';
import { daysUntil, summarizeBookings } from '../../lib/account/dashboard';
import { formatTripDate } from '../../lib/booking/my-bookings';
import { createClient } from '../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.auth.account.title} — ${messages.brand.name}`,
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/account');

  const [profile, bookings, wishlistCount] = await Promise.all([
    fetchProfile(),
    fetchMyBookings(),
    fetchWishlistCount(),
  ]);

  const now = new Date();
  const stats = summarizeBookings(bookings, now);
  const t = messages.auth.account.dashboard;

  const nextTrip: DashboardNextTrip | null = stats.nextTrip
    ? {
        title: stats.nextTrip.tour.title,
        slug: stats.nextTrip.tour.slug,
        code: stats.nextTrip.code,
        dateLabel: formatTripDate(stats.nextTrip.departure.startDate),
        countdown: t.nextTrip.countdown(daysUntil(stats.nextTrip.departure.startDate, now)),
      }
    : null;

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
          wishlist: wishlistCount,
        }}
        nextTrip={nextTrip}
      />
    </main>
  );
}
