'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarRange, Map, Search, X } from 'lucide-react';

import { Badge, Input, cn } from '@tourism/ui';

import { FacetFilter } from '../crud/facet-filter';
import type { BookingStatus } from '../../lib/bookings/format';

type TabValue = 'all' | BookingStatus;

export interface TourFilterOption {
  id: string;
  title: string;
}

export interface DepartureFilterOption {
  id: string;
  /** Ready-to-render label (start date, plus status when not OPEN). */
  label: string;
}

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Toolbar for the bookings list: status tabs + tour/departure scoping + a debounced search box.
 * Everything writes to the URL (`?status=&tourId=&departureId=&q=&page=`) so filtering/pagination
 * happen **server-side** on the next navigation. Any filter change resets to page 1; changing the
 * tour clears the departure (departures belong to one tour). Counts live on the server (the
 * current-page total), so tabs are plain toggles here. Active tour/departure filters render as
 * removable chips so a deep-linked view stays legible.
 */
export function BookingsFilters({
  status,
  search,
  tourId,
  departureId,
  tours = [],
  departures = [],
  trailing,
  statusCounts,
}: {
  status: TabValue;
  search: string;
  /** Currently applied `?tourId=` (validated server-side). */
  tourId?: string;
  /** Currently applied `?departureId=`. */
  departureId?: string;
  /** Tour options for the scoping dropdown (empty = hide the dropdown, e.g. catalog fetch failed). */
  tours?: TourFilterOption[];
  /** Departures of the selected tour (empty until a tour is chosen). */
  departures?: DepartureFilterOption[];
  /** Toolbar extras rendered after the search box (e.g. the Columns menu) — one row, catalog-style. */
  trailing?: ReactNode;
  /** Per-status totals within the current scope (server-computed) — renders a count badge per tab
   * when present; the All tab shows the sum. Undefined (groupBy failed) = plain tabs, no badges. */
  statusCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const firstRender = useRef(true);

  /** Build the next URL from a partial change (`null` deletes), always resetting `page`. */
  const pushWith = (changes: {
    status?: TabValue;
    q?: string;
    tourId?: string | null;
    departureId?: string | null;
  }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.status !== undefined) {
      if (changes.status === 'all') next.delete('status');
      else next.set('status', changes.status);
    }
    if (changes.q !== undefined) {
      if (changes.q.trim()) next.set('q', changes.q.trim());
      else next.delete('q');
    }
    if (changes.tourId !== undefined) {
      if (changes.tourId) next.set('tourId', changes.tourId);
      else next.delete('tourId');
      // A departure only makes sense within its tour.
      next.delete('departureId');
    }
    if (changes.departureId !== undefined) {
      if (changes.departureId) next.set('departureId', changes.departureId);
      else next.delete('departureId');
    }
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const selectedTour = tourId ? tours.find((t) => t.id === tourId) : undefined;
  const selectedDeparture = departureId
    ? departures.find((d) => d.id === departureId)
    : undefined;

  // Keep the input in sync when the URL changes underneath it (back/forward).
  useEffect(() => {
    setQuery(search);
  }, [search]);

  // Debounce the search box → URL. Skip the initial mount so we don't re-push
  // on load. `params` is in the deps so a tab/filter navigation rebuilds the
  // pending timer with a fresh URL snapshot — a stale closure here would push
  // a URL that silently drops the just-applied filter.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      if (query !== search) pushWith({ q: query });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, search, params]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
        >
          {TABS.map((t) => {
            const active = t.value === status;
            const count = statusCounts
              ? t.value === 'all'
                ? Object.values(statusCounts).reduce((sum, n) => sum + n, 0)
                : (statusCounts[t.value] ?? 0)
              : undefined;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pushWith({ status: t.value })}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'hover:text-foreground',
                )}
              >
                {t.label}
                {count !== undefined ? (
                  <Badge variant="secondary" className="px-1.5 tabular-nums">
                    {count}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {tours.length > 0 ? (
            <>
              <FacetFilter
                label="Filter by tour"
                icon={Map}
                triggerLabel={
                  selectedTour?.title ??
                  (tourId ? 'Selected tour' : 'All tours')
                }
                options={tours.map((t) => ({ value: t.id, label: t.title }))}
                selected={tourId ? [tourId] : []}
                onToggle={(value, checked) =>
                  pushWith({ tourId: checked ? value : null })
                }
                onClear={() => pushWith({ tourId: null })}
                contentClassName="max-h-80 w-72 overflow-y-auto"
              />
              <FacetFilter
                label="Filter by departure"
                icon={CalendarRange}
                triggerLabel={
                  selectedDeparture?.label ??
                  (departureId
                    ? 'Selected departure'
                    : tourId
                      ? 'All departures'
                      : 'Pick a tour first')
                }
                options={departures.map((d) => ({
                  value: d.id,
                  label: d.label,
                }))}
                selected={departureId ? [departureId] : []}
                disabled={!tourId || departures.length === 0}
                onToggle={(value, checked) =>
                  pushWith({ departureId: checked ? value : null })
                }
                onClear={() => pushWith({ departureId: null })}
                contentClassName="max-h-80 w-64 overflow-y-auto"
              />
            </>
          ) : null}
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
          {trailing}
        </div>
      </div>

      {tourId || departureId ? (
        <div className="flex flex-wrap items-center gap-2">
          {tourId ? (
            <Badge variant="outline" className="gap-1 pr-1">
              {selectedTour?.title ?? 'Selected tour'}
              <button
                type="button"
                aria-label="Clear tour filter"
                className="hover:text-destructive inline-flex cursor-pointer items-center"
                onClick={() => pushWith({ tourId: null })}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
          {departureId ? (
            <Badge variant="outline" className="gap-1 pr-1">
              {selectedDeparture?.label ?? 'Selected departure'}
              <button
                type="button"
                aria-label="Clear departure filter"
                className="hover:text-destructive inline-flex cursor-pointer items-center"
                onClick={() => pushWith({ departureId: null })}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default BookingsFilters;
