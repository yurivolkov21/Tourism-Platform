import { CalendarDaysIcon, HeartIcon, MapPinIcon, UsersIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { MetricValue } from '../marketing/metric-value';

// Icons align by index to messages.about.metrics.items (mirrors the Features block pattern).
const metricIcons = [CalendarDaysIcon, UsersIcon, MapPinIcon, HeartIcon] as const;

// About-page "by the numbers" — richer icon+card treatment, distinct from the homepage Trust strip.
export function ByTheNumbers() {
  const t = messages.about.metrics;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-muted rounded-xl px-6 py-12 sm:px-10 lg:px-16 lg:py-20">
          <div className="mb-10 max-w-3xl space-y-4 sm:mb-14">
            <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
              {t.heading}
            </h2>
            <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          </div>

          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.items.map((item, i) => {
              const Icon = metricIcons[i];
              return (
                <Card key={item.label} className="p-0">
                  <CardContent className="flex flex-col items-start gap-4 p-6">
                    <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                      <Icon className="size-6" />
                    </span>
                    <div>
                      <dt className="text-primary font-heading text-4xl font-bold lg:text-5xl">
                        <MetricValue value={item.value} />
                      </dt>
                      <dd className="text-muted-foreground mt-1 text-sm font-medium">
                        {item.label}
                      </dd>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default ByTheNumbers;
