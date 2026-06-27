import Link from 'next/link';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CompassIcon,
  HeartIcon,
  MapPinIcon,
  SettingsIcon,
  TicketIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { SignOutButton } from '../auth/sign-out-button';

export interface DashboardNextTrip {
  title: string;
  slug: string;
  dateLabel: string;
  countdown: string;
  code: string;
}

export interface AccountDashboardProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  memberSince: string;
  stats: { trips: number; upcoming: number; completed: number; wishlist: number };
  nextTrip: DashboardNextTrip | null;
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  return source.slice(0, 1).toUpperCase();
}

export function AccountDashboard({
  name,
  email,
  avatarUrl,
  memberSince,
  stats,
  nextTrip,
}: AccountDashboardProps) {
  const t = messages.auth.account.dashboard;
  const displayName = name.trim() || email.split('@')[0];

  const statCards: { key: keyof typeof stats; label: string; value: number; icon: LucideIcon }[] = [
    { key: 'trips', label: t.stats.trips, value: stats.trips, icon: TicketIcon },
    { key: 'upcoming', label: t.stats.upcoming, value: stats.upcoming, icon: CalendarClockIcon },
    { key: 'completed', label: t.stats.completed, value: stats.completed, icon: CheckCircle2Icon },
    { key: 'wishlist', label: t.stats.wishlist, value: stats.wishlist, icon: HeartIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header card: brand cover banner + overlapping avatar + identity */}
      <section className="bg-card shadow-card overflow-hidden rounded-2xl border">
        <div className="from-primary via-primary to-primary/65 relative h-32 bg-linear-to-br sm:h-40">
          <span className="text-primary-foreground/85 absolute top-4 right-5 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <CompassIcon className="size-3.5" />
            {t.traveller}
          </span>
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="bg-muted ring-card size-24 shrink-0 overflow-hidden rounded-2xl ring-4 sm:size-28">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
                ) : (
                  <span className="text-muted-foreground flex size-full items-center justify-center text-3xl font-semibold">
                    {initials(name, email)}
                  </span>
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                  {t.greeting(displayName)}
                </h1>
                <p className="text-muted-foreground text-sm">{email}</p>
                <p className="text-muted-foreground/80 mt-1 text-xs">{t.memberSince(memberSince)}</p>
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
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className="bg-card shadow-card rounded-xl border p-4 sm:p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Icon className="text-primary size-4" />
              {label}
            </div>
            <p className="font-heading mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {/* Next trip + quick links */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="bg-card shadow-card rounded-2xl border p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t.nextTrip.heading}
          </h2>
          {nextTrip ? (
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading text-xl font-semibold">{nextTrip.title}</p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                  <MapPinIcon className="size-4" />
                  {nextTrip.dateLabel}
                </p>
                <span className="bg-primary/10 text-primary mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
                  <CalendarClockIcon className="size-3.5" />
                  {nextTrip.countdown}
                </span>
              </div>
              <Button
                render={<Link href="/account/bookings" />}
                nativeButton={false}
                className="group gap-2"
              >
                {t.nextTrip.view}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{t.nextTrip.noneTitle}</p>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">
                  {t.nextTrip.noneBody}
                </p>
              </div>
              <Button
                render={<Link href="/tours" />}
                nativeButton={false}
                className="group shrink-0 gap-2"
              >
                <CompassIcon className="size-4" />
                {t.nextTrip.browse}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-card shadow-card flex flex-col gap-2 rounded-2xl border p-5 sm:p-6">
          <Link
            href="/account/bookings"
            className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
          >
            <TicketIcon className="text-primary size-5" />
            <span className="text-sm font-medium">{t.links.bookings}</span>
            <ArrowRightIcon className="text-muted-foreground ml-auto size-4" />
          </Link>
          <Link
            href="/account/profile"
            className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
          >
            <SettingsIcon className="text-primary size-5" />
            <span className="text-sm font-medium">{t.links.settings}</span>
            <ArrowRightIcon className="text-muted-foreground ml-auto size-4" />
          </Link>
          <div className="mt-auto border-t pt-3">
            <SignOutButton />
          </div>
        </div>
      </section>
    </div>
  );
}

export default AccountDashboard;
