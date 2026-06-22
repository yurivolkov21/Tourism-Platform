'use client';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

// First-letter initials from the first two name parts (e.g. "Emily Carter" → "EC").
function initials(name: string): string {
  return name
    .split(' ', 2)
    .map((part) => part[0])
    .join('');
}

/**
 * Minimal split testimonials: a sticky intro + control column on the left, and a one-up carousel
 * of large pull-quotes on the right (oversized quote mark, no card chrome). Reads guest stories
 * from `@tourism/i18n`.
 */
export function Testimonials() {
  const t = messages.testimonials;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <Carousel
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-11 px-4 sm:px-6 md:grid-cols-2 lg:gap-16 lg:px-8"
        opts={{ align: 'start', slidesToScroll: 1 }}
      >
        {/* Left — intro + controls */}
        <div className="space-y-6 md:space-y-12">
          <div className="space-y-4">
            <Badge variant="outline" className="h-auto text-sm font-normal">
              {t.eyebrow}
            </Badge>
            <h2 className="text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl">
              {t.heading}
            </h2>
            <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <CarouselPrevious variant="outline" size="icon" className="static translate-y-0" />
            <CarouselNext variant="outline" size="icon" className="static translate-y-0" />
          </div>
        </div>

        {/* Right — one-up pull-quote carousel */}
        <div className="relative">
          <CarouselContent className="sm:-ml-6">
            {t.items.map((item) => (
              <CarouselItem key={item.name} className="sm:pl-6">
                <figure className="flex flex-col gap-8">
                  <div className="space-y-1">
                    <p className="font-heading text-primary/25 h-12 text-7xl leading-none select-none" aria-hidden>
                      &ldquo;
                    </p>
                    <blockquote className="text-foreground/90 text-xl font-medium text-pretty sm:text-2xl lg:text-3xl">
                      {item.content}
                    </blockquote>
                  </div>

                  <figcaption className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {initials(item.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {item.trip} · {item.location}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>
    </section>
  );
}

export default Testimonials;
