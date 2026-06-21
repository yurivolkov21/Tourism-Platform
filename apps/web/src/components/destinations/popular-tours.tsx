import { messages } from '@tourism/i18n';

import { TourCard, type TourCardData } from '../tours/tour-card';

/** Overview "Most popular journeys" strip: a responsive grid of tour cards. */
export function PopularTours({ tours }: { tours: TourCardData[] }) {
  const t = messages.destinationsPage;

  return (
    <section className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
          <h2 className="text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
            {t.popularHeading}
          </h2>
          <p className="text-muted-foreground text-lg text-pretty">{t.popularSubtitle}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PopularTours;
