import { randomBytes } from 'node:crypto';

/**
 * Base36 alphabet (A-Z, 0-9). Codes are human-readable identifiers, not secrets.
 * Keep this in sync with any consumer regex (`^BK-[A-Z0-9]{8}$`) — the review
 * flow (P1.7) will validate booking codes against that shape.
 */
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 8;

/**
 * Mints a human-readable booking code: `BK-` + 8 base36 chars. 36^8 ≈ 2.8×10^12
 * distinct codes. The slight modulo bias (256 % 36 ≠ 0) is irrelevant — codes
 * are identifiers, and uniqueness is enforced by the DB UNIQUE constraint plus a
 * caller-side retry.
 */
export function mintBookingCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let suffix = '';
  for (const b of bytes) {
    suffix += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return `BK-${suffix}`;
}
