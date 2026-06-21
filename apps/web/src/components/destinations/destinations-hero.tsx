import Image from 'next/image';

import { messages } from '@tourism/i18n';

// Temporary Unsplash hero image (review only) — swap for a real asset later.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=1920&q=70&auto=format&fit=crop';

/** Overview hero: full-bleed image + centred title/subtitle (inspiration tier). */
export function DestinationsHero() {
  const t = messages.destinationsPage;

  return (
    <section className="relative isolate flex min-h-96 items-center justify-center overflow-hidden lg:min-h-120">
      <Image
        src={HERO_IMAGE}
        alt={t.heroTitle}
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="bg-overlay/50 absolute inset-0 -z-10" />

      <div className="text-primary-foreground mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
          {t.heroTitle}
        </h1>
        <p className="text-primary-foreground/85 max-w-xl text-lg text-pretty">{t.heroSubtitle}</p>
      </div>
    </section>
  );
}

export default DestinationsHero;
