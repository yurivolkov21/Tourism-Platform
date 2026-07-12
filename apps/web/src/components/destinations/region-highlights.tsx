import {
  CompassIcon,
  MapPinIcon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@tourism/ui';

import { SectionHeading } from '../section-heading';

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
        <SectionHeading title={heading} className="mb-10 max-w-none" />

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
                <h3 className="font-heading text-xl font-semibold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-pretty">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RegionHighlights;
