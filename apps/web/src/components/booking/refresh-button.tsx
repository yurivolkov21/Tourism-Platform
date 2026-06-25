'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@tourism/ui';

/** Re-runs the (dynamic) checkout-success server render — used while a Stripe payment confirms. */
export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button type="button" variant="outline" onClick={() => router.refresh()}>
      {label}
    </Button>
  );
}

export default RefreshButton;
