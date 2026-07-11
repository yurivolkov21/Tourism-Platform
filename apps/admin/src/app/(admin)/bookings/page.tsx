import Link from 'next/link';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import {
  BookingsFilters,
  type DepartureFilterOption,
  type TourFilterOption,
} from '../../../components/bookings/bookings-filters';
import { BookingsTable } from '../../../components/bookings/bookings-table';
import { listBookings, type BookingList } from '../../../lib/bookings/data';
import type { BookingStatus } from '../../../lib/bookings/format';
import { listDepartures } from '../../../lib/departures/data';
import { toDateOnly } from '../../../lib/departures/format';
import { listTours } from '../../../lib/tours/data';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { ServerTablePagination } from '../../../components/crud/server-table-pagination';
import { parsePageSize } from '../../../lib/pagination';
import { parseUuidParam } from '../../../lib/params';

const STATUSES: BookingStatus[] = ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'];

/** Narrows a raw `?status=` value to a valid enum member (or undefined = all). */
function parseStatus(raw?: string): BookingStatus | undefined {
  return STATUSES.find((s) => s === raw);
}

/** Narrows a raw `?page=` value to a positive integer (defaults to 1). */
function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface BookingsPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    q?: string;
    pageSize?: string;
    userId?: string;
    tourId?: string;
    departureId?: string;
  }>;
}

export default async function BookingsPage({
  searchParams,
}: BookingsPageProps) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const search = sp.q?.trim() ?? '';
  const userId = parseUuidParam(sp.userId);
  const tourId = parseUuidParam(sp.tourId);
  const departureId = parseUuidParam(sp.departureId);

  let result: BookingList | undefined;
  let error: string | null = null;
  let tourOptions: (TourFilterOption & { slug: string })[] = [];
  try {
    // Parallel reads (transaction-pooler rule) — the tour options are a
    // best-effort extra: if the catalog read fails, the scoping dropdowns just
    // don't render and the bookings list still works.
    const [bookings, tours] = await Promise.all([
      listBookings({
        page,
        pageSize,
        status,
        search: search || undefined,
        userId,
        tourId,
        departureId,
      }),
      listTours({ pageSize: 100 }).catch(() => undefined),
    ]);
    result = bookings;
    tourOptions = (tours?.data ?? [])
      .map((t) => ({ id: t.id, slug: t.slug, title: t.title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (e) {
    error = apiErrorMessage(e);
  }

  // Departure options exist only within the selected tour — resolved after the
  // catalog read because the API addresses departures by tour slug.
  const selectedTour = tourId
    ? tourOptions.find((t) => t.id === tourId)
    : undefined;
  let departureOptions: DepartureFilterOption[] = [];
  if (selectedTour) {
    const departures = await listDepartures(selectedTour.slug).catch(() => []);
    departureOptions = departures.map((d) => ({
      id: d.id,
      label:
        d.status === 'OPEN'
          ? toDateOnly(d.startDate)
          : `${toDateOnly(d.startDate)} · ${d.status.toLowerCase()}`,
    }));
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Bookings"
        description="Every reservation across all tours. Filter by status or search a code, name, or email; open one to view details or issue a refund."
      />

      <div className="flex flex-col gap-4">
        {userId ? (
          <p className="text-muted-foreground text-sm">
            Showing bookings for one customer —{' '}
            <Link href="/bookings" className="text-primary hover:underline">
              Clear filter
            </Link>
          </p>
        ) : null}

        {error ? (
          <>
            <BookingsFilters
              status={status ?? 'all'}
              search={search}
              tourId={tourId}
              departureId={departureId}
              tours={tourOptions}
              departures={departureOptions}
            />
            <ErrorAlert>
              Couldn&apos;t load bookings: {error}. Check that the API is
              running and your admin session is valid.
            </ErrorAlert>
          </>
        ) : (
          <>
            <BookingsTable
              rows={rows}
              status={status ?? 'all'}
              search={search}
              tourId={tourId}
              departureId={departureId}
              tours={tourOptions}
              departures={departureOptions}
              filtered={Boolean(
                status || search || userId || tourId || departureId,
              )}
            />
            {rows.length > 0 && meta ? (
              <ServerTablePagination
                page={meta.page}
                pageCount={meta.totalPages}
                total={meta.total}
                pageSize={meta.pageSize}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
