import { DESTINATION_OTHER_REGION } from '@tourism/core';

export type DestinationFacetKey = 'regions';

export type DestinationsFilterState = {
  regions: string[];
};

export const EMPTY_DESTINATIONS_FILTERS: DestinationsFilterState = {
  regions: [],
};

export const DESTINATION_REGION_OPTIONS = [
  'Northern Vietnam',
  'Central Vietnam',
  'Southern Vietnam',
  DESTINATION_OTHER_REGION,
] as const;

export { DESTINATION_OTHER_REGION };
