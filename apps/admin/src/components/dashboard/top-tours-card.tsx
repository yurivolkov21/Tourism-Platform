'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Star } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@tourism/ui';

import { formatMoney } from '../../lib/dashboard/transforms';
import type { DashboardStats } from '../../lib/dashboard/stats';

type TabKey = 'revenue' | 'rating' | 'wishlist';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'rating', label: 'Rating' },
  { key: 'wishlist', label: 'Wishlisted' },
];

function RowShell({ slug, title, right }: { slug: string; title: string; right: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 text-sm">
      <Link
        href={`/tours/${slug}`}
        title={title}
        className="hover:text-primary min-w-0 truncate font-medium hover:underline"
      >
        {title}
      </Link>
      <span className="text-muted-foreground shrink-0 tabular-nums">{right}</span>
    </li>
  );
}

/** Top-5 tours, tabbed across the three rankings the stats endpoint returns. */
export function TopToursCard({
  byRevenue,
  byRating,
  byWishlist,
  currency,
}: {
  byRevenue: DashboardStats['topToursByRevenue'];
  byRating: DashboardStats['topToursByRating'];
  byWishlist: DashboardStats['topToursByWishlist'];
  currency: string;
}) {
  const [tab, setTab] = useState<TabKey>('revenue');

  const empty = <p className="text-muted-foreground py-4 text-center text-sm">No data yet.</p>;

  const activeIndex = TABS.findIndex((t) => t.key === tab);

  function handleTablistKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (activeIndex + direction + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];
    setTab(nextTab.key);
    document.getElementById(`top-tours-tab-${nextTab.key}`)?.focus();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top tours</CardTitle>
        <CardDescription>Best performers across the catalog.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="tablist"
          onKeyDown={handleTablistKeyDown}
          className="bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg p-1"
        >
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                id={`top-tours-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="top-tours-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex h-6 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                  isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div id="top-tours-panel" role="tabpanel" aria-labelledby={`top-tours-tab-${tab}`}>
          {tab === 'revenue' &&
            (byRevenue.length ? (
              <ul className="space-y-2.5">
                {byRevenue.map((t) => (
                  <RowShell
                    key={t.tourId}
                    slug={t.slug}
                    title={t.title}
                    right={`${formatMoney(t.revenue, currency)} · ${t.bookingsCount} bookings`}
                  />
                ))}
              </ul>
            ) : (
              empty
            ))}
          {tab === 'rating' &&
            (byRating.length ? (
              <ul className="space-y-2.5">
                {byRating.map((t) => (
                  <RowShell
                    key={t.tourId}
                    slug={t.slug}
                    title={t.title}
                    right={
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3 fill-current text-amber-500" aria-hidden />
                        {t.averageRating.toFixed(1)} · {t.reviewsCount} reviews
                      </span>
                    }
                  />
                ))}
              </ul>
            ) : (
              empty
            ))}
          {tab === 'wishlist' &&
            (byWishlist.length ? (
              <ul className="space-y-2.5">
                {byWishlist.map((t) => (
                  <RowShell
                    key={t.tourId}
                    slug={t.slug}
                    title={t.title}
                    right={`${t.wishlistCount} saves`}
                  />
                ))}
              </ul>
            ) : (
              empty
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TopToursCard;
