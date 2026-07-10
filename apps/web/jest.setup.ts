// Jest DOM matchers (toBeInTheDocument, toBeEmptyDOMElement, ...) for component render specs.
import '@testing-library/jest-dom';

// jsdom does not implement matchMedia. GSAP's ScrollTrigger (pulled in transitively by
// marketing components via AnimatedContent/Marquee) calls it at import time, so a stub
// must be in place before any test module is required.
const noop = () => {
  /* no-op: jsdom never fires media-query change events */
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
