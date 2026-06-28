import type { EnquiryPayload } from '../enquiry-form';

/** End date of a fixed-length trip: start + (durationDays − 1) days (a 5-day trip spans 5 dates). */
export function deriveEndDate(startISO: string, durationDays: number): string {
  const d = new Date(`${startISO}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || durationDays < 1) return startISO;
  d.setUTCDate(d.getUTCDate() + (durationDays - 1));
  return d.toISOString().slice(0, 10);
}

export interface PrivateRequestInput {
  tourId: string;
  tourTitle: string;
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  name: string;
  email: string;
  phone?: string;
  adults: number;
  children: number;
  requests?: string;
}

/**
 * Shape a private-departure request into a `POST /enquiries` payload: structured `tourId` /
 * `travelDate` / `groupSize` for the sales queue, plus a human-readable message (dates, party,
 * notes) so the lead reads well in the admin inbox.
 */
export function buildPrivateEnquiryPayload(
  input: PrivateRequestInput,
): EnquiryPayload {
  const end = deriveEndDate(input.startDate, input.durationDays);
  const groupSize = input.adults + input.children;
  const party = `${input.adults} adult${input.adults === 1 ? '' : 's'}${
    input.children > 0
      ? `, ${input.children} child${input.children === 1 ? '' : 'ren'}`
      : ''
  }`;
  const notes = input.requests?.trim();
  const message = [
    `Private departure request for "${input.tourTitle}".`,
    `Preferred dates: ${input.startDate} → ${end} (${input.durationDays} days).`,
    `Party: ${party}.`,
    notes ? `Notes: ${notes}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    tourId: input.tourId,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || undefined,
    travelDate: input.startDate,
    groupSize,
    message,
  };
}
