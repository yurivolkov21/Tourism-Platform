'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ApiRequestError } from '@tourism/core';
import { messages } from '@tourism/i18n';

import { syncUser } from '../auth/sync-user';
import {
  cancelBooking,
  captureBookingOrder,
  createBooking,
  requestBookingCancellation,
  startCheckout,
  type BookingDto,
} from '../api/booking';
import { buildCreateBookingPayload, type BookingFormError } from './booking-form';
import type { CreateBookingPayload } from './booking-form';
import { buildCancellationRequestBody } from './cancellation-request';

const errors = messages.booking.errors;

export interface BookingActionState {
  error?: string;
}

/** Maps a form/API error code to friendly EN; unknown codes fall back to the generic message. */
function errorMessage(code: BookingFormError | string): string {
  return (errors as Record<string, string>)[code] ?? errors.generic;
}

/**
 * Create a booking, self-healing the first-booking race: if the API reports the caller isn't mirrored
 * yet (`USER_NOT_SYNCED`), mirror the user (`/auth/sync`) and retry once. This covers a signed-in
 * session whose sign-in sync hadn't landed, so the buyer never has to sign out and back in.
 */
async function createBookingWithSync(payload: CreateBookingPayload): Promise<BookingDto> {
  try {
    return await createBooking(payload);
  } catch (e) {
    if (e instanceof ApiRequestError && (e.code === 'USER_NOT_SYNCED' || e.status === 401)) {
      // First-booking race: the sign-in mirror hadn't landed. Mirror now, retry once.
      const synced = await syncUser();
      if (synced) return await createBooking(payload);
    }
    throw e;
  }
}

/**
 * Server action behind the booking form: validate → `POST /bookings` (PENDING) →
 * `POST /bookings/{code}/checkout` → redirect the browser to the gateway's `checkoutUrl`.
 * The `redirect()` runs *after* the try (it throws `NEXT_REDIRECT` by design); API failures are
 * mapped to a friendly message returned in the action state. Login is enforced upstream (page +
 * proxy), but a missing token still surfaces as a generic error here.
 */
export async function createAndCheckout(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const built = buildCreateBookingPayload({
    tourSlug: String(formData.get('tourSlug') ?? ''),
    departureId: String(formData.get('departureId') ?? ''),
    numAdults: String(formData.get('numAdults') ?? ''),
    numChildren: String(formData.get('numChildren') ?? ''),
    paymentProvider: String(formData.get('paymentProvider') ?? ''),
    contactName: String(formData.get('contactName') ?? ''),
    contactEmail: String(formData.get('contactEmail') ?? ''),
    contactPhone: String(formData.get('contactPhone') ?? ''),
    specialRequests: String(formData.get('specialRequests') ?? ''),
  });
  if (!built.ok) return { error: errorMessage(built.error) };

  let checkoutUrl: string | undefined;
  try {
    const booking = await createBookingWithSync(built.payload);
    if (!booking?.code) {
      console.error('[booking] create returned no code', { booking });
      return { error: errors.generic };
    }

    const session = await startCheckout(booking.code);
    checkoutUrl = session?.checkoutUrl;
    if (!checkoutUrl) {
      console.error('[booking] checkout returned no url', { code: booking.code });
      return { error: errors.CHECKOUT_FAILED };
    }
  } catch (e) {
    // Surface the real API failure server-side (never silently swallow) — the user still gets a
    // friendly message, but the logs carry the actual error code + HTTP status for diagnosis.
    if (e instanceof ApiRequestError) {
      console.error('[booking] createAndCheckout failed', {
        code: e.code,
        status: e.status,
        message: e.message,
      });
      return { error: errorMessage(e.code) };
    }
    console.error('[booking] createAndCheckout unexpected error', e);
    return { error: errors.generic };
  }

  redirect(checkoutUrl);
}

/**
 * Captures an approved PayPal order on buyer return (`POST /bookings/{code}/capture`). Idempotent on
 * the API (an already-PAID booking is a no-op), so the success page can call it whenever a PayPal
 * booking is still PENDING. Returns `true` when the call succeeded (the page then re-reads the booking).
 */
/** Cancel the caller's own PENDING booking, then revalidate the detail + list. */
export async function cancelBookingAction(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await cancelBooking(code);
    revalidatePath(`/account/bookings/${code}`);
    revalidatePath('/account/bookings');
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      console.error('[booking] cancel failed', { code, apiCode: e.code, status: e.status });
      return { ok: false, error: errorMessage(e.code) };
    }
    console.error('[booking] cancel unexpected error', e);
    return { ok: false, error: errors.generic };
  }
}

/** Request cancellation/refund of the caller's own PAID booking, then revalidate the detail + list. */
export async function requestCancellationAction(
  code: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requestBookingCancellation(code, buildCancellationRequestBody(reason));
    revalidatePath(`/account/bookings/${code}`);
    revalidatePath('/account/bookings');
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      console.error('[booking] cancellation request failed', { code, apiCode: e.code, status: e.status });
      return { ok: false, error: errorMessage(e.code) };
    }
    console.error('[booking] cancellation request unexpected error', e);
    return { ok: false, error: errors.generic };
  }
}

/** "Pay now" for a PENDING booking: start a checkout session → redirect to the gateway. */
export async function payNowAction(code: string): Promise<BookingActionState> {
  let checkoutUrl: string | undefined;
  try {
    const session = await startCheckout(code);
    checkoutUrl = session?.checkoutUrl;
    if (!checkoutUrl) return { error: errors.CHECKOUT_FAILED };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      console.error('[booking] payNow failed', { code, apiCode: e.code, status: e.status });
      return { error: errorMessage(e.code) };
    }
    console.error('[booking] payNow unexpected error', e);
    return { error: errors.generic };
  }
  redirect(checkoutUrl);
}

export async function captureBooking(code: string): Promise<boolean> {
  try {
    await captureBookingOrder(code);
    return true;
  } catch (e) {
    console.error('[booking] capture failed', {
      code,
      ...(e instanceof ApiRequestError ? { apiCode: e.code, status: e.status } : {}),
    });
    return false;
  }
}
