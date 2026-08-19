import { CheckIcon, XIcon } from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

/** Compact included/excluded recap (lighter than the tour-detail page's `TourIncluded` — no
 * meals/transport/accommodation spec rows, those are derived placeholders, not real per-tour data).
 * Hidden entirely when both lists are empty. */
export function TripInclusions({
  included,
  excluded,
}: {
  included: string[];
  excluded: string[];
}) {
  if (included.length === 0 && excluded.length === 0) return null;
  const t = messages.booking.success;

  return (
    <Card>
      <CardContent className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        {included.length > 0 && (
          <div>
            <h2 className="font-heading mb-3 text-xl font-semibold">
              {t.inclusionsHeading}
            </h2>
            <ul className="space-y-2">
              {included.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-pretty"
                >
                  <CheckIcon
                    className="text-success mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {excluded.length > 0 && (
          <div>
            <h2 className="font-heading mb-3 text-xl font-semibold">
              {t.notIncludedHeading}
            </h2>
            <ul className="space-y-2">
              {excluded.map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-start gap-2.5 text-sm text-pretty"
                >
                  <XIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TripInclusions;
