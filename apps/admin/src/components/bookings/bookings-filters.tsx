'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { Input, cn } from '@tourism/ui';

import type { BookingStatus } from '../../lib/bookings/format';

type TabValue = 'all' | BookingStatus;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Toolbar for the bookings list: status tabs + a debounced search box. Both write to the URL
 * (`?status=&q=&page=`) so filtering/pagination happen **server-side** on the next navigation. Any
 * filter change resets to page 1. Counts live on the server (the current-page total), so tabs are
 * plain toggles here.
 */
export function BookingsFilters({
  status,
  search,
}: {
  status: TabValue;
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const firstRender = useRef(true);

  /** Build the next URL from a partial change, always resetting `page`. */
  const pushWith = (changes: { status?: TabValue; q?: string }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.status !== undefined) {
      if (changes.status === 'all') next.delete('status');
      else next.set('status', changes.status);
    }
    if (changes.q !== undefined) {
      if (changes.q.trim()) next.set('q', changes.q.trim());
      else next.delete('q');
    }
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // Debounce the search box → URL. Skip the initial mount so we don't re-push on load.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (query !== search) pushWith({ q: query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="tablist"
        className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
      >
        {TABS.map((t) => {
          const active = t.value === status;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pushWith({ status: t.value })}
              className={cn(
                'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, name, or email…"
          aria-label="Search bookings"
          className="bg-background pl-8"
        />
      </div>
    </div>
  );
}

export default BookingsFilters;
