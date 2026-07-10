import { CheckIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

// Field-level validation errors render inline per input (FieldErrorText); submit failures go
// through toasts — so the shared status only tracks the submit lifecycle.
export type EnquiryFormStatus = 'idle' | 'submitting' | 'success';

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
