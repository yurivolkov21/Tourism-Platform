import {
  BackpackIcon,
  BedDoubleIcon,
  CarFrontIcon,
  CheckIcon,
  UtensilsIcon,
  XIcon,
} from 'lucide-react';

import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';

/** "What's included" — Lily-style structured rows: meals / transport / accommodation specs, then the
 * included-activities checklist, then a compact exclusions list. */
export function TourIncluded({
  meals,
  transport,
  accommodation,
  activities,
  excluded,
}: {
  meals: string;
  transport: string;
  accommodation: string;
  activities: string[];
  excluded: string[];
}) {
  const t = messages.tourDetail;
  const labels = t.inclusionLabels;

  const specRows = [
    {
      icon: <UtensilsIcon className="size-5" />,
      label: labels.meals,
      value: meals,
    },
    {
      icon: <CarFrontIcon className="size-5" />,
      label: labels.transport,
      value: transport,
    },
    {
      icon: <BedDoubleIcon className="size-5" />,
      label: labels.accommodation,
      value: accommodation,
    },
  ];

  return (
    <TourSection title={t.included}>
      <div className="divide-border/60 divide-y">
        {specRows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 py-3 first:pt-0"
          >
            <span className="text-primary mt-0.5 shrink-0">{row.icon}</span>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {row.label}
              </div>
              <div className="font-medium text-pretty">{row.value}</div>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3 py-3">
          <span className="text-primary mt-0.5 shrink-0">
            <BackpackIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {labels.activities}
            </div>
            <ul className="space-y-2">
              {activities.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-pretty"
                >
                  <CheckIcon className="text-success mt-0.5 size-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {excluded.length > 0 ? (
        <div className="border-border/60 mt-5 border-t pt-5">
          <h3 className="font-sans mb-3 text-sm font-semibold">
            {t.notIncluded}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {excluded.map((item) => (
              <li
                key={item}
                className="text-muted-foreground flex items-start gap-2.5 text-sm text-pretty"
              >
                <XIcon className="mt-0.5 size-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </TourSection>
  );
}

export default TourIncluded;
