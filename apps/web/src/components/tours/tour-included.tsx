import { CheckIcon, XIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

/** "What's included" — included list (check) beside the exclusions (x). */
export function TourIncluded({
  included,
  notIncluded,
}: {
  included: string[];
  notIncluded: string[];
}) {
  const t = messages.tourDetail;

  return (
    <section>
      <h2 className="font-heading mb-6 text-2xl font-semibold sm:text-3xl">{t.included}</h2>
      <div className="grid gap-8 sm:grid-cols-2">
        <ul className="space-y-3">
          {included.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-pretty">
              <CheckIcon className="text-success mt-0.5 size-5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <div>
          <h3 className="font-sans mb-3 font-semibold">{t.notIncluded}</h3>
          <ul className="space-y-3">
            {notIncluded.map((item) => (
              <li
                key={item}
                className="text-muted-foreground flex items-start gap-2.5 text-pretty"
              >
                <XIcon className="mt-0.5 size-5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default TourIncluded;
