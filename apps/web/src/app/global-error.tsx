'use client';

import './global.css';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { ErrorState } from '../components/feedback/error-state';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = messages.resilience.globalError;
  return (
    <html lang="en">
      <body>
        <ErrorState title={t.title} body={t.body}>
          <button
            type="button"
            onClick={reset}
            className={cn(buttonVariants({ variant: 'default' }))}
          >
            {t.retry}
          </button>
        </ErrorState>
      </body>
    </html>
  );
}
