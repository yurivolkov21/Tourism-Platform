import { ImageIcon } from 'lucide-react';

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
              width="223"
              height="12"
              viewBox="0 0 223 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 w-full translate-y-1/2 max-sm:hidden"
            >
              <path
                d="M1.11716 10.428C39.7835 4.97282 75.9074 2.70494 114.894 1.98894C143.706 1.45983 175.684 0.313587 204.212 3.31596C209.925 3.60546 215.144 4.59884 221.535 5.74551"
                stroke="url(#hero-underline)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient
                  id="hero-underline"
                  x1="18.8541"
                  y1="3.72033"
                  x2="42.6487"
                  y2="66.6308"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="var(--primary)" />
                  <stop offset="1" stopColor="var(--primary-foreground)" />
                </linearGradient>
              </defs>
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
        className="from-primary via-primary/80 to-rating flex aspect-(--aspect-hero) w-full items-center justify-center bg-linear-to-br"
      >
        <span className="text-primary-foreground/90 flex flex-col items-center gap-2 text-xs tracking-widest uppercase">
          <ImageIcon className="size-7" />
          {t.imageAlt}
        </span>
      </div>
    </section>
  );
}

export default Hero;
