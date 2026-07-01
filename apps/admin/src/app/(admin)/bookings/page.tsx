import { Receipt } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { BookingsFilters } from '../../../components/bookings/bookings-filters';
import { BookingsPagination } from '../../../components/bookings/bookings-pagination';
import { BookingsTable } from '../../../components/bookings/bookings-table';
import { DEFAULT_PAGE_SIZE, listBookings, type BookingList } from '../../../lib/bookings/data';
import type { BookingStatus } from '../../../lib/bookings/format';

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
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const page = parsePage(sp.page);
  const search = sp.q?.trim() ?? '';

  let result: BookingList | undefined;
  let error: string | null = null;
  try {
    result = await listBookings({ page, status, search: search || undefined });
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
        <BookingsFilters status={status ?? 'all'} search={search} />

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
            Couldn&apos;t load bookings: {error}. Check that the API is running and your admin session
            is valid.
          </div>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Receipt />
              </EmptyMedia>
              <EmptyTitle>No bookings found</EmptyTitle>
              <EmptyDescription>
                {status || search
                  ? 'Try a different status or clear the search to see them all.'
                  : 'Bookings will appear here as travellers reserve tours.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {meta ? (
              <p className="text-muted-foreground text-sm">
                {meta.total} {meta.total === 1 ? 'booking' : 'bookings'}
                {status ? ` · ${status.toLowerCase()}` : ''}
                {search ? ` · matching “${search}”` : ''}
              </p>
            ) : null}
            <BookingsTable rows={rows} />
            {meta && meta.totalPages > 1 ? (
              <BookingsPagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={meta.pageSize ?? DEFAULT_PAGE_SIZE}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
