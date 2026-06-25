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
 * Payment-cancelled return (`/checkout/cancel?code=<code>`). The booking stays PENDING on the API, so
 * the buyer can retry: we don't know the tour slug here, so "Try again" sends them back to the tours
 * listing (the pending booking can be re-checked-out from the account area in a later slice).
 */
export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  await searchParams; // code is informational only — the booking remains PENDING server-side.
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
          <Link href="/tours" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            {t.backToTours}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
