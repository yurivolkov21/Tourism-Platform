'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { ScrollToTop } from './scroll-to-top';

// Routes that render as a bare, focused screen — no header, footer or floating contact.
const BARE_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

/**
 * Chooses the page frame by route. Auth screens render bare (just the page) so the login flow stays
 * focused; everything else gets the full site chrome. The chrome elements are passed in from the
 * server layout so the footer / floating contact stay server-rendered.
 */
export function AppShell({
  header,
  footer,
  floating,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  floating: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname && BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {header}
      {/* Skip-link target + flex spacer. Not a landmark itself — each page owns its <main>,
          so this stays a plain focusable container to avoid nested/duplicate main landmarks. */}
      <div id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </div>
      {footer}
      {floating}
      <ScrollToTop />
    </div>
  );
}

export default AppShell;
