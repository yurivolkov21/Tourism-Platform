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

// Temporary Unsplash imagery (review only); mirrors the ToursExplorer fixtures.
const cover = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;

const featured: TourCardData[] = [
  { slug: 'ha-long-overnight-cruise', title: 'Hạ Long Bay Overnight Cruise', destination: 'Hạ Long Bay', durationDays: 2, basePrice: 320, compareAtPrice: 380, currency: 'USD', rating: 4.9, reviewCount: 214, badges: ['POPULAR'], image: cover('photo-1528127269322-539801943592') },
  { slug: 'sa-pa-hill-tribe-trek', title: 'Sa Pa Hill-Tribe Trek', destination: 'Sa Pa', durationDays: 3, basePrice: 240, currency: 'USD', rating: 4.8, reviewCount: 132, badges: ['BEST_VALUE'], image: cover('photo-1573790387438-4da905039392') },
  { slug: 'hoi-an-heritage-walk', title: 'Hội An Heritage Walk', destination: 'Hội An', durationDays: 1, basePrice: 75, currency: 'USD', rating: 4.9, reviewCount: 301, badges: [], image: cover('photo-1583417319070-4a69db38a482') },
  { slug: 'hue-imperial-citadel', title: 'Huế Imperial Citadel & Royal Tombs', destination: 'Huế', durationDays: 2, basePrice: 180, currency: 'USD', rating: 4.7, reviewCount: 98, badges: ['NEW'], image: cover('photo-1555921015-5532091f6026') },
  { slug: 'mekong-delta-discovery', title: 'Mekong Delta Discovery', destination: 'Mekong Delta', durationDays: 2, basePrice: 210, compareAtPrice: 250, currency: 'USD', rating: 4.8, reviewCount: 156, badges: ['LIMITED_OFFER'], image: cover('photo-1528181304800-259b08848526') },
  { slug: 'saigon-street-food-night', title: 'Saigon Street-Food Night', destination: 'Hồ Chí Minh City', durationDays: 1, basePrice: 65, currency: 'USD', rating: 4.9, reviewCount: 277, badges: ['POPULAR'], image: cover('photo-1602002418816-5c0aeef426aa') },
];

export function FeaturedPackages() {
  const t = messages.featuredTours;

  return (
    <section id="tours" className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">{t.heading}</h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
        </div>

        <Carousel opts={{ align: 'start' }} className="w-full">
          <CarouselContent className="-ml-4">
            {featured.map((tour) => (
              <CarouselItem key={tour.slug} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                <TourCard tour={tour} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-8 flex items-center justify-center gap-3">
            <CarouselPrevious variant="outline" size="icon" className="static translate-y-0" />
            <CarouselNext variant="outline" size="icon" className="static translate-y-0" />
          </div>
        </Carousel>

        <div className="mt-8 flex justify-center">
          <a href="#tours" className={cn(buttonVariants({ size: 'lg' }))}>
            {t.viewAll}
            <ArrowRightIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

export default FeaturedPackages;
