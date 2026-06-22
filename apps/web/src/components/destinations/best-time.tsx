import {
  CalendarDaysIcon,
  LandmarkIcon,
  MountainIcon,
  TreePalmIcon,
  type LucideIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';

// Icon per region, falling back to a calendar glyph.
const REGION_ICONS: Record<string, LucideIcon> = {
  'Northern Vietnam': MountainIcon,
  'Central Vietnam': LandmarkIcon,
  'Southern Vietnam': TreePalmIcon,
};

/** "When to visit" — region-based seasonal guidance, unique to the destinations page. */
export function BestTime() {
  const t = messages.bestTime;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-12">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {t.regions.map((r) => {
            const Icon = REGION_ICONS[r.region] ?? CalendarDaysIcon;
            return (
              <div
                key={r.region}
                className="bg-card ring-border/60 shadow-card rounded-2xl p-6 ring-1"
              >
                <span className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
                  <Icon className="size-6" />
                </span>
                <h3 className="font-heading text-xl font-semibold">{r.region}</h3>
                <p className="text-primary mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium">
                  <CalendarDaysIcon className="size-4" />
                  {r.months}
                </p>
                <p className="text-muted-foreground mt-3 text-pretty">{r.note}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BestTime;
