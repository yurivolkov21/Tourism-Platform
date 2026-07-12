import Link from 'next/link';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { ErrorState } from '../components/feedback/error-state';

export default function NotFound() {
  const t = messages.resilience.notFound;
  return (
    <ErrorState title={t.title} body={t.body}>
      <Link href="/" className={cn(buttonVariants({ variant: 'default' }))}>
        {t.home}
      </Link>
      <Link
        href="/tours"
        className={cn(buttonVariants({ variant: 'outline' }))}
      >
        {t.tours}
      </Link>
      <Link href="/blog" className={cn(buttonVariants({ variant: 'outline' }))}>
        {t.blog}
      </Link>
    </ErrorState>
  );
}
