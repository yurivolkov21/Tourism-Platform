/**
 * Saved (wishlist) tab copy.
 * Kept in the mobile app so Metro always picks up updates (workspace i18n
 * transforms can lag). Keep in sync with `messages.mobile.saved` in @tourism/i18n.
 */
export const savedScreenCopy = {
  title: 'Saved for later',
  emptyTitle: "It's empty in here",
  emptyHint: 'Save tours you like and find them here later.',
  exploreCta: 'Explore tours',
  removedToast: (title: string) => `Removed “${title}” from saved`,
  undo: 'Undo',
  empty: 'You haven’t saved any tours yet.',
} as const;
