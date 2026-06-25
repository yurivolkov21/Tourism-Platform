import { CompassIcon, LandmarkIcon, LeafIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { MetricValue } from '../marketing/metric-value';
import { Reveal } from '../marketing/reveal';

// Pill icon + brand-token colour, aligned by index to messages.about.metrics.pills.
const pillIcons = [LandmarkIcon, CompassIcon, LeafIcon] as const;
const pillColors = [
  'bg-primary/10 text-primary',
  'bg-rating/15 text-rating',
  'bg-info/10 text-info',
] as const;

/**
 * About-page impact metrics — laid out after the Shadcn Space "About Us 01" block:
 * a centred lead heading flowing into brand keyword pills, then a row of big
 * count-up figures. Values are the real catalog numbers passed by the page; the
 * count-up + decimal/star handling reuses MetricValue (NumberTicker), so no
 * motion dependency and no fabricated "+".
 */
export function ByTheNumbers({ values }: { values: string[] }) {
  const t = messages.about.metrics;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-10 sm:gap-16">
          <Reveal>
            <div className="flex flex-col items-center gap-6">
              <h2 className="max-w-4xl text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {t.heading}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {t.pills.map((pill, i) => {
                  const Icon = pillIcons[i];
                  return (
                    <span
                      key={pill}
                      className={cn('flex items-center gap-2.5 rounded-full px-5 py-2', pillColors[i])}
                    >
                      <Icon className="size-6 sm:size-7" />
                      <span className="font-heading text-2xl italic sm:text-3xl">{pill}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <dl className="grid w-full grid-cols-2 gap-y-10 lg:grid-cols-4 lg:gap-0">
              {t.labels.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    'flex flex-col items-center gap-2 px-6 py-2 text-center lg:py-6',
                    i > 0 && 'lg:border-border lg:border-l',
                  )}
                >
                  <dt className="text-primary font-heading text-5xl font-bold lg:text-6xl">
                    <MetricValue value={values[i] ?? '—'} />
                  </dt>
                  <dd className="text-muted-foreground text-sm font-medium">{label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default ByTheNumbers;
