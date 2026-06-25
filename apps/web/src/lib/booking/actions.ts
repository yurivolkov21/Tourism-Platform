'use server';

import { redirect } from 'next/navigation';
import { ApiRequestError, type components } from '@tourism/core';
import { messages } from '@tourism/i18n';

import { getAuthedApiClient } from '../api/authed-client';
import { buildCreateBookingPayload, type BookingFormError } from './booking-form';

type CreateBookingBody = components['schemas']['CreateBookingDto'];
type BookingDto = components['schemas']['BookingDto'];
type CheckoutSessionDto = components['schemas']['CheckoutSessionDto'];

const errors = messages.booking.errors;

export interface BookingActionState {
  error?: string;
}

/** Maps a form/API error code to friendly EN; unknown codes fall back to the generic message. */
function errorMessage(code: BookingFormError | string): string {
  return (errors as Record<string, string>)[code] ?? errors.generic;
}

/** Reads the booking code out of the (enveloped) create response. */
function bookingCodeOf(data: unknown): string | undefined {
  return (data as { data?: BookingDto } | undefined)?.data?.code;
}

/** Reads the checkout URL out of the (enveloped) checkout response. */
function checkoutUrlOf(data: unknown): string | undefined {
  return (data as { data?: CheckoutSessionDto } | undefined)?.data?.checkoutUrl;
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
    const api = await getAuthedApiClient();
    const created = await api.POST('/api/v1/bookings', {
      body: built.payload as CreateBookingBody,
    });
    const code = bookingCodeOf(created.data);
    if (created.error || !code) return { error: errors.generic };

    const checkout = await api.POST('/api/v1/bookings/{code}/checkout', {
      params: { path: { code } },
    });
    checkoutUrl = checkoutUrlOf(checkout.data);
    if (checkout.error || !checkoutUrl) return { error: errors.CHECKOUT_FAILED };
  } catch (e) {
    const code = e instanceof ApiRequestError ? e.code : '';
    return { error: errorMessage(code) };
  }

  redirect(checkoutUrl);
}

/**
 * Captures an approved PayPal order on buyer return (`POST /bookings/{code}/capture`). Idempotent on
 * the API (an already-PAID booking is a no-op), so the success page can call it whenever a PayPal
 * booking is still PENDING. Returns `true` when the call succeeded (the page then re-reads the booking).
 */
export async function captureBooking(code: string): Promise<boolean> {
  try {
    const api = await getAuthedApiClient();
    const { error } = await api.POST('/api/v1/bookings/{code}/capture', {
      params: { path: { code } },
    });
    return !error;
  } catch {
    return false;
  }
}
