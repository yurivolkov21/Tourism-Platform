import { ArrowRightIcon, ImageIcon } from 'lucide-react';

import { buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// About-page hero: heading + intro + CTA, then a wide feature image. The stats card from the
// reference is omitted — the dedicated ByTheNumbers section carries the metrics.
export function AboutHero() {
  const t = messages.about.hero;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl space-y-5 text-center sm:mb-16">
          <h1 className="text-3xl font-semibold text-balance md:text-4xl lg:text-5xl">
            {t.heading}
          </h1>
          <p className="text-muted-foreground text-lg text-pretty">{t.body}</p>
          <a
            href="#story"
            className={cn(buttonVariants({ size: 'lg' }), 'group')}
          >
            {t.cta}
            <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Feature image placeholder (no media wired yet) */}
        <div
          className="from-primary via-primary/80 to-rating flex aspect-video items-center justify-center rounded-2xl bg-linear-to-br"
          role="img"
          aria-label={t.imageAlt}
        >
          <ImageIcon
            className="text-primary-foreground/80 size-10"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

export default AboutHero;
