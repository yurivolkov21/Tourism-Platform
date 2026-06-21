import './global.css';
import { Geist, Fraunces } from 'next/font/google';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { SiteHeader } from '../components/layout/site-header';
import { SiteFooter } from '../components/layout/site-footer';
import { FloatingContact } from '../components/layout/floating-contact';
import { ScrollToTop } from '../components/layout/scroll-to-top';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-heading' });

export const metadata = {
  title: `${messages.brand.name} — Boutique heritage journeys across Vietnam`,
  description: messages.footer.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable, fraunces.variable)}>
      <body>
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <FloatingContact />
          <ScrollToTop />
        </div>
      </body>
    </html>
  );
}
