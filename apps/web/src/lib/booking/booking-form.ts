/**
 * Pure mapper from the booking form's raw fields to the `POST /bookings` body
 * (`CreateBookingDto`): trim strings, coerce party sizes to ints, drop empty
 * optionals, and validate (party size 1–20 / children 0–20, gateway enum,
 * contact). The API re-validates fully — this gives the form a fast, friendly
 * client-side guard and a typed payload. Returns a discriminated result so the
 * server action can map an `error` code to localized copy.
 */

export type PaymentProvider = 'STRIPE' | 'PAYPAL';

export interface CreateBookingPayload {
  tourSlug: string;
  departureId: string;
  numAdults: number;
  numChildren?: number;
  paymentProvider: PaymentProvider;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
}

export interface BookingFormRaw {
  tourSlug: string;
  departureId: string;
  numAdults: string | number;
  numChildren?: string | number;
  paymentProvider: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
}

/** Stable error codes; the server action maps each to `messages.booking.errors`. */
export type BookingFormError =
  | 'MISSING_TOUR'
  | 'MISSING_DEPARTURE'
  | 'INVALID_PARTY_SIZE'
  | 'INVALID_PROVIDER'
  | 'INVALID_CONTACT';

export type BuildBookingResult =
  | { ok: true; payload: CreateBookingPayload }
  | { ok: false; error: BookingFormError };

const MAX_PARTY = 20;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Coerce a raw count to an int, or NaN when unparseable. */
function asInt(value: string | number | undefined): number {
  if (typeof value === 'number') return Math.trunc(value);
  return Number.parseInt(String(value ?? '').trim(), 10);
}

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function buildCreateBookingPayload(raw: BookingFormRaw): BuildBookingResult {
  const tourSlug = raw.tourSlug?.trim() ?? '';
  if (!tourSlug) return { ok: false, error: 'MISSING_TOUR' };

  const departureId = raw.departureId?.trim() ?? '';
  if (!departureId) return { ok: false, error: 'MISSING_DEPARTURE' };

  const numAdults = asInt(raw.numAdults);
  const numChildren = raw.numChildren === undefined ? 0 : asInt(raw.numChildren);
  const adultsOk = Number.isInteger(numAdults) && numAdults >= 1 && numAdults <= MAX_PARTY;
  const childrenOk =
    Number.isInteger(numChildren) && numChildren >= 0 && numChildren <= MAX_PARTY;
  if (!adultsOk || !childrenOk) return { ok: false, error: 'INVALID_PARTY_SIZE' };

  if (raw.paymentProvider !== 'STRIPE' && raw.paymentProvider !== 'PAYPAL') {
    return { ok: false, error: 'INVALID_PROVIDER' };
  }

  const contactName = raw.contactName?.trim() ?? '';
  const contactEmail = raw.contactEmail?.trim() ?? '';
  if (contactName.length < 2 || !isValidEmail(contactEmail)) {
    return { ok: false, error: 'INVALID_CONTACT' };
  }

  const payload: CreateBookingPayload = {
    tourSlug,
    departureId,
    numAdults,
    paymentProvider: raw.paymentProvider,
    contactName,
    contactEmail,
  };
  if (numChildren > 0) payload.numChildren = numChildren;
  const phone = clean(raw.contactPhone);
  if (phone) payload.contactPhone = phone;
  const requests = clean(raw.specialRequests);
  if (requests) payload.specialRequests = requests;

  return { ok: true, payload };
}
