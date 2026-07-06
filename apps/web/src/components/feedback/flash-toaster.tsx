'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { toast } from '@tourism/ui';

import { resolveFlash } from '../../lib/flash';

/**
 * Reads a `?flash=<key>` param (set by a redirect-based Server Action), fires the mapped toast once,
 * then strips the param from the URL. Renders nothing. Mount once, next to `<Toaster>`.
 */
export function FlashToaster() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = params.get('flash');
    if (!key) return;

    const token = `${pathname}:${key}`;
    if (firedFor.current !== token) {
      firedFor.current = token;
      const message = resolveFlash(key);
      if (message) {
        if (message.type === 'error') toast.error(message.text);
        else if (message.type === 'info') toast.info(message.text);
        else toast.success(message.text);
      }
    }

    const next = new URLSearchParams(params.toString());
    next.delete('flash');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}

export default FlashToaster;
