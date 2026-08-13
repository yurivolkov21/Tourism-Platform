import { SparkleIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Marketing-bullet recap of the booked tour. Hidden when the tour has none (or its lookup failed) —
 * a confirmation page shows real data or nothing, never a placeholder. */
export function TripHighlights({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const t = messages.booking.success;

  return (
    <Card>
      <CardContent className="space-y-4 p-6 sm:p-8">
        <h2 className="font-heading text-xl font-semibold">
          {t.highlightsHeading}
        </h2>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <SparkleIcon
                className="text-primary mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default TripHighlights;
