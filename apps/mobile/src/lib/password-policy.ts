/**
 * Password policy shared by every place mobile sets a password (sign-up ·
 * reset · change-password). Mirrors the web policy (`apps/web/src/lib/auth/
 * password.ts`) and the Supabase Auth settings, so a weak password is rejected
 * — and explained rule-by-rule — before it round-trips to a `weak_password`
 * server error the user can't act on.
 */

export const MIN_PASSWORD = 8;

export type PasswordRuleKey =
  | 'length'
  | 'lower'
  | 'upper'
  | 'number'
  | 'special';

const STRENGTH_RULES: { key: PasswordRuleKey; regex: RegExp }[] = [
  { key: 'length', regex: new RegExp(`.{${MIN_PASSWORD},}`) },
  { key: 'lower', regex: /[a-z]/ },
  { key: 'upper', regex: /[A-Z]/ },
  { key: 'number', regex: /[0-9]/ },
  { key: 'special', regex: /[^A-Za-z0-9]/ },
];

export interface PasswordStrength {
  /** Count of met rules, 0–5 — drives the meter fill and the band label. */
  score: number;
  rules: { key: PasswordRuleKey; met: boolean }[];
}

/** Met-requirement count + per-rule flags. Keys map to `messages.auth.passwordRules`. */
export function scorePassword(password: string): PasswordStrength {
  const rules = STRENGTH_RULES.map((r) => ({
    key: r.key,
    met: r.regex.test(password),
  }));
  return { score: rules.filter((r) => r.met).length, rules };
}

/** True only when the password meets EVERY policy rule (length + all char classes). */
export function meetsPasswordPolicy(password: string): boolean {
  return STRENGTH_RULES.every((r) => r.regex.test(password));
}

/** Theme colour token for the meter bars at a given score (no raw hex — RN theme keys). */
export function passwordStrengthTone(
  score: number,
): 'border' | 'destructive' | 'warning' | 'rating' | 'success' {
  if (score <= 0) return 'border';
  if (score <= 2) return 'destructive';
  if (score <= 3) return 'warning';
  if (score === 4) return 'rating';
  return 'success';
}
