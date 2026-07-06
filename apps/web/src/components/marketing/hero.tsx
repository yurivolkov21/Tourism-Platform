import Image from 'next/image';
import { MapPinIcon, SearchIcon } from 'lucide-react';

import { Badge, Button, Input } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Curated real Vietnam hero image (Unsplash).
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1634951412593-b2cdca1ae519?w=1920&q=70&auto=format&fit=crop';

export function Hero() {
  const t = messages.hero;

  return (
    <section className="relative isolate flex min-h-144 items-center justify-center overflow-hidden lg:min-h-176">
      {/* Full-bleed background image */}
      <Image
        src={HERO_IMAGE}
        alt={t.imageAlt}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Even legibility scrim for centred copy */}
      <div className="bg-overlay/50 absolute inset-0 -z-10" />

      <div className="text-on-media mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="border-primary-foreground/25 bg-background/10 flex items-center gap-2.5 rounded-full border px-2 py-1 text-sm backdrop-blur-sm">
          <Badge>{t.eyebrowBadge}</Badge>
          <span className="text-on-media/85">{t.eyebrowText}</span>
        </div>

        {/* Headline — Fraunces serif (h1 base rule) */}
        <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
          {t.titleLead} {t.titleAccent} {t.titleTail}
        </h1>

        <p className="text-on-media/85 max-w-xl text-lg text-pretty">{t.subtitle}</p>

        {/* Search affordance — navigates to the tours listing (real filtering wired later) */}
        <form
          action="/tours"
          className="bg-background shadow-dropdown mt-2 flex w-full max-w-xl items-center gap-2 rounded-full p-2"
        >
          <label htmlFor="hero-destination" className="flex flex-1 items-center gap-2 pl-3">
            <MapPinIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">{t.searchLabel}</span>
            {/* Bare-styled Input so the surrounding pill owns the chrome (border/shadow/radius). */}
            <Input
              id="hero-destination"
              type="text"
              name="q"
              placeholder={t.searchPlaceholder}
              className="text-foreground placeholder:text-muted-foreground h-auto flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            />
          </label>
          <Button type="submit" size="lg" className="shrink-0 rounded-full">
            {t.searchCta}
            <SearchIcon />
          </Button>
        </form>
      </div>
    </section>
  );
}

export default Hero;
