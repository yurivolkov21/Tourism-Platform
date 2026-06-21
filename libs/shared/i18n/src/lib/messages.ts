// Centralized user-facing copy (EN-only, ADR-0005). Surfaces read from here — no inline strings.
// `as const` keeps literal types so consumers get autocomplete + safety.

export const messages = {
  brand: {
    // Placeholder project name — swap when the real brand is set.
    name: 'Tourism Platform',
  },
  topBar: {
    tagline: 'Vietnam’s boutique heritage travel, crafted end to end',
  },
  nav: {
    tours: 'Tours',
    destinations: 'Destinations',
    about: 'About Us',
    contact: 'Contact',
    login: 'Log in',
    menu: 'Menu',
    planTrip: 'Plan your trip',
    backToTop: 'Back to top',
    toursMenu: {
      label: 'Tours',
      items: [
        { label: 'All destinations', href: '#destinations', hint: 'Browse every place we cover' },
        { label: 'Northern Vietnam', href: '#destinations', hint: 'Hạ Long, Sa Pa, Hà Nội' },
        { label: 'Central Vietnam', href: '#destinations', hint: 'Hội An, Huế, Đà Nẵng' },
        { label: 'Southern Vietnam', href: '#destinations', hint: 'Mekong, Hồ Chí Minh City' },
      ],
    },
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
    searchLabel: 'Destination',
    searchPlaceholder: 'Where would you like to go?',
    searchCta: 'Search',
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
  experiences: {
    heading: 'Browse by experience',
    subtitle:
      'Prefer to start from a style of travel? Choose the kind of journey that excites you most.',
    viewAll: 'View all tours',
    toursLabel: 'tours',
    // Shape mirrors the TourCategory model (slug/name/description) + a derived tour count.
    items: [
      { slug: 'cruises', name: 'Cruises', description: 'Overnight bays and slow river journeys', tourCount: 9 },
      { slug: 'trekking', name: 'Trekking', description: 'Mountain trails and hill-tribe routes', tourCount: 7 },
      { slug: 'cultural', name: 'Cultural', description: 'Heritage towns, temples and history', tourCount: 14 },
      { slug: 'culinary', name: 'Culinary', description: 'Markets, street food and cooking', tourCount: 6 },
      { slug: 'family', name: 'Family', description: 'Easy-paced trips the whole family loves', tourCount: 8 },
      { slug: 'beach', name: 'Beach & relax', description: 'Island escapes and coastal stays', tourCount: 5 },
    ],
  },
  trust: {
    heading: 'Trusted by travellers worldwide',
    subtitle:
      'Real journeys, honest service, and the kind of care that turns first-time guests into lifelong travellers.',
    stats: [
      { value: '4.9/5', label: 'Average tour rating' },
      { value: '12,000+', label: 'Happy travellers' },
      { value: '60+', label: 'Curated itineraries' },
      { value: '24/7', label: 'On-trip support' },
    ],
  },
  testimonials: {
    eyebrow: 'Traveller stories',
    heading: 'Loved by travellers',
    subtitle:
      'Real words from guests who explored Vietnam with us — their journeys, told in their own voice.',
    items: [
      {
        name: 'Emily Carter',
        trip: 'Hạ Long Bay Cruise',
        location: 'Sydney, Australia',
        rating: 5,
        content:
          'Our overnight cruise was flawless from start to finish. The guide knew every hidden cave, and the sunrise over the karsts is something I will never forget.',
      },
      {
        name: 'Lukas Meyer',
        trip: 'Hội An Heritage Walk',
        location: 'Munich, Germany',
        rating: 5,
        content:
          'Wandering the lantern-lit old town with a local historian made Hội An come alive. Every detail of the trip was thoughtfully arranged.',
      },
      {
        name: 'Sophie Laurent',
        trip: 'Sa Pa Trekking',
        location: 'Lyon, France',
        rating: 4,
        content:
          'The hill-tribe trek was the highlight of our month in Vietnam — challenging, beautiful, and our guide looked after us the whole way.',
      },
      {
        name: 'Daniel Kim',
        trip: 'Mekong Delta Discovery',
        location: 'Seoul, South Korea',
        rating: 5,
        content:
          'Floating markets at dawn and home-cooked meals on the river — this tour showed us a side of Vietnam we would never have found alone.',
      },
    ],
  },
  about: {
    hero: {
      heading: 'Travel crafted by people who love this country',
      body: 'We are a small team of local experts devoted to slow, considered travel across Vietnam — turning every trip into a story worth telling.',
      cta: 'Read our story',
      imageAlt: 'Our team exploring Vietnam',
    },
    metrics: {
      heading: 'A decade of crafting journeys',
      subtitle:
        'Numbers we are proud of — built on years of local expertise and travellers who keep coming back.',
      items: [
        { value: '12+', label: 'Years crafting journeys' },
        { value: '40+', label: 'Local expert guides' },
        { value: '30+', label: 'Destinations curated' },
        { value: '98%', label: 'Travellers would return' },
      ],
    },
    team: {
      heading: 'The people behind your journey',
      subtitle: 'A small team of local experts who design, guide, and care for every trip we run.',
      members: [
        {
          name: 'Linh Nguyễn',
          role: 'Founder & Travel Curator',
          bio: 'Built the company around a love of Vietnam’s quieter corners and slow, considered travel.',
        },
        {
          name: 'Minh Trần',
          role: 'Head of Local Guides',
          bio: 'Leads our network of vetted, story-rich guides across every region we cover.',
        },
        {
          name: 'Hương Phạm',
          role: 'Trip Designer',
          bio: 'Crafts each itinerary to balance iconic sights with unhurried, personal discoveries.',
        },
        {
          name: 'David Lee',
          role: 'Guest Experience Lead',
          bio: 'Looks after every traveller from first enquiry through to a safe return home.',
        },
      ],
    },
    story: {
      heading: 'Our story',
      subtitle:
        'From a single guided walk to journeys across the country — built slowly, with care.',
      milestones: [
        {
          year: '2013',
          title: 'A first guided walk',
          description:
            'We began with intimate walking tours of Hà Nội’s old quarter, led by friends who knew its every corner.',
        },
        {
          year: '2016',
          title: 'Beyond the capital',
          description:
            'Demand grew, and so did we — adding cruises in Hạ Long Bay and treks across the northern highlands.',
        },
        {
          year: '2019',
          title: 'A network of local guides',
          description:
            'We built a vetted network of licensed guides spanning all three regions of Vietnam.',
        },
        {
          year: '2024',
          title: 'Journeys, end to end',
          description:
            'Today we craft seamless trips from first enquiry to safe return, for travellers from around the world.',
        },
      ],
    },
  },
  tourGallery: {
    eyebrow: 'Gallery',
    shareLabel: 'Share this trip',
    imageAlt: 'Photograph from the trip',
  },
  gallery: {
    heading: 'Moments from the journey',
    subtitle:
      'A glimpse of the landscapes, towns, and quiet corners our travellers discover along the way.',
  },
  tours: {
    eyebrow: 'All tours',
    heading: 'Find your journey',
    subtitle: 'Browse our curated trips by style, or search for a place you have in mind.',
    all: 'All',
    searchPlaceholder: 'Search tours',
    empty: 'No tours match your search yet.',
  },
  paymentTrust: {
    heading: 'Book with confidence',
    subtitle:
      'Every payment runs through secure, encrypted checkout — pay the way that suits you.',
    items: [
      { label: 'Secure checkout' },
      { label: 'SSL encrypted' },
      { label: 'Stripe payments' },
      { label: 'PayPal' },
    ],
  },
  faq: {
    eyebrow: 'FAQs',
    heading: 'Questions, answered',
    subtitle:
      'The things travellers ask us most, gathered in one place so you can plan with confidence.',
    seeAll: 'See all questions',
    items: [
      {
        question: 'How do I book a tour?',
        answer:
          'Browse our tours, choose a departure date, and send an enquiry or book online. Our team confirms availability and guides you through secure payment via Stripe or PayPal.',
      },
      {
        question: 'Can itineraries be customised?',
        answer:
          'Yes — most journeys can be tailored to your pace, interests, and group size. Share your preferences in an enquiry and our trip designers will adapt the plan.',
      },
      {
        question: 'Are your guides local and licensed?',
        answer:
          'Every trip is led by a vetted, licensed local guide chosen for their knowledge of the region and their care for travellers.',
      },
      {
        question: 'What is your cancellation policy?',
        answer:
          'Cancellation terms vary by tour and departure, and are shown on each tour page before you book. Our team is always happy to clarify the details.',
      },
    ],
  },
  contact: {
    heading: 'Contact us',
    intro: {
      title: 'Happy to help',
      body: 'Questions about a tour, a custom itinerary, or an existing booking? Our team is here at every step of the journey.',
    },
    info: [
      { title: 'Office hours', lines: ['Monday – Friday', '8:00 am – 6:00 pm (GMT+7)'] },
      { title: 'Our office', lines: ['12 Hàng Bài Street', 'Hoàn Kiếm, Hà Nội, Vietnam'] },
      { title: 'Call us', lines: ['+84 24 1234 5678', '+84 90 123 4567'] },
      { title: 'Email us', lines: ['hello@example.com', 'support@example.com'] },
    ],
  },
  enquiryCta: {
    heading: 'Let us plan your journey',
    subtitle:
      'Tell us how you like to travel and our local experts will craft an itinerary that fits you.',
    cta: 'Start planning',
    benefits: [
      'Tailored to your pace & interests',
      'Local experts — no middlemen',
      'A no-obligation itinerary & quote',
    ],
    form: {
      name: 'Your name',
      namePlaceholder: 'e.g. Alex Carter',
      email: 'Email address',
      emailPlaceholder: 'you@example.com',
      destination: 'Where would you like to go?',
      destinationPlaceholder: 'e.g. Hạ Long Bay, Hội An',
    },
    note: 'Free and no-obligation — we usually reply within 24 hours.',
  },
  footer: {
    tagline: 'Boutique heritage journeys across Vietnam, crafted with care.',
    motto: 'Travel that earns your trust',
    infoHeading: 'Information',
    toursHeading: 'Tours & service',
    socialHeading: 'Follow us',
    mapHeading: 'Find us on map',
    viewOnMap: 'View on map',
    newsletterHeading: 'Travel inspiration',
    newsletterText: 'Seasonal offers and new journeys, straight to your inbox.',
    newsletterPlaceholder: 'Your email',
    newsletterCta: 'Subscribe',
    exploreHeading: 'Explore',
    explore: [
      { label: 'Tours', href: '#tours' },
      { label: 'Destinations', href: '#destinations' },
      { label: 'About us', href: '#about' },
      { label: 'Contact', href: '#contact' },
    ],
    supportHeading: 'Support',
    support: [
      { label: 'FAQs', href: '#' },
      { label: 'Privacy Statement', href: '#' },
      { label: 'Terms & Conditions', href: '#' },
      { label: 'Contact', href: '#contact' },
    ],
    contactHeading: 'Contact',
    email: 'hello@example.com',
    phone: '+84 00 000 0000',
    rights: 'All rights reserved.',
  },
} as const;

export type Messages = typeof messages;
