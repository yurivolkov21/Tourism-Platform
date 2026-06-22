import { CompassIcon, MapPinIcon, SparklesIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@tourism/ui';

const ICONS: readonly LucideIcon[] = [SparklesIcon, CompassIcon, MapPinIcon];

/** "What makes {region} special" — three region-specific highlight cards (accent-themed icons). */
export function RegionHighlights({
  heading,
  items,
  accentSoft,
}: {
  heading: string;
  items: { title: string; body: string }[];
  accentSoft: string;
}) {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-10 text-center text-2xl font-semibold text-balance md:text-3xl">
          {heading}
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = ICONS[i] ?? SparklesIcon;
            return (
              <div
                key={item.title}
                className="bg-card ring-border/60 shadow-card rounded-2xl p-6 ring-1"
              >
                <span
                  className={cn(
                    'mb-4 flex size-12 items-center justify-center rounded-full',
                    accentSoft,
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <h3 className="font-heading text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground mt-2 text-pretty">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RegionHighlights;
