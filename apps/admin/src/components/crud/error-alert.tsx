import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription } from '@tourism/ui';

/**
 * Standard destructive alert for admin error messages — list-load failures, form submit errors, and
 * dialog action errors. Replaces the ad-hoc `<p className="text-destructive">` / bespoke banner divs
 * so every error reads the same across the console. Plain component (no hooks) — safe in server and
 * client files.
 */
export function ErrorAlert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export default ErrorAlert;
