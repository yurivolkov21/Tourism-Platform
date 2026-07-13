'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiErrorMessage } from '../api/error';
import { apiWrite, getApiClient } from '../api/client';
import { flashPath } from '../flash';
import { departureSchema, toDeparturePayload } from './schema';

export interface DepartureFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function opt(formData: FormData, key: string): string | undefined {
  const v = String(formData.get(key) ?? '').trim();
  return v === '' ? undefined : v;
}

/** Validates raw form fields against `departureSchema`. */
function parseDepartureForm(formData: FormData) {
  return departureSchema.safeParse({
    startDate: String(formData.get('startDate') ?? ''),
    endDate: String(formData.get('endDate') ?? ''),
    seatsTotal: opt(formData, 'seatsTotal'),
    priceOverride: opt(formData, 'priceOverride'),
    compareAtPrice: opt(formData, 'compareAtPrice'),
    status: opt(formData, 'status'),
  });
}

function toFieldErrors(error: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Creates a departure (`POST /admin/tours/:slug/departures`); maps 400 (bad dates) to a message. */
export async function createDeparture(
  slug: string,
  _prev: DepartureFormState,
  formData: FormData,
): Promise<DepartureFormState> {
  const parsed = parseDepartureForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  try {
    await apiWrite(
      'POST',
      `/api/v1/admin/tours/${encodeURIComponent(slug)}/departures`,
      toDeparturePayload(parsed.data),
    );
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath(`/tours/${slug}/departures`);
  redirect(flashPath(`/tours/${slug}/departures`, 'created'));
}

/** Cancellation summary a `status: CANCELLED` PATCH returns (API-W2). */
interface DepartureCancellation {
  paidTotal: number;
  refunded: number;
  skipped: string[];
  failed: { code: string; message: string }[];
}

/** Updates a departure (`PATCH /admin/tours/:slug/departures/:id`); 400 if seatsTotal < booked. */
export async function updateDeparture(
  slug: string,
  id: string,
  _prev: DepartureFormState,
  formData: FormData,
): Promise<DepartureFormState> {
  const parsed = parseDepartureForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  let cancellation: DepartureCancellation | undefined;
  try {
    // apiWrite unwraps the `{ data }` envelope — T is the departure itself.
    const res = await apiWrite<{ cancellation?: DepartureCancellation }>(
      'PATCH',
      `/api/v1/admin/tours/${encodeURIComponent(slug)}/departures/${encodeURIComponent(id)}`,
      toDeparturePayload(parsed.data),
    );
    cancellation = res?.cancellation;
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  // A CANCELLED transition ran the auto-refund pass — surface its outcome.
  const flashKey = cancellation
    ? cancellation.failed.length > 0 || cancellation.skipped.length > 0
      ? 'departure-cancelled-issues'
      : 'departure-cancelled'
    : 'updated';

  revalidatePath(`/tours/${slug}/departures`);
  redirect(flashPath(`/tours/${slug}/departures`, flashKey));
}

export interface DeleteDepartureState {
  error?: string;
}

/** Deletes a departure (`DELETE …/:id`); 409 when it has bookings (surfaced via `apiErrorMessage`). */
export async function deleteDeparture(
  slug: string,
  id: string,
): Promise<DeleteDepartureState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/tours/{slug}/departures/{id}', {
      params: { path: { slug, id } },
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath(`/tours/${slug}/departures`);
  return {};
}
