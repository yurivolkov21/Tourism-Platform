import { Badge, buttonVariants, cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export function Hero() {
  const t = messages.hero;

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] flex-col justify-between gap-12 overflow-x-hidden pt-12 sm:gap-16 sm:pt-16 lg:gap-20 lg:pt-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-4 text-center sm:px-6 lg:px-8">
        {/* Eyebrow pill */}
        <div className="bg-muted text-muted-foreground flex items-center gap-2.5 rounded-full border py-1 pe-3 ps-1 text-sm">
          <Badge>{t.eyebrowBadge}</Badge>
          <span>{t.eyebrowText}</span>
        </div>

        {/* Headline — Fraunces (serif h1 base rule); accent word underlined in brass */}
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {t.titleLead}{' '}
          <span className="relative whitespace-nowrap">
            {t.titleAccent}
            <svg
              viewBox="0 0 223 12"
              fill="none"
              aria-hidden="true"
              preserveAspectRatio="none"
              className="text-rating absolute inset-x-0 -bottom-1 h-[0.5em] w-full max-sm:hidden"
            >
              <path
                d="M1.117 10.428C39.784 4.973 75.907 2.705 114.894 1.989c28.812-.53 60.79-1.676 89.318 1.327 5.713.289 10.932 1.283 17.323 2.43"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>{' '}
          {t.titleTail}
        </h1>

        <p className="text-muted-foreground max-w-prose text-lg text-pretty">{t.subtitle}</p>

        <a href="#tours" className={cn(buttonVariants({ size: 'lg' }))}>
          {t.cta}
        </a>
      </div>

      {/* Hero media — placeholder slot at the project's hero aspect ratio. Swap for a real asset. */}
      <div
        role="img"
        aria-label={t.imageAlt}
        className="from-primary/15 via-accent to-background flex aspect-(--aspect-hero) w-full items-end justify-center bg-linear-to-br"
      >
        <span className="text-muted-foreground/70 pb-6 text-xs tracking-wide uppercase">
          {t.imageAlt}
        </span>
      </div>
    </section>
  );
}

export default Hero;
