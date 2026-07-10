import { CheckIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

/** "Why travel with us" — a six-cell trust grid (icon + title + body). */
export function TourTrust() {
  const t = messages.tourDetail.trust;

  return (
    <section className="bg-muted/30 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <span
            className="bg-primary h-6 w-1.5 shrink-0 rounded-full"
            aria-hidden
          />
          <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
            {t.heading}
          </h2>
        </div>
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                <CheckIcon className="size-5" />
              </span>
              <div>
                <h3 className="font-sans font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm text-pretty">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TourTrust;
