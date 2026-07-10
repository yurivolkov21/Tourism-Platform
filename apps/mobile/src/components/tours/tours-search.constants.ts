export const SEARCH_DIM_OPACITY = 0.45;
/** Android / no-blur fallback — light dim so recent panel stays readable */
export const SEARCH_SCRIM_OPACITY = 0.48;
export const SEARCH_BLUR_INTENSITY = 40;
/** iOS: softer tint on top of blur */
export const SEARCH_BLUR_SCRIM_OPACITY = 0.38;
/** Light theme: subtle wash behind the opaque recent card */
export const SEARCH_BACKDROP_DARK_OPACITY = 0.42;
export const SEARCH_DIM_SCALE = 0.98;
export const SEARCH_TITLE_EXIT_X = -16;
export const SEARCH_TITLE_SCALE_TO = 0.9;
export const SEARCH_BAR_SCALE_FROM = 0.94;
export const SEARCH_OVERLAY_ENTER_Y = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_RECENT_MAX = 4;
export const SEARCH_ICON_SIZE = 36;

/** Bar + “Recommendation” morph — higher damping = less bounce/jitter */
export const SEARCH_SPRING_OPEN = {
  damping: 26,
  stiffness: 195,
  mass: 0.9,
} as const;

export const SEARCH_SPRING_CLOSE = {
  damping: 28,
  stiffness: 230,
  mass: 0.85,
} as const;

/** Backdrop + recent */
export const SEARCH_OVERLAY_SPRING_OPEN = {
  damping: 24,
  stiffness: 170,
  mass: 0.95,
} as const;

export const SEARCH_OVERLAY_SPRING_CLOSE = {
  damping: 26,
  stiffness: 210,
  mass: 0.9,
} as const;

/** @deprecated use SEARCH_SPRING_OPEN */
export const SEARCH_SPRING = SEARCH_SPRING_OPEN;
