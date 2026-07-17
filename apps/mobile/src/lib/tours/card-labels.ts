import {
  tourAvailability,
  type TourBadgeKey,
  type TourCardData,
} from '@tourism/core';
import { messages } from '@tourism/i18n';

/**
 * Badge priority (plan): Popular → Best value → New → Limited → Exclusive.
 * Only the first match is shown.
 */
const BADGE_PRIORITY: readonly TourBadgeKey[] = [
  'POPULAR',
  'BEST_VALUE',
  'NEW',
  'LIMITED_OFFER',
  'EXCLUSIVE',
] as const;

export function getTourBadgeLabel(tour: TourCardData): string | undefined {
  for (const key of BADGE_PRIORITY) {
    if (tour.badges.includes(key)) {
      return messages.featuredTours.badges[key];
    }
  }
  return undefined;
}

/**
 * Meaningful booking status only — hide generic “next departure” dates
 * that appear on almost every card.
 */
export function getTourAvailabilityProps(tour: TourCardData): {
  label?: string;
  urgent?: boolean;
} {
  const state = tourAvailability(
    tour.nextDepartureDate,
    tour.nextDepartureSeatsLeft,
  );
  const t = messages.availability;

  if (state.kind === 'low') {
    return { label: t.seatsLeft(state.seatsLeft), urgent: true };
  }
  return {};
}
