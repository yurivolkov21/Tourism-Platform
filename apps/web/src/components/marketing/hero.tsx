import { ImageIcon } from 'lucide-react';

import { Badge, Button } from '@tourism/ui';
import { messages } from '@tourism/i18n';

export function Hero() {
  const t = messages.hero;

  return (
    <section className="flex flex-col gap-10 overflow-x-hidden pt-8 sm:gap-12 sm:pt-16 lg:gap-16 lg:pt-24">
      {/* Hero content */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:px-8">
        <div className="bg-muted flex items-center gap-2.5 rounded-full border px-2 py-1 text-sm">
          <Badge>{t.eyebrowBadge}</Badge>
          <span className="text-muted-foreground">{t.eyebrowText}</span>
        </div>

        {/* Headline — Fraunces serif (h1 base rule); accent word underlined (original Shadcn SVG) */}
        <h1 className="text-3xl leading-[1.29167] font-bold text-balance sm:text-4xl lg:text-5xl">
          {t.titleLead}
          <br />
          <span className="relative">
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

        <p className="text-muted-foreground max-w-xl text-pretty">{t.subtitle}</p>

        <Button size="lg" render={<a href="#tours" />} nativeButton={false}>
          {t.cta}
        </Button>
      </div>

      {/* Hero media — placeholder slot matching the reference strip proportion; swap for a real asset. */}
      <div
        role="img"
        aria-label={t.imageAlt}
        className="from-primary via-primary/80 to-rating flex min-h-67 w-full items-center justify-center bg-linear-to-br"
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
