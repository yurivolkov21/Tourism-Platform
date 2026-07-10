'use client';

import { ArrowRightIcon } from 'lucide-react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  buttonVariants,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourCard, type TourCardData } from '../tours/tour-card';

interface FeaturedPackagesProps {
  /** Real featured tours from the API (passed by the server `page.tsx`). */
  tours: TourCardData[];
}

export function FeaturedPackages({ tours }: FeaturedPackagesProps) {
  const t = messages.featuredTours;

  return (
    <section id="tours" className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.heading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">
            {t.subtitle}
          </p>
        </div>

        <Carousel opts={{ align: 'start' }} className="w-full">
          <CarouselContent className="-ml-4">
            {tours.map((tour) => (
              <CarouselItem
                key={tour.slug}
                className="pl-4 sm:basis-1/2 lg:basis-1/3"
              >
                <TourCard tour={tour} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-8 flex items-center justify-center gap-3">
            <CarouselPrevious
              variant="outline"
              size="icon"
              className="static translate-y-0"
            />
            <CarouselNext
              variant="outline"
              size="icon"
              className="static translate-y-0"
            />
          </div>
        </Carousel>

        <div className="mt-8 flex justify-center">
          <a href="/tours" className={cn(buttonVariants({ size: 'lg' }))}>
            {t.viewAll}
            <ArrowRightIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export default FeaturedPackages;
