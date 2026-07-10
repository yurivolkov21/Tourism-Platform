export interface EnquiryPayload {
  name: string;
  email: string;
  message: string;
  phone?: string;
  tourId?: string;
  nationality?: string;
  travelDate?: string;
  groupSize?: number;
  budgetTier?: string;
  interests?: string[];
  website?: string;
}

export const ENQUIRY_FALLBACK_MESSAGE = "I'd like to plan a trip to Vietnam.";

const MIN_MESSAGE = 10;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseGroupSize(value: string | undefined): number | undefined {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : undefined;
}

export function composePlanTripMessage(
  message: string,
  duration: string | null,
): string {
  const note = message.trim();
  const durationLine = duration ? `Preferred duration: ${duration}.` : '';
  const composed = [note, durationLine].filter(Boolean).join('\n\n');
  return composed.length >= MIN_MESSAGE ? composed : ENQUIRY_FALLBACK_MESSAGE;
}

export function composeEnquiryMessage(destination: string): string {
  const d = destination.trim();
  const composed = d ? `I'd like to enquire about: ${d}.` : '';
  return composed.length >= MIN_MESSAGE ? composed : ENQUIRY_FALLBACK_MESSAGE;
}

export interface PlanTripRaw {
  name: string;
  email: string;
  phone?: string;
  nationality?: string;
  travelDate?: string;
  groupSize?: string;
  message: string;
  duration: string | null;
  budget: string | null;
  interests: string[];
  website?: string;
}

export function buildPlanTripPayload(raw: PlanTripRaw): EnquiryPayload {
  return {
    name: raw.name.trim(),
    email: raw.email.trim(),
    message: composePlanTripMessage(raw.message, raw.duration),
    phone: clean(raw.phone),
    nationality: clean(raw.nationality),
    travelDate: clean(raw.travelDate),
    groupSize: parseGroupSize(raw.groupSize),
    budgetTier: raw.budget ?? undefined,
    interests: raw.interests.length > 0 ? raw.interests : undefined,
    website: clean(raw.website),
  };
}

export interface EnquiryCtaRaw {
  name: string;
  email: string;
  destination: string;
  website?: string;
}

export function buildEnquiryCtaPayload(raw: EnquiryCtaRaw): EnquiryPayload {
  return {
    name: raw.name.trim(),
    email: raw.email.trim(),
    message: composeEnquiryMessage(raw.destination),
    website: clean(raw.website),
  };
}

export interface ContactRaw {
  firstName: string;
  lastName: string;
  email: string;
  interest: string;
  message: string;
  website?: string;
}

export function buildContactPayload(raw: ContactRaw): EnquiryPayload {
  const message = raw.message.trim();
  return {
    name: `${raw.firstName.trim()} ${raw.lastName.trim()}`.trim(),
    email: raw.email.trim(),
    message: message.length >= 10 ? message : ENQUIRY_FALLBACK_MESSAGE,
    interests: raw.interest ? [raw.interest] : undefined,
    website: clean(raw.website),
  };
}

export function isValidEnquiry(
  payload: Pick<EnquiryPayload, 'name' | 'email'>,
): boolean {
  const nameOk = payload.name.trim().length >= 2;
  const emailOk = /^\S+@\S+\.\S+$/.test(payload.email.trim());
  return nameOk && emailOk;
}
