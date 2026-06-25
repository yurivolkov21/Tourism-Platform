import type { ReactNode } from 'react';

import { Card, CardContent } from '@tourism/ui';

import { Logo } from '../brand/logo';

/** Centred card layout shared by the login + register pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-muted/30 flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="shadow-card">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 space-y-1 text-center">
              <h1 className="font-heading text-2xl font-semibold">{title}</h1>
              <p className="text-muted-foreground text-sm text-pretty">{subtitle}</p>
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default AuthShell;
