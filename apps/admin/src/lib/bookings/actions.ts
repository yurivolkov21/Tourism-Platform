'use server';

import { revalidatePath } from 'next/cache';

import { apiErrorMessage } from '../api/error';
import { apiWrite } from '../api/client';

export interface RefundBookingState {
  error?: string;
}

export interface RefundBookingInput {
  reason?: string;
  amount?: number;
}

/**
 * Refunds a PAID booking (`POST /admin/bookings/:code/refund`) — the API issues the Stripe refund and
 * releases the held seats. `amount` is omitted for a full refund and set for a partial one. Returns a
 * friendly message on failure (400 `BOOKING_NOT_REFUNDABLE` / `REFUND_FAILED`) so the dialog can
 * surface it without leaving the page.
 */
export async function refundBooking(
  code: string,
  input: RefundBookingInput = {},
): Promise<RefundBookingState> {
  const reason = input.reason?.trim();
  const body: Record<string, unknown> = {};
  if (reason) body.reason = reason;
  if (input.amount !== undefined) body.amount = input.amount;

  try {
    await apiWrite('POST', `/api/v1/admin/bookings/${encodeURIComponent(code)}/refund`, body);
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${code}`);
  revalidatePath('/cancellation-requests');
  return {};
}
