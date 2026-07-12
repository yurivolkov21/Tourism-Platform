import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';

/** "Value of the package" — themed value props (bold lead-in + paragraph) in a tinted brand panel. */
export function TourValue() {
  const t = messages.tourDetail.value;

  return (
    <TourSection title={t.heading} className="bg-primary/4 border-primary/15">
      <ul className="space-y-5">
        {t.props.map((prop) => (
          <li key={prop.title} className="flex gap-3">
            <span
              className="bg-primary mt-2 size-1.5 shrink-0 rounded-full"
              aria-hidden
            />
            <div>
              <h3 className="font-sans font-semibold">{prop.title}</h3>
              <p className="text-muted-foreground text-pretty">{prop.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </TourSection>
  );
}

export default TourValue;
