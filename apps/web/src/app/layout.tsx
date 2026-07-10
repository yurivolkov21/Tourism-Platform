import './global.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Fraunces } from 'next/font/google';

import { ThemeProvider, Toaster, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { AuthProvider } from '../components/auth/auth-provider';
import { AppShell } from '../components/layout/app-shell';
import { SiteHeader } from '../components/layout/site-header';
import { SiteFooter } from '../components/layout/site-footer';
import { FloatingContact } from '../components/layout/floating-contact';
import { OrganizationJsonLd } from '../components/seo/json-ld';
import { FlashToaster } from '../components/feedback/flash-toaster';
import { SITE_URL } from '../lib/site';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-heading' });

const SITE_TITLE = `${messages.brand.name} — ${messages.brand.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${messages.brand.name}`,
  },
  description: messages.footer.tagline,
  applicationName: messages.brand.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: messages.brand.name,
    title: SITE_TITLE,
    description: messages.footer.tagline,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: messages.footer.tagline,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn('font-sans', geist.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <body>
        <OrganizationJsonLd />
        <a
          href="#main-content"
          className="bg-background text-foreground outline-ring sr-only z-100 rounded-md px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:outline-2"
        >
          {messages.a11y.skipToContent}
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppShell
              header={<SiteHeader />}
              footer={<SiteFooter />}
              floating={<FloatingContact />}
            >
              {children}
            </AppShell>
          </AuthProvider>
          <Toaster position="bottom-right" richColors />
          <Suspense fallback={null}>
            <FlashToaster />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
