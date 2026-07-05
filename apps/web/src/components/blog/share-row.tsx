'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon, LinkIcon } from 'lucide-react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { FacebookIcon, TwitterIcon } from '../icons/social';

const COPIED_MS = 2000;

/**
 * Copy-link + Facebook + X share buttons for an article — plain intent/sharer URLs, no
 * SDKs. `url` must be absolute (the server page passes `absoluteUrl(...)` down; client
 * env can't resolve the canonical origin).
 */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const t = messages.blog;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      // Clipboard unavailable (insecure context / permission) — the button just stays put.
    }
  };

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xHref = `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground text-sm font-medium">{t.shareLabel}</span>
      <Button type="button" variant="outline" size="sm" onClick={copy} className="cursor-pointer">
        {copied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4" />}
        <span aria-live="polite">{copied ? t.linkCopied : t.copyLink}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          <a href={facebookHref} target="_blank" rel="noopener noreferrer" aria-label={t.shareOnFacebook} />
        }
      >
        <FacebookIcon className="size-4" />
        Facebook
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href={xHref} target="_blank" rel="noopener noreferrer" aria-label={t.shareOnX} />}
      >
        <TwitterIcon className="size-4" />X
      </Button>
    </div>
  );
}

export default ShareRow;
