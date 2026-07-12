'use client';

import Link from 'next/link';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { ErrorState } from '../components/feedback/error-state';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = messages.resilience.error;
  return (
    <ErrorState title={t.title} body={t.body}>
      <button
        type="button"
        onClick={reset}
        className={cn(buttonVariants({ variant: 'default' }))}
      >
        {t.retry}
      </button>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
        {t.home}
      </Link>
    </ErrorState>
  );
}
