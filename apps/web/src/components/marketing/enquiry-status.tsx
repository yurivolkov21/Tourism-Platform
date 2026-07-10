import { CheckIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

export type EnquiryFormStatus =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'invalid'
  | 'error'
  | 'rateLimited';

/** Thank-you panel shown in place of the form after a successful submit. */
export function EnquirySuccess() {
  const t = messages.enquiryForm;
  return (
    <div
      className="flex flex-col items-center gap-3 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      <span className="bg-success/15 text-success flex size-12 items-center justify-center rounded-full">
        <CheckIcon className="size-6" />
      </span>
      <h3 className="font-heading text-xl font-semibold">{t.success}</h3>
      <p className="text-muted-foreground max-w-sm text-pretty">
        {t.successBody}
      </p>
    </div>
  );
}

/** Inline error message above the submit button (invalid / generic / rate-limited). */
export function EnquiryStatus({ status }: { status: EnquiryFormStatus }) {
  const t = messages.enquiryForm;
  const text =
    status === 'invalid'
      ? t.required
      : status === 'rateLimited'
        ? t.rateLimited
        : status === 'error'
          ? t.errorGeneric
          : null;
  if (!text) return null;
  return (
    <p className="text-destructive text-sm" role="alert">
      {text}
    </p>
  );
}
