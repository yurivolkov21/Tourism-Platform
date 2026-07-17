import type {
  DurationBucket,
  PriceBucket,
  RatingBucket,
  TourTheme,
  TravelStyle,
} from '@tourism/core';

export type ToursFilterState = {
  destinations: string[];
  categories: string[];
  durations: DurationBucket[];
  styles: TravelStyle[];
  themes: TourTheme[];
  prices: PriceBucket[];
  ratings: RatingBucket[];
};

export type FacetKey = keyof ToursFilterState;

/** Mirror Destinations: vertical = portrait carousel, horizontal = landscape list. */
export type TourViewMode = 'vertical' | 'horizontal';

export const EMPTY_TOURS_FILTERS: ToursFilterState = {
  destinations: [],
  categories: [],
  durations: [],
  styles: [],
  themes: [],
  prices: [],
  ratings: [],
};
