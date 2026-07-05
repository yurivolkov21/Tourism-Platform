/** Max mirrors the API DTO (`SubscribeDto.email` ≤ 200). */
const EMAIL_MAX = 200;

/**
 * Light client-side gate for the footer signup — the API's `IsEmail` is the real
 * validator; this only catches obvious slips before a network round-trip.
 */
export function isValidNewsletterEmail(raw: string): boolean {
  const email = raw.trim();
  if (email.length === 0 || email.length > EMAIL_MAX) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
