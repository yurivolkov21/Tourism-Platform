'use client';

import { useRouter } from 'next/navigation';
import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react';

import { Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/**
 * Inline "couldn't load this section" panel with a retry. Retry re-runs the RSC
 * data fetch via `router.refresh()` — a woken Render box then serves real data.
 * Defaults to the generic resilience copy; a surface can pass tailored strings.
 */
export function LoadErrorState({
  title = messages.resilience.loadError.title,
  body = messages.resilience.loadError.body,
}: {
  title?: string;
  body?: string;
} = {}) {
  const router = useRouter();
  return (
    <div className="border-border/60 bg-muted/40 mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border px-6 py-14 text-center">
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <AlertCircleIcon className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="font-sans text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-pretty">{body}</p>
      </div>
      <Button variant="outline" onClick={() => router.refresh()}>
        <RotateCcwIcon className="size-4" aria-hidden="true" />
        {messages.resilience.loadError.retry}
      </Button>
    </div>
  );
}

export default LoadErrorState;
