import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { BookingForm } from '../../../../components/booking/booking-form';
import {
  fetchBookingTour,
  fetchTourDepartures,
  toDepartureOptions,
} from '../../../../lib/api/booking';
import { fetchProfile } from '../../../../lib/api/profile';
import { createClient } from '../../../../lib/supabase/server';

export const metadata: Metadata = {
  title: `${messages.booking.page.title} — ${messages.brand.name}`,
};

// Auth-gated + per-user: never statically optimised (the public catalog stays static/ISR).
export const dynamic = 'force-dynamic';

/**
 * Booking page (`/tours/[slug]/book`). Login-required (matches `POST /bookings`): a signed-out visitor
 * is redirected to `/login?redirect=…` (the proxy gates the route too — defence in depth). Fetches the
 * tour + its open departures, preselects `?d=<departureId>`, and renders the booking form.
 */
export default async function BookTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { slug } = await params;
  const { d } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const target = `/tours/${slug}/book${d ? `?d=${encodeURIComponent(d)}` : ''}`;
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }

  const [tour, departures, profile] = await Promise.all([
    fetchBookingTour(slug),
    fetchTourDepartures(slug),
    fetchProfile(),
  ]);
  if (!tour) notFound();

  const options = toDepartureOptions(departures, tour.basePrice);
  const initialDepartureId =
    options.find((o) => o.id === d)?.id ?? options[0]?.id ?? '';
  const t = messages.booking.page;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Link
        href={`/tours/${slug}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        {t.backToTour}
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
      </header>

      {options.length > 0 ? (
        <BookingForm
          tourSlug={slug}
          tourTitle={tour.title}
          currency={tour.currency}
          departures={options}
          initialDepartureId={initialDepartureId}
          defaultName={profile?.fullName ?? ''}
          defaultEmail={profile?.email ?? user.email}
          defaultPhone={profile?.phone ?? ''}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border p-6">
          {messages.booking.box.noDepartures}
        </p>
      )}
    </main>
  );
}
