import './global.css';
import { Geist, Fraunces } from 'next/font/google';

import { ThemeProvider, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { AuthProvider } from '../components/auth/auth-provider';
import { AppShell } from '../components/layout/app-shell';
import { SiteHeader } from '../components/layout/site-header';
import { SiteFooter } from '../components/layout/site-footer';
import { FloatingContact } from '../components/layout/floating-contact';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-heading' });

export const metadata = {
  title: `${messages.brand.name} — Boutique heritage journeys across Vietnam`,
  description: messages.footer.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('font-sans', geist.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main-content"
          className="bg-background text-foreground outline-ring sr-only z-100 rounded-md px-4 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:outline-2"
        >
          {messages.a11y.skipToContent}
        </a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <AppShell
              header={<SiteHeader />}
              footer={<SiteFooter />}
              floating={<FloatingContact />}
            >
              {children}
            </AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
