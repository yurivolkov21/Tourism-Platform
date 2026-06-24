'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { components } from '@tourism/core';

import { apiErrorMessage } from '../api/error';
import { getApiClient } from '../api/client';
import { departureSchema, toDeparturePayload } from './schema';

export interface DepartureFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

type DepartureBody = components['schemas']['CreateDepartureDto'];

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
    const api = await getApiClient();
    await api.POST('/api/v1/admin/tours/{slug}/departures', {
      params: { path: { slug } },
      body: toDeparturePayload(parsed.data) as DepartureBody,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath(`/tours/${slug}/departures`);
  redirect(`/tours/${slug}/departures`);
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

  try {
    const api = await getApiClient();
    await api.PATCH('/api/v1/admin/tours/{slug}/departures/{id}', {
      params: { path: { slug, id } },
      body: toDeparturePayload(parsed.data) as DepartureBody,
    });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }

  revalidatePath(`/tours/${slug}/departures`);
  redirect(`/tours/${slug}/departures`);
}

export interface DeleteDepartureState {
  error?: string;
}

/** Deletes a departure (`DELETE …/:id`); 409 when it has bookings (surfaced via `apiErrorMessage`). */
export async function deleteDeparture(slug: string, id: string): Promise<DeleteDepartureState> {
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
