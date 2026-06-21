'use client';

import { StarIcon } from 'lucide-react';

import {
  Avatar,
  AvatarFallback,
  Card,
  CardContent,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

const MAX_STARS = 5;

// First-letter initials from the first two name parts (e.g. "Emily Carter" → "EC").
function initials(name: string): string {
  return name
    .split(' ', 2)
    .map((part) => part[0])
    .join('');
}

// Read-only star row — reuses the token-based rating treatment from TourCard
// (text-rating / fill-rating) rather than the heavy interactive Rating widget.
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} of ${MAX_STARS} stars`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <StarIcon
          key={i}
          aria-hidden
          className={cn(
            'size-4',
            i < rating ? 'text-rating fill-rating' : 'text-rating/25 fill-rating/15',
          )}
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  const t = messages.testimonials;

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <Carousel
        className="mx-auto flex max-w-7xl gap-12 px-4 max-sm:flex-col sm:items-center sm:gap-16 sm:px-6 lg:gap-20 lg:px-8"
        opts={{ align: 'start', slidesToScroll: 1 }}
      >
        {/* Left — intro + carousel controls */}
        <div className="space-y-4 sm:w-1/2 lg:w-1/3">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">{t.eyebrow}</p>
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl">
            {t.heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
          <div className="flex items-center gap-3 pt-2">
            <CarouselPrevious variant="outline" size="icon" className="static translate-y-0" />
            <CarouselNext variant="outline" size="icon" className="static translate-y-0" />
          </div>
        </div>

        {/* Right — testimonial carousel */}
        <div className="relative sm:w-1/2 lg:w-2/3">
          <CarouselContent className="-ml-4 sm:-ml-6">
            {t.items.map((item) => (
              <CarouselItem key={item.name} className="pl-4 sm:pl-6 lg:basis-1/2">
                <Card className="h-full p-0 transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card hover:ring-primary/40">
                  <CardContent className="p-6">
                    <figure className="flex h-full flex-col gap-5">
                      <Stars rating={item.rating} />
                      <blockquote className="flex-1 text-pretty">
                        &ldquo;{item.content}&rdquo;
                      </blockquote>
                      <figcaption className="border-border flex items-center gap-3 border-t pt-4">
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
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>
    </section>
  );
}

export default Testimonials;
