import type { ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';

/**
 * Full-page branded panel for the route boundaries (error / not-found /
 * global-error / checkout-error). Presentational — no client hook — so it works
 * inside server (`not-found`) and client (`error`) boundaries alike. The caller
 * supplies the action buttons/links via `children`.
 */
export function ErrorState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full">
        <AlertCircleIcon className="size-8" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold text-balance sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted-foreground text-pretty">{body}</p>
      </div>
      {children ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default ErrorState;
