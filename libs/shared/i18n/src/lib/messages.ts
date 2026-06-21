// Centralized user-facing copy (EN-only, ADR-0005). Surfaces read from here — no inline strings.
// `as const` keeps literal types so consumers get autocomplete + safety.

export const messages = {
  brand: {
    // Placeholder project name — swap when the real brand is set.
    name: 'Tourism Platform',
  },
  nav: {
    tours: 'Tours',
    destinations: 'Destinations',
    about: 'About Us',
    contact: 'Contact',
    login: 'Log in',
    menu: 'Menu',
  },
  hero: {
    eyebrowBadge: 'Curated',
    eyebrowText: 'Boutique heritage travel',
    titleLead: 'Timeless journeys',
    titleAccent: 'across Vietnam',
    titleTail: 'crafted for you',
    subtitle:
      'Handpicked heritage tours, boutique stays, and private guides — discover the country’s culture and landscapes in refined comfort.',
    cta: 'Explore tours',
    imageAlt: 'A scenic heritage landscape in Vietnam',
  },
} as const;

export type Messages = typeof messages;
