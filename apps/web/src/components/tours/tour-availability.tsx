import { CalendarDaysIcon, FlameIcon } from 'lucide-react';

import { cn } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { formatShortDate, tourAvailability } from '../../lib/tours/availability';

/**
 * Card availability badge: a warm "Only N seats left" pill when the nearest departure is filling up,
 * else a muted "Next: <date>" / "On request" line. Soft by design — never "sold out".
 * `onMedia` switches the neutral text colour for dark image-tile surfaces.
 */
export function TourAvailability({
  nextDepartureDate,
  nextDepartureSeatsLeft,
  onMedia = false,
  className,
}: {
  nextDepartureDate?: string | null;
  nextDepartureSeatsLeft?: number | null;
  onMedia?: boolean;
  className?: string;
}) {
  const t = messages.availability;
  const state = tourAvailability(nextDepartureDate, nextDepartureSeatsLeft);

  if (state.kind === 'low') {
    return (
      <span
        className={cn(
          // `w-fit` so a flex-column card parent (align-items: stretch) can't pull the pill full-width.
          'bg-warning text-warning-foreground inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
          className,
        )}
      >
        <FlameIcon className="size-3" />
        {t.seatsLeft(state.seatsLeft)}
      </span>
    );
  }

  const label = state.kind === 'next' ? t.next(formatShortDate(state.date)) : t.onRequest;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 text-xs font-medium',
        onMedia ? 'text-on-media/80' : 'text-muted-foreground',
        className,
      )}
    >
      <CalendarDaysIcon className="size-3.5" />
      {label}
    </span>
  );
}

export default TourAvailability;
