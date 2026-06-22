import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { ItineraryDay } from '../../lib/tours';

/** Day-by-day itinerary as an accordion (the first day open by default). */
export function TourItinerary({ days }: { days: ItineraryDay[] }) {
  const t = messages.tourDetail;

  return (
    <section>
      <h2 className="font-heading mb-6 text-2xl font-semibold sm:text-3xl">{t.itinerary}</h2>
      <Accordion defaultValue={['day-1']} className="w-full">
        {days.map((day) => (
          <AccordionItem key={day.day} value={`day-${day.day}`}>
            <AccordionTrigger className="text-left">
              <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="text-primary font-sans text-xs font-bold tracking-wide uppercase">
                  {t.dayLabel(day.day)}
                </span>
                <span className="font-semibold">{day.title}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-pretty">
              {day.body}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export default TourItinerary;
