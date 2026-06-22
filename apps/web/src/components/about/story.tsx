import Image from 'next/image';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

// Temp Unsplash imagery (review only) — one per milestone, aligned by index. Swap for real assets later.
const u = (id: string) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`;
const milestoneImages = [
  u('photo-1528127269322-539801943592'),
  u('photo-1583417319070-4a69db38a482'),
  u('photo-1559592413-7cec4d0cae2b'),
  u('photo-1535139262971-c51845709a48'),
  u('photo-1528181304800-259b08848526'),
];

// About-page "Our story" — an alternating left/right milestone timeline with imagery, anchored to a
// centre spine on desktop and stacked on mobile. The image and the copy swap sides each milestone;
// the year is the central marker that breaks the spine.
export function Story() {
  const t = messages.about.story;

  return (
    <section id="story" className="scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 space-y-4 text-center sm:mb-20">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg text-pretty">{t.subtitle}</p>
        </div>

        <ol className="relative space-y-12 lg:space-y-24">
          {/* Centre spine (desktop only) */}
          <span
            aria-hidden
            className="bg-border absolute top-3 bottom-3 left-1/2 hidden w-px -translate-x-1/2 lg:block"
          />

          {t.milestones.map((m, i) => {
            const imageLeft = i % 2 === 1;
            return (
              <li
                key={m.year}
                className="relative grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-12"
              >
                {/* Year marker — the central node that breaks the spine */}
                <div className="lg:col-start-2 lg:row-start-1 lg:flex lg:justify-center">
                  <span className="bg-background text-primary font-heading relative z-10 px-3 text-3xl font-bold lg:text-4xl">
                    {m.year}
                  </span>
                </div>

                {/* Image */}
                <div
                  className={cn(
                    'ring-border overflow-hidden rounded-2xl ring-1 lg:row-start-1',
                    imageLeft ? 'lg:col-start-1' : 'lg:col-start-3',
                  )}
                >
                  <Image
                    src={milestoneImages[i % milestoneImages.length]}
                    alt={m.title}
                    width={900}
                    height={600}
                    className="aspect-3/2 w-full object-cover"
                  />
                </div>

                {/* Copy */}
                <div className={cn('lg:row-start-1', imageLeft ? 'lg:col-start-3' : 'lg:col-start-1')}>
                  <h3 className="font-sans text-xl font-semibold text-balance">{m.title}</h3>
                  <p className="text-muted-foreground mt-2 text-pretty">{m.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default Story;
