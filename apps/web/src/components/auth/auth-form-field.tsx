import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Input, Label } from '@tourism/ui';

import type { FieldErrorCode } from '../../lib/auth/validate';
import { AuthFieldError } from './auth-field-error';

type AuthFormFieldProps = {
  id: string;
  label: string;
  /** Error wiring — omit both for display-only/no-validation fields. */
  field?: 'fullName' | 'email' | 'password' | 'confirm';
  code?: FieldErrorCode;
  required?: boolean;
  /** Trailing muted caption (e.g. the profile email hint). */
  hint?: string;
  /** Trailing slot rendered after the error/hint (e.g. login's forgot-password link). */
  after?: ReactNode;
  /** Custom control that replaces the internal `Input` — no automatic aria wiring in this case. */
  children?: ReactNode;
  // The computed aria wiring is the whole point of this component — callers
  // must not be able to clobber it through the rest spread.
} & Omit<
  ComponentPropsWithoutRef<typeof Input>,
  'aria-required' | 'aria-invalid' | 'aria-describedby'
>;

/**
 * Shared `<div className="space-y-1.5"><Label/><Input/><AuthFieldError/></div>` field-group used
 * across the auth/account forms (login, register, forgot/reset password, change email/password,
 * profile). Centralizes the aria wiring (`aria-required`/`aria-invalid`/`aria-describedby`) that
 * used to be hand-repeated per site. Pass `children` to swap in a custom control (e.g. a
 * password-with-toggle composite) — the internal `Input` and its aria wiring are skipped entirely.
 */
export function AuthFormField({
  id,
  label,
  field,
  code,
  required,
  hint,
  after,
  children,
  ...rest
}: AuthFormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children ?? (
        <Input
          {...rest}
          id={id}
          aria-required={required || undefined}
          aria-invalid={Boolean(code) || undefined}
          aria-describedby={code ? `${id}-error` : undefined}
        />
      )}
      {field ? (
        <AuthFieldError id={`${id}-error`} field={field} code={code} />
      ) : null}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {after}
    </div>
  );
}

export default AuthFormField;
