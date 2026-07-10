import { FieldError } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { FieldErrorCode } from '../../lib/auth/validate';

/**
 * Per-field error line for the auth forms: maps a stable validator code to its
 * `messages.auth.fieldErrors` copy. Renders nothing while the field is valid. Pair it with
 * `aria-invalid` + `aria-describedby={id}` on the input so the message is announced in context.
 */
export function AuthFieldError({
  id,
  field,
  code,
}: {
  id: string;
  field: 'fullName' | 'email' | 'password' | 'confirm';
  code?: FieldErrorCode;
}) {
  if (!code) return null;
  return (
    <FieldError id={id}>{messages.auth.fieldErrors[field]?.[code]}</FieldError>
  );
}

export default AuthFieldError;
