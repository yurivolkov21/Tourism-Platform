'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@tourism/ui';

import { confirmPollDelayMs, shouldKeepPolling } from '../../lib/booking/poll';

/**
 * Auto-confirms a PENDING checkout: re-runs the (dynamic) success page on a bounded backoff so the
 * Stripe webhook / PayPal capture lands without the buyer doing anything. Only mounts while the
 * booking is PENDING (the PAID branch renders no poller) so it stops the instant the trip is
 * confirmed. Keeps a manual Refresh as a fallback once the poll budget is spent.
 */
export function AutoRefresh({ label }: { label: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!shouldKeepPolling(attempt)) return;
    const id = setTimeout(() => {
      router.refresh();
      setAttempt((n) => n + 1);
    }, confirmPollDelayMs(attempt));
    return () => clearTimeout(id);
  }, [attempt, router]);

  return (
    <Button type="button" variant="outline" onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}

export default AutoRefresh;
