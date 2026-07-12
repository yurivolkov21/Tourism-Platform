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

import { SectionHeading } from '../section-heading';
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
        <SectionHeading
          title={t.heading}
          subtitle={t.subtitle}
          className="mb-10 sm:mb-14"
        />

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
