import type { Metadata } from 'next';
import Link from 'next/link';
import { XCircleIcon } from 'lucide-react';

import { Card, CardContent, buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export const metadata: Metadata = {
  title: `${messages.booking.cancel.title} — ${messages.brand.name}`,
};

export const dynamic = 'force-dynamic';

/**
 * Payment-cancelled return (`/checkout/cancel?code=<code>`). The booking stays PENDING on the API
 * (retry-friendly; the cleanup cron releases stale PENDING after 30m). When we have the code, the
 * primary CTA goes to the booking detail where the buyer can **pay now** or **cancel** in one click.
 */
export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const t = messages.booking.cancel;

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:py-16">
      <Card>
        <CardContent className="space-y-6 p-6 text-center sm:p-8">
          <XCircleIcon className="text-muted-foreground mx-auto size-10" />
          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-semibold">{t.title}</h1>
            <p className="text-muted-foreground text-sm text-pretty">{t.body}</p>
          </div>
          {code ? (
            <div className="flex flex-col gap-3">
              <Link
                href={`/account/bookings/${code}`}
                className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
              >
                {t.manage}
              </Link>
              <Link
                href="/tours"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
              >
                {t.backToTours}
              </Link>
            </div>
          ) : (
            <Link href="/tours" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
              {t.backToTours}
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
