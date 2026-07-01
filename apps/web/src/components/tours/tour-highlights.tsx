import { SparklesIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';

/** Marketing highlights — a scannable checklist of a tour's selling points. Hidden when empty. */
export function TourHighlights({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) return null;
  const t = messages.tourDetail;

  return (
    <TourSection title={t.highlights}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-pretty">
            <SparklesIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </TourSection>
  );
}

export default TourHighlights;
