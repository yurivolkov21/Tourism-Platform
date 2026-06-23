import { messages } from '@tourism/i18n';

import { TourCard, type TourCardData } from './tour-card';

/** "You might also like…" cross-sell grid — up to 4 related tours below the detail body. */
export function RelatedTours({ tours }: { tours: TourCardData[] }) {
  if (tours.length === 0) return null;

  return (
    <section className="border-border/60 border-t py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-8 text-2xl font-semibold sm:text-3xl">
          {messages.tourDetail.youMightLike}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default RelatedTours;
