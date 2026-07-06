import {
  filterTours,
  searchTours,
  sortTours,
  type DurationBucket,
  type PriceBucket,
  type TourSort,
} from '@tourism/core';
import type { TourCardVm } from './tours';

/** Everything the Explore screen's filters know. `destination` holds the display NAME. */
export interface ExploreState {
  query: string;
  destination?: string;
  durations: DurationBucket[];
  prices: PriceBucket[];
  sort: TourSort;
}

export const defaultExploreState: ExploreState = {
  query: '',
  durations: [],
  prices: [],
  sort: 'popular',
};

/** Immutable multi-select toggle for bucket chips. */
export function toggleBucket<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function hasActiveFilters(state: ExploreState): boolean {
  return (
    state.query.trim() !== '' ||
    state.destination !== undefined ||
    state.durations.length > 0 ||
    state.prices.length > 0
  );
}

/** search → filter → sort, all pure `@tourism/core` helpers. */
export function applyExploreState(
  tours: readonly TourCardVm[],
  state: ExploreState,
): TourCardVm[] {
  const searched = searchTours(tours, state.query);
  const filtered = filterTours(searched, {
    destinations: state.destination ? [state.destination] : undefined,
    durations: state.durations.length > 0 ? state.durations : undefined,
    prices: state.prices.length > 0 ? state.prices : undefined,
  });
  return sortTours(filtered, state.sort);
}
