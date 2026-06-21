'use client';

import { useState } from 'react';
import { SearchIcon } from 'lucide-react';

import { Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { TourCard, type TourCardData } from './tour-card';

// A listed tour carries its category (a TourCategory value) on top of the card DTO so the
// tabs can filter. Placeholder fixtures shaped like the eventual @tourism/core data.
type ListedTour = TourCardData & { category: string };

const tours: ListedTour[] = [
  { slug: 'ha-long-overnight-cruise', title: 'Hạ Long Bay Overnight Cruise', destination: 'Hạ Long Bay', category: 'Cruises', durationDays: 2, basePrice: 320, compareAtPrice: 380, currency: 'USD', rating: 4.9, reviewCount: 214, badges: ['POPULAR'] },
  { slug: 'sa-pa-hill-tribe-trek', title: 'Sa Pa Hill-Tribe Trek', destination: 'Sa Pa', category: 'Trekking', durationDays: 3, basePrice: 240, currency: 'USD', rating: 4.8, reviewCount: 132, badges: ['BEST_VALUE'] },
  { slug: 'hoi-an-heritage-walk', title: 'Hội An Heritage Walk', destination: 'Hội An', category: 'Cultural', durationDays: 1, basePrice: 75, currency: 'USD', rating: 4.9, reviewCount: 301, badges: [] },
  { slug: 'hue-imperial-citadel', title: 'Huế Imperial Citadel & Royal Tombs', destination: 'Huế', category: 'Cultural', durationDays: 2, basePrice: 180, currency: 'USD', rating: 4.7, reviewCount: 98, badges: ['NEW'] },
  { slug: 'mekong-delta-food-trail', title: 'Mekong Delta Food Trail', destination: 'Mekong Delta', category: 'Culinary', durationDays: 2, basePrice: 210, compareAtPrice: 250, currency: 'USD', rating: 4.8, reviewCount: 156, badges: ['LIMITED_OFFER'] },
  { slug: 'saigon-street-food-night', title: 'Saigon Street-Food Night', destination: 'Hồ Chí Minh City', category: 'Culinary', durationDays: 1, basePrice: 65, currency: 'USD', rating: 4.9, reviewCount: 277, badges: ['POPULAR'] },
];

function uniqueCategories(items: ListedTour[]): string[] {
  return [...new Set(items.map((t) => t.category))];
}

export function ToursExplorer() {
  const t = messages.tours;
  const [query, setQuery] = useState('');

  const categories = [t.all, ...uniqueCategories(tours)];

  const visibleFor = (category: string) => {
    const q = query.trim().toLowerCase();
    return tours.filter((tour) => {
      const inCategory = category === t.all || tour.category === category;
      const matchesQuery =
        q === '' ||
        tour.title.toLowerCase().includes(q) ||
        tour.destination.toLowerCase().includes(q);
      return inCategory && matchesQuery;
    });
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:space-y-12 lg:px-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-primary text-sm font-medium tracking-widest uppercase">{t.eyebrow}</p>
          <h1 className="text-3xl font-semibold text-balance md:text-4xl">{t.heading}</h1>
          <p className="text-muted-foreground text-lg text-pretty">{t.subtitle}</p>
        </div>

        <Tabs defaultValue={t.all} className="gap-8 lg:gap-10">
          <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            <TabsList className="flex-wrap">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="px-3">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="relative sm:w-64">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="pl-9"
              />
            </div>
          </div>

          {categories.map((category) => {
            const visible = visibleFor(category);
            return (
              <TabsContent key={category} value={category}>
                {visible.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((tour) => (
                      <TourCard key={tour.slug} tour={tour} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-12 text-center">{t.empty}</p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}

export default ToursExplorer;
