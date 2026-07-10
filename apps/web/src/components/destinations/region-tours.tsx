'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourTile } from '../tours/tour-tile';
import type { TourCardData } from '../tours/tour-card';
import { pageNumbers, pageView } from '../../lib/paginate';

const CHIP =
  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors';
const CHIP_OFF =
  'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30';
const CHIP_ON_DEFAULT = 'border-primary bg-primary text-primary-foreground';

/** Two full desktop rows (the grid is 4-wide) — keeps the landing tidy without endless scroll. */
const REGION_PAGE_SIZE = 8;

/** Region tours: a destination tab bar filtering an image-poster tour grid, paginated 8 per page.
 * `chipOn` themes the active tab. */
export function RegionTours({
  destinations,
  tours,
  chipOn = CHIP_ON_DEFAULT,
}: {
  destinations: { name: string; slug: string }[];
  tours: TourCardData[];
  chipOn?: string;
}) {
  const t = messages.regionPage;
  const [active, setActive] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Pre-select a tab from `?d=<destination-slug>` on mount (keeps the page statically rendered).
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('d');
    const name = destinations.find((d) => d.slug === slug)?.name;
    if (name) setActive(name);
  }, [destinations]);

  const filtered = useMemo(
    () =>
      active === 'all'
        ? tours
        : tours.filter((tr) => tr.destination === active),
    [active, tours],
  );

  const view = pageView(filtered.length, page, REGION_PAGE_SIZE);
  const visible = filtered.slice(
    (view.page - 1) * REGION_PAGE_SIZE,
    view.page * REGION_PAGE_SIZE,
  );

  // Keep local state in sync with the clamped page (e.g. after the result set shrinks).
  useEffect(() => {
    if (view.page !== page) setPage(view.page);
  }, [view.page, page]);

  // Switching tab resets to the first page.
  const selectTab = (name: string) => {
    setActive(name);
    setPage(1);
  };

  const go = (target: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    if (target >= 1 && target <= view.totalPages && target !== view.page)
      setPage(target);
  };
  const isFirst = view.page <= 1;
  const isLast = view.page >= view.totalPages;
  const disabled = 'pointer-events-none opacity-40';

  return (
    <section className="bg-muted/40 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-6 text-2xl font-semibold text-balance md:text-3xl">
          {t.toursHeading}
        </h2>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectTab('all')}
            className={cn(CHIP, active === 'all' ? chipOn : CHIP_OFF)}
          >
            {t.allTab}
          </button>
          {destinations.map((d) => (
            <button
              type="button"
              key={d.slug}
              onClick={() => selectTab(d.name)}
              className={cn(CHIP, active === d.name ? chipOn : CHIP_OFF)}
            >
              {d.name}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {visible.map((tour) => (
                <TourTile key={tour.slug} tour={tour} />
              ))}
            </div>

            {view.totalPages > 1 ? (
              <Pagination className="mt-10 w-fit max-sm:mx-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      aria-label="Go to previous page"
                      aria-disabled={isFirst || undefined}
                      tabIndex={isFirst ? -1 : undefined}
                      size="icon"
                      className={cn('rounded-full', isFirst && disabled)}
                      onClick={go(view.page - 1)}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </PaginationLink>
                  </PaginationItem>

                  {pageNumbers(view.totalPages, view.page).map((p, i) =>
                    p === 'ellipsis' ? (
                      <PaginationItem key={`e${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === view.page}
                          className="rounded-full"
                          onClick={go(p)}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      aria-label="Go to next page"
                      aria-disabled={isLast || undefined}
                      tabIndex={isLast ? -1 : undefined}
                      size="icon"
                      className={cn('rounded-full', isLast && disabled)}
                      onClick={go(view.page + 1)}
                    >
                      <ChevronRightIcon className="size-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-pretty">{t.noTours}</p>
        )}
      </div>
    </section>
  );
}

export default RegionTours;
