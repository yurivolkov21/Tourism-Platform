import { getApiClient } from '../api/client';

export type BookingRowStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

/** Flattened booking row for the dashboard data-table (from `GET /admin/bookings`). */
export interface AdminBookingRow {
  code: string;
  status: BookingRowStatus;
  totalAmount: string;
  currency: string;
  contactName: string;
  travellers: number;
  createdAt: string;
  tourTitle: string;
  tourSlug: string;
}

interface ApiBooking {
  code?: string;
  status?: string;
  totalAmount?: string;
  currency?: string;
  contactName?: string;
  numAdults?: number;
  numChildren?: number;
  createdAt?: string;
  tour?: { slug?: string; title?: string };
}

/**
 * Recent bookings for the dashboard table. The admin list endpoint returns the paginated
 * `{ data: BookingDto[], meta }` envelope (matches the typed body), so rows are at `.data`.
 */
export async function getRecentBookings(
  limit = 50,
): Promise<AdminBookingRow[]> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/bookings', {
    params: { query: { page: 1, pageSize: limit } },
  });
  const rows = (data as unknown as { data?: ApiBooking[] }).data ?? [];
  return rows.map((b) => ({
    code: String(b.code ?? ''),
    status: (b.status as BookingRowStatus) ?? 'PENDING',
    totalAmount: String(b.totalAmount ?? '0'),
    currency: String(b.currency ?? 'USD'),
    contactName: String(b.contactName ?? ''),
    travellers: Number(b.numAdults ?? 0) + Number(b.numChildren ?? 0),
    createdAt: String(b.createdAt ?? ''),
    tourTitle: String(b.tour?.title ?? ''),
    tourSlug: String(b.tour?.slug ?? ''),
  }));
}
