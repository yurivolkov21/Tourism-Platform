import { FieldError } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { FieldErrorCode } from '../../lib/forms/validate';

/**
 * Per-field error line for the public web forms: maps a stable validator code to its
 * `messages.fieldErrors` copy. Renders nothing while the field is valid. Pair it with
 * `aria-invalid` + `aria-describedby={id}` on the input so the message is announced in context.
 * (The auth forms use their own `AuthFieldError` over `messages.auth.fieldErrors`.)
 */
export function FieldErrorText({
  id,
  field,
  code,
}: {
  id: string;
  field: keyof typeof messages.fieldErrors & string;
  code?: FieldErrorCode;
}) {
  if (!code) return null;
  return <FieldError id={id}>{messages.fieldErrors[field]?.[code]}</FieldError>;
}

export default FieldErrorText;
