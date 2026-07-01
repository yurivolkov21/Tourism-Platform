import './global.css';
import { Suspense } from 'react';
import { Geist, Fraunces } from 'next/font/google';

import { ThemeProvider, Toaster, cn } from '@tourism/ui';

import { FlashToaster } from '../components/feedback/flash-toaster';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-heading' });

export const metadata = {
  title: 'Nexora Console',
  description: 'Nexora — operations console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('font-sans', geist.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" richColors />
          <Suspense fallback={null}>
            <FlashToaster />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
