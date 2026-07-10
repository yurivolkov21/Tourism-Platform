import {
  formatShortDate,
  tourAvailability,
  type TourBadgeKey,
  type TourCardData,
} from '@tourism/core';
import { messages } from '@tourism/i18n';

export function getTourBadgeLabel(tour: TourCardData): string | undefined {
  const key = tour.badges[0] as TourBadgeKey | undefined;
  if (!key) return undefined;
  return messages.featuredTours.badges[key];
}

export function getTourAvailabilityProps(tour: TourCardData): {
  label?: string;
  urgent?: boolean;
} {
  const state = tourAvailability(
    tour.nextDepartureDate,
    tour.nextDepartureSeatsLeft,
  );
  const t = messages.availability;

  if (state.kind === 'onRequest') {
    return {};
  }
  if (state.kind === 'low') {
    return { label: t.seatsLeft(state.seatsLeft), urgent: true };
  }
  return { label: t.next(formatShortDate(state.date)), urgent: false };
}
