export const BROWSE_TABS = ['tours', 'destinations'] as const;
export type BrowseTab = (typeof BROWSE_TABS)[number];

export const BrowseTabIndex = {
  tours: 0,
  destinations: 1,
} as const satisfies Record<BrowseTab, number>;

export function browseTabFromIndex(index: number): BrowseTab {
  return index === BrowseTabIndex.destinations ? 'destinations' : 'tours';
}
