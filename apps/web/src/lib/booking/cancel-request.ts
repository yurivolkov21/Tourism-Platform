import type { EnquiryPayload } from '../enquiry-form';

/** Fields a PAID-booking cancellation/refund request carries (submitted as an Enquiry to the team). */
export interface CancellationRequestInput {
  code: string;
  tourTitle: string;
  /** Pre-formatted departure date. */
  departureDate: string;
  name: string;
  email: string;
  reason: string;
}

/**
 * Pure: shape a cancellation/refund request into an `Enquiry` payload. Refunds are admin-only, so the
 * customer's request lands in the team's enquiry CRM (tagged with the booking code) for manual
 * processing. The message always carries the code so support can find the booking.
 */
export function buildCancellationRequestPayload(
  input: CancellationRequestInput,
): EnquiryPayload {
  const reason = input.reason.trim();
  const message = [
    `Cancellation / refund request for booking ${input.code}.`,
    `Tour: ${input.tourTitle} — departing ${input.departureDate}.`,
    `Reason: ${reason || '(not provided)'}`,
  ].join('\n');
  return {
    name: input.name.trim() || 'Customer',
    email: input.email.trim(),
    message,
  };
}
