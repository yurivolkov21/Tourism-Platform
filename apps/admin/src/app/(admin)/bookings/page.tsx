import Link from 'next/link';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { BookingsFilters } from '../../../components/bookings/bookings-filters';
import { BookingsTable } from '../../../components/bookings/bookings-table';
import { listBookings, type BookingList } from '../../../lib/bookings/data';
import type { BookingStatus } from '../../../lib/bookings/format';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { ServerTablePagination } from '../../../components/crud/server-table-pagination';
import { parsePageSize } from '../../../lib/pagination';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Narrows a raw `?userId=` to a uuid (anything else = ignore the filter, avoid API 400s). */
function parseUserId(raw?: string): string | undefined {
  return raw && UUID_RE.test(raw) ? raw : undefined;
}

interface BookingsPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    q?: string;
    pageSize?: string;
    userId?: string;
  }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const search = sp.q?.trim() ?? '';
  const userId = parseUserId(sp.userId);

  let result: BookingList | undefined;
  let error: string | null = null;
  try {
    result = await listBookings({ page, pageSize, status, search: search || undefined, userId });
  } catch (e) {
    error = apiErrorMessage(e);
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
            <BookingsFilters status={status ?? 'all'} search={search} />
            <ErrorAlert>
              Couldn&apos;t load bookings: {error}. Check that the API is running and your admin
              session is valid.
            </ErrorAlert>
          </>
        ) : (
          <>
            <BookingsTable
              rows={rows}
              status={status ?? 'all'}
              search={search}
              filtered={Boolean(status || search || userId)}
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
