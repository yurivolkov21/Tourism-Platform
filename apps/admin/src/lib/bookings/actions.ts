'use server';

import { revalidatePath } from 'next/cache';

import { apiErrorMessage } from '../api/error';
import { apiWrite } from '../api/client';

export interface RefundBookingState {
  error?: string;
}

/**
 * Refunds a PAID booking (`POST /admin/bookings/:code/refund`) — the API issues the Stripe refund and
 * releases the held seats. Returns a friendly message on failure (400 `BOOKING_NOT_REFUNDABLE` /
 * `REFUND_FAILED`) so the dialog can surface it without leaving the page.
 */
export async function refundBooking(code: string, reason?: string): Promise<RefundBookingState> {
  const trimmed = reason?.trim();
  try {
    await apiWrite(
      'POST',
      `/api/v1/admin/bookings/${encodeURIComponent(code)}/refund`,
      trimmed ? { reason: trimmed } : {},
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${code}`);
  return {};
}
