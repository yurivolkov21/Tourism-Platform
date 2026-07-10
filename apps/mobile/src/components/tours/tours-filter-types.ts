import type {
  DurationBucket,
  PriceBucket,
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
};

export type FacetKey = keyof ToursFilterState;

export const EMPTY_TOURS_FILTERS: ToursFilterState = {
  destinations: [],
  categories: [],
  durations: [],
  styles: [],
  themes: [],
  prices: [],
};
