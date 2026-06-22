import { CheckIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

/** Tour highlights — a two-column checked list. */
export function TourHighlights({ items }: { items: string[] }) {
  const t = messages.tourDetail;

  return (
    <section>
      <h2 className="font-heading mb-6 text-2xl font-semibold sm:text-3xl">{t.highlights}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
              <CheckIcon className="size-3.5" />
            </span>
            <span className="text-pretty">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TourHighlights;
