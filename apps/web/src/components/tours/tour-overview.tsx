import type { ReactNode } from 'react';
import { BedDoubleIcon, CalendarDaysIcon, ClockIcon, CompassIcon, MapPinIcon, UsersIcon } from 'lucide-react';

import { messages } from '@tourism/i18n';

import { TourSection } from './tour-section';
import type { TourDetailVM } from '../../lib/tours';

/** Overview panel — a short lead paragraph above a scannable icon-led spec grid (Lily-style). */
export function TourOverview({ tour }: { tour: TourDetailVM }) {
  const t = messages.tourDetail;
  const s = t.specs;
  const styleLabels = messages.toursPage.styleLabels;
  const themeLabels = messages.toursPage.themeLabels;

  const styles = (tour.travelStyles ?? []).map((k) => styleLabels[k]).join(', ');
  const themes = (tour.themes ?? []).map((k) => themeLabels[k]).join(', ');

  const rows: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <MapPinIcon className="size-5" />, label: s.destination, value: tour.destination },
    { icon: <ClockIcon className="size-5" />, label: s.duration, value: t.durationValue(tour.durationDays) },
    { icon: <CalendarDaysIcon className="size-5" />, label: s.departure, value: tour.departureFrequency },
    ...(styles ? [{ icon: <CompassIcon className="size-5" />, label: s.travelStyle, value: styles }] : []),
    ...(themes ? [{ icon: <UsersIcon className="size-5" />, label: s.theme, value: themes }] : []),
    { icon: <BedDoubleIcon className="size-5" />, label: s.accommodation, value: tour.accommodation },
  ];

  return (
    <TourSection title={t.overview}>
      {tour.overview ? (
        <p className="text-muted-foreground mb-6 text-lg text-pretty">{tour.overview}</p>
      ) : null}
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3">
            <span className="text-primary mt-0.5 shrink-0">{row.icon}</span>
            <div className="min-w-0">
              <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{row.label}</dt>
              <dd className="font-medium text-pretty">{row.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </TourSection>
  );
}

export default TourOverview;
