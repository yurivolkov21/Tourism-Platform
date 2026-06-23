import { ChevronDownIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';
import type { ItineraryDay } from '../../lib/tours';

/** Day-by-day itinerary as a clean numbered timeline: uniform circular day-nodes threaded on one
 * continuous rail, each day expandable (native <details>; first day open). Stays a server component. */
export function TourItinerary({ days }: { days: ItineraryDay[] }) {
  const t = messages.tourDetail;
  const lastIndex = days.length - 1;

  return (
    <TourSection title={t.itinerary}>
      <ol>
        {days.map((day, index) => {
          const isLast = index === lastIndex;
          return (
            <li key={day.day} className="grid grid-cols-[2rem_1fr] gap-x-4">
              {/* Rail: a uniform numbered node, then a line that grows to the next node */}
              <div className="flex flex-col items-center">
                <span className="bg-primary text-primary-foreground font-sans flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                  {day.day}
                </span>
                {!isLast ? <span className="bg-primary/20 mt-1.5 w-0.5 flex-1 rounded-full" aria-hidden /> : null}
              </div>

              {/* Content: a native disclosure, first day open by default */}
              <details className="group min-w-0 pb-6" {...(index === 0 ? { open: true } : {})}>
                <summary className="flex cursor-pointer list-none items-center gap-3 py-1.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-primary font-sans text-xs font-bold tracking-wide uppercase">
                    {t.dayLabel(day.day)}
                  </span>
                  <span className="font-semibold text-balance">{day.title}</span>
                  <ChevronDownIcon className="text-muted-foreground ml-auto size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="text-muted-foreground mt-2 text-pretty">{day.body}</p>
              </details>
            </li>
          );
        })}
      </ol>
    </TourSection>
  );
}

export default TourItinerary;
