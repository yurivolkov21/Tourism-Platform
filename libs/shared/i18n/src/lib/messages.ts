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
  features: {
    heading: 'Why travel with us',
    subtitle:
      'Thoughtful details and trusted service that make every journey effortless, safe, and memorable.',
    cta: 'Browse all tours',
    items: [
      {
        title: 'Curated itineraries',
        description:
          'Handpicked journeys crafted by local experts — iconic sights and hidden gems in balance.',
      },
      {
        title: 'Secure booking',
        description:
          'Pay safely with Stripe and PayPal; your personal and payment details stay protected end to end.',
      },
      {
        title: 'Local expert guides',
        description:
          'Travel with vetted, knowledgeable guides who bring the culture and history of each place to life.',
      },
      {
        title: 'Verified reviews',
        description:
          'Make confident choices with real ratings and reviews from travellers who booked with us.',
      },
      {
        title: 'Flexible departures',
        description:
          'Choose dates that suit you, with clear seat availability and easy changes before you travel.',
      },
      {
        title: '24/7 support',
        description:
          'Our team is on hand before, during, and after your trip — wherever your journey takes you.',
      },
    ],
  },
  featuredTours: {
    heading: 'Featured journeys',
    subtitle:
      'A selection of our most-loved tours — handcrafted routes, trusted guides, and honest prices.',
    viewAll: 'View all tours',
    view: 'View tour',
    from: 'From',
    perPerson: '/ person',
    daysLabel: 'days',
    reviewsLabel: 'reviews',
    // Labels for TourBadge enum values (backend).
    badges: {
      BEST_VALUE: 'Best value',
      LIMITED_OFFER: 'Limited offer',
      EXCLUSIVE: 'Exclusive',
      NEW: 'New',
      POPULAR: 'Popular',
    },
  },
  destinations: {
    heading: 'Explore by destination',
    subtitle:
      'Begin with a place that calls to you — then let the journey unfold from there.',
    viewAll: 'View all destinations',
    toursLabel: 'tours',
  },
} as const;

export type Messages = typeof messages;
