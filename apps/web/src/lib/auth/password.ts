/** Shared password-pair validation for the register + reset-password forms (copy lives in i18n). */

export const MIN_PASSWORD = 6;

export type PasswordError = 'TOO_SHORT' | 'MISMATCH';

/** `null` when valid; otherwise a stable error code the form maps to `messages.auth.passwordErrors`. */
export function validatePasswordPair(password: string, confirm: string): PasswordError | null {
  if (password.length < MIN_PASSWORD) return 'TOO_SHORT';
  if (password !== confirm) return 'MISMATCH';
  return null;
}

// Advisory strength requirements (the submit rule is still `validatePasswordPair`'s min length).
const STRENGTH_RULES: { key: string; regex: RegExp }[] = [
  { key: 'length', regex: /.{8,}/ },
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
  const rules = STRENGTH_RULES.map((r) => ({ key: r.key, met: r.regex.test(password) }));
  return { score: rules.filter((r) => r.met).length, rules };
}

/** Token-based bar colour for a strength score (no raw palette). */
export function passwordStrengthTone(score: number): string {
  if (score <= 0) return 'bg-border';
  if (score <= 2) return 'bg-destructive';
  if (score <= 3) return 'bg-warning';
  if (score === 4) return 'bg-rating';
  return 'bg-success';
}
