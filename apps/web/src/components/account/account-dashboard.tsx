import Link from 'next/link';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CompassIcon,
  MapPinIcon,
  SettingsIcon,
} from 'lucide-react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { SignOutButton } from '../auth/sign-out-button';
import { bookingStatusTone } from '../../lib/booking/my-bookings';

export interface DashboardNextTrip {
  title: string;
  slug: string;
  dateLabel: string;
  countdown: string;
  code: string;
  image: string | null;
}

export interface DashboardSavedTour {
  tourId: string;
  slug: string;
  title: string;
  image: string | null;
  priceLabel: string;
}

export interface DashboardUpcomingRow {
  title: string;
  dateLabel: string;
  status: string;
  code: string;
}

export interface AccountDashboardProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  memberSince: string;
  stats: { trips: number; upcoming: number; completed: number; saved: number };
  nextTrip: DashboardNextTrip | null;
  saved: DashboardSavedTour[];
  upcoming: DashboardUpcomingRow[];
}

function initial(name: string, email: string): string {
  return (name.trim() || email).slice(0, 1).toUpperCase();
}

export function AccountDashboard({
  name,
  email,
  avatarUrl,
  memberSince,
  stats,
  nextTrip,
  saved,
  upcoming,
}: AccountDashboardProps) {
  const t = messages.auth.account.dashboard;
  const displayName = name.trim() || email.split('@')[0];

  const statCards: { key: string; label: string; value: number }[] = [
    { key: 'trips', label: t.stats.trips, value: stats.trips },
    { key: 'upcoming', label: t.stats.upcoming, value: stats.upcoming },
    { key: 'completed', label: t.stats.completed, value: stats.completed },
    { key: 'saved', label: t.stats.wishlist, value: stats.saved },
  ];

  return (
    <div className="space-y-8">
      {/* Editorial header (no banner overlap) */}
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
          {t.eyebrow}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold sm:text-4xl">
          {t.greeting(displayName)}
        </h1>
        <p className="text-muted-foreground mt-2">{t.subtitle}</p>
      </header>

      {/* Membership card */}
      <section className="bg-card shadow-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-muted ring-border size-18 shrink-0 overflow-hidden rounded-2xl ring-1 sm:size-20">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center text-2xl font-semibold">
                  {initial(name, email)}
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-semibold">
                  {displayName}
                </h2>
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <CompassIcon className="size-3" />
                  {t.traveller}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{email}</p>
              <p className="text-muted-foreground/80 mt-0.5 text-xs">
                {t.memberSince(memberSince)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              render={<Link href="/account/profile" />}
              nativeButton={false}
              className="gap-2"
            >
              <SettingsIcon className="size-4" />
              {t.links.settings}
            </Button>
            <SignOutButton />
          </div>
        </div>
      </section>

      {/* Journey stats — one divided card, centered */}
      <section className="bg-card shadow-card grid grid-cols-2 divide-x divide-y rounded-2xl border sm:grid-cols-4 sm:divide-y-0">
        {statCards.map(({ key, label, value }) => (
          <div
            key={key}
            className="flex flex-col items-center justify-center gap-1 p-6 text-center"
          >
            <p className="font-heading text-3xl font-semibold tabular-nums sm:text-4xl">
              {value}
            </p>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
              {label}
            </p>
          </div>
        ))}
      </section>

      {/* Bento: next trip + saved (compact preview) */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Next trip */}
        <div className="bg-card shadow-card overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg lg:col-span-2">
          <div className="flex h-full flex-col sm:flex-row">
            <div className="from-primary to-primary/70 relative aspect-video bg-linear-to-br sm:aspect-auto sm:w-2/5">
              {nextTrip?.image ? (
                <img
                  src={nextTrip.image}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : null}
              {nextTrip ? (
                <span className="bg-card/90 text-foreground absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
                  <CalendarClockIcon className="text-primary size-3.5" />
                  {nextTrip.countdown}
                </span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-6">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t.nextTrip.heading}
              </p>
              {nextTrip ? (
                <>
                  <p className="font-heading text-xl font-semibold">
                    {nextTrip.title}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <MapPinIcon className="size-4" />
                    {nextTrip.dateLabel}
                  </p>
                  <Button
                    render={<Link href="/account/bookings" />}
                    nativeButton={false}
                    className="group mt-1 w-fit gap-2"
                  >
                    {t.nextTrip.view}
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-heading text-xl font-semibold">
                    {t.nextTrip.noneTitle}
                  </p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {t.nextTrip.noneBody}
                  </p>
                  <Button
                    render={<Link href="/tours" />}
                    nativeButton={false}
                    className="mt-1 w-fit gap-2"
                  >
                    <CompassIcon className="size-4" />
                    {t.nextTrip.browse}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Saved for later — compact preview; full list lives at /account/saved */}
        <div className="bg-card shadow-card rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">
              {t.saved.heading}
            </h2>
            {stats.saved > 0 ? (
              <Link
                href="/account/saved"
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                {t.saved.viewAll(stats.saved)}
                <ArrowRightIcon className="size-3.5" />
              </Link>
            ) : (
              <Link
                href="/tours"
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                {t.saved.browse}
                <ArrowRightIcon className="size-3.5" />
              </Link>
            )}
          </div>
          {saved.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {saved.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/tours/${s.slug}`}
                    className="group flex items-center gap-3"
                  >
                    <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-lg">
                      {s.image ? (
                        <img
                          src={s.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                        {s.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t.saved.from(s.priceLabel)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm text-pretty">
              {t.saved.empty}
            </p>
          )}
        </div>
      </section>

      {/* Upcoming journeys (full width) */}
      {upcoming.length > 0 ? (
        <section className="bg-card shadow-card rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">
              {t.upcoming.heading}
            </h2>
            <Link
              href="/account/bookings"
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              {t.upcoming.viewAll}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y">
            {upcoming.map((row) => (
              <li key={row.code}>
                <Link
                  href={`/account/bookings/${row.code}`}
                  className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.dateLabel}
                    </p>
                  </div>
                  <span
                    className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${bookingStatusTone(
                      row.status,
                    )}`}
                  >
                    {row.status}
                  </span>
                  <span className="text-muted-foreground hidden font-mono text-xs sm:inline">
                    {row.code}
                  </span>
                  <ArrowRightIcon
                    className="text-muted-foreground size-4"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default AccountDashboard;
