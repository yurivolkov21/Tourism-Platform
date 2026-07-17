/** Shared password policy for the register + reset + change-password forms (copy lives in i18n). */

export const MIN_PASSWORD = 8;

export type PasswordError = 'WEAK' | 'MISMATCH';

/**
 * The enforced password policy (2026-07-16): min length + one of each character
 * class. These mirror the Supabase Auth settings (Minimum password length +
 * Password requirements) so the client rejects a weak password up-front instead
 * of round-tripping to a server `weak_password` error. The forms also visualise
 * these rules (strength meter); `validatePasswordPair` gates them.
 */
const STRENGTH_RULES: { key: string; regex: RegExp }[] = [
  { key: 'length', regex: new RegExp(`.{${MIN_PASSWORD},}`) },
  { key: 'lower', regex: /[a-z]/ },
  { key: 'upper', regex: /[A-Z]/ },
  { key: 'number', regex: /[0-9]/ },
  { key: 'special', regex: /[^A-Za-z0-9]/ },
];

export interface PasswordStrength {
  score: number;
  rules: { key: string; met: boolean }[];
}

/** Count met requirements (0–5) + per-rule flags. Keys map to `messages.auth.passwordRules`. */
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

/**
 * `null` when valid; `'WEAK'` when the policy isn't fully met; `'MISMATCH'` when
 * the pair differs (checked after the policy, so the stronger signal wins).
 */
export function validatePasswordPair(
  password: string,
  confirm: string,
): PasswordError | null {
  if (!meetsPasswordPolicy(password)) return 'WEAK';
  if (password !== confirm) return 'MISMATCH';
  return null;
}

/** Token-based bar colour for a strength score (no raw palette). */
export function passwordStrengthTone(score: number): string {
  if (score <= 0) return 'bg-border';
  if (score <= 2) return 'bg-destructive';
  if (score <= 3) return 'bg-warning';
  if (score === 4) return 'bg-rating';
  return 'bg-success';
}
