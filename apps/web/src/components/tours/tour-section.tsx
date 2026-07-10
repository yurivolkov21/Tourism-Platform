import type { ReactNode } from 'react';

import { cn } from '@tourism/ui';

/** Lily-style content panel: a white card with an emerald accent-bar heading. The shared design
 * language for every tour-detail block (Overview, Itinerary, Inclusions, …). */
export function TourSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'bg-card border-border/60 shadow-card rounded-2xl border p-6 sm:p-8',
        className,
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <span
          className="bg-primary h-6 w-1.5 shrink-0 rounded-full"
          aria-hidden
        />
        <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default TourSection;
