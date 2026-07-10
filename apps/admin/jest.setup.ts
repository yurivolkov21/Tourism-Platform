// Jest DOM matchers (toBeInTheDocument, ...) for component render specs.
import '@testing-library/jest-dom';

// jsdom implements neither matchMedia nor IntersectionObserver; motion/react's
// useReducedMotion + in-view detection touch both, so stub them before any test
// module is required.
const noop = () => {
  /* no-op: jsdom never fires these events */
};

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class IO {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
    takeRecords = () => [];
  }
  window.IntersectionObserver = IO as unknown as typeof IntersectionObserver;
}
