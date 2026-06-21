import { messages } from '@tourism/i18n';

import { TourCard, type TourCardData } from '../tours/tour-card';

/** "Tours in {name}" — a grid of the destination's tours, with an empty state. */
export function DestinationTours({ name, tours }: { name: string; tours: TourCardData[] }) {
  const t = messages.destinationDetail;

  return (
    <section className="bg-muted/40 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-10 text-2xl font-semibold text-balance md:text-3xl lg:text-4xl">
          {t.toursHeading(name)}
        </h2>

        {tours.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <TourCard key={tour.slug} tour={tour} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-lg text-pretty">{t.noTours}</p>
        )}
      </div>
    </section>
  );
}

export default DestinationTours;
