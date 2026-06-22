// Centralized user-facing copy (EN-only, ADR-0005). Surfaces read from here — no inline strings.
// `as const` keeps literal types so consumers get autocomplete + safety.

export const messages = {
  brand: {
    // Placeholder project name — swap when the real brand is set.
    name: 'Tourism Platform',
  },
  common: {
    home: 'Home',
    onThisPage: 'On this page',
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
        { label: 'Cruises', href: '#tours', hint: 'Overnight bays & river journeys' },
        { label: 'Trekking', href: '#tours', hint: 'Mountain trails & hill-tribe routes' },
        { label: 'Cultural', href: '#tours', hint: 'Heritage towns, temples & history' },
        { label: 'Culinary', href: '#tours', hint: 'Markets, street food & cooking' },
        { label: 'Family', href: '#tours', hint: 'Easy-paced trips for all ages' },
        { label: 'Beach & relax', href: '#tours', hint: 'Island escapes & coastal stays' },
      ],
    },
    destinationsMenu: {
      label: 'Destinations',
      items: [
        { label: 'All destinations', href: '/destinations', hint: 'Browse every place we cover' },
        { label: 'Northern Vietnam', href: '/destinations#northern-vietnam', hint: 'Hạ Long, Sa Pa, Ninh Bình' },
        { label: 'Central Vietnam', href: '/destinations#central-vietnam', hint: 'Hội An, Huế, Đà Nẵng' },
        { label: 'Southern Vietnam', href: '/destinations#southern-vietnam', hint: 'Mekong, Hồ Chí Minh City' },
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
  // `/destinations` overview page.
  destinationsPage: {
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'Vietnam tours',
    heroTitle: 'Explore Vietnam by destination',
    heroSubtitle:
      'From the misty north to the Mekong south — choose where your journey begins.',
    regionHeading: (region: string) => `Top destinations in ${region}`,
    // Short editorial blurb under each region heading (keyed by canonical region).
    regionIntro: {
      'Northern Vietnam':
        'Limestone bays, terraced highlands and the wild frontier passes — the north is Vietnam at its most dramatic.',
      'Central Vietnam':
        'Imperial heritage, lantern-lit old towns and a golden coastline strung between the mountains and the sea.',
      'Southern Vietnam':
        'River deltas, island beaches and the restless energy of Sài Gòn — the warm, easy-going south.',
    } as Record<string, string>,
    viewMore: 'View more',
    popularHeading: 'Most popular journeys',
    popularSubtitle: 'Traveller favourites across the country.',
  },
  // `/destinations/[slug]` destination page.
  destinationDetail: {
    backToAll: 'All destinations',
    toursHeading: (name: string) => `Tours in ${name}`,
    noTours: 'New journeys for this destination are coming soon.',
    valuePropsHeading: 'We’ve got you covered',
    valueProps: [
      {
        title: 'Luxury transfers',
        body: 'Door-to-door comfort with vetted private drivers on every leg of the trip.',
      },
      {
        title: 'Unique itineraries',
        body: 'Journeys shaped by local experts — not scripted, off-the-shelf tours.',
      },
      {
        title: 'Epic meals',
        body: 'Eat where Vietnam eats, from street stalls to riverside kitchens.',
      },
    ],
  },
  // `/destinations/[region]` region pages.
  regionPage: {
    backToAll: 'All destinations',
    introHeading: (region: string) => `The best ${region} tours`,
    itinerariesCta: (region: string) => `${region} itineraries`,
    bestForLabel: 'Best for',
    highlightsHeading: (region: string) => `What makes ${region} special`,
    toursHeading: 'Tours',
    allTab: 'All',
    noTours: 'New tours for this destination are coming soon.',
    galleryHeading: (region: string) => `${region} in photos`,
    gallerySubtitle: 'A glimpse of the landscapes, towns, and moments that await.',
    regions: {
      'Northern Vietnam': {
        tagline: 'From Sa Pa to Hạ Long Bay — culture and natural wonders in the misty north.',
        intro:
          'Awe-inspiring landscapes of limestone bays and terraced highlands, diverse hill-tribe cultures, and the frontier passes of the far north — this is Northern Vietnam at its most dramatic.',
        intro2:
          'Cruise the emerald karsts of Hạ Long, trek between Hmong and Dao villages around Sa Pa, and ride the legendary Hà Giang Loop. Browse our tours below, or read our itinerary suggestions.',
        tags: ['Cruises', 'Trekking', 'Hill-tribe culture', 'Mountain passes'],
        highlights: [
          { title: 'Emerald bays', body: 'Overnight on a junk among the limestone islands of Hạ Long and Lan Hạ.' },
          { title: 'Highland treks', body: 'Walk the rice terraces and hill-tribe trails around Sa Pa and Pù Luông.' },
          { title: 'The northern loop', body: 'Ride the switchbacks of Hà Giang past the Mã Pí Lèng pass.' },
        ],
        signature: {
          eyebrow: 'Signature',
          heading: 'Great northern adventures',
          body: 'The north rewards travellers who go further — onto the water, into the mountains, and out to the frontier. These are the journeys that define the region.',
          points: [
            'Overnight cruises through Hạ Long & Lan Hạ Bay',
            'Multi-day treks with Hmong and Dao guides',
            'The Hà Giang Loop and the far-northern passes',
          ],
          stats: [
            { value: '3+', label: 'Mountain regions' },
            { value: '2D 1N', label: 'Overnight cruises' },
            { value: '350km', label: 'The Hà Giang Loop' },
            { value: '3,143m', label: 'Fansipan summit' },
          ],
        },
      },
      'Central Vietnam': {
        tagline: 'Imperial heritage, lantern-lit old towns and a golden coastline.',
        intro:
          'Ancient citadels and UNESCO old towns beside white-sand beaches, and some of the world’s largest cave systems — Central Vietnam is the country’s cultural heart.',
        intro2:
          'Step inside the walled citadel of Huế, wander the lantern-lit lanes of Hội An, and explore the Chăm temples of Mỹ Sơn. Browse our tours below, or read our itinerary suggestions.',
        tags: ['Heritage', 'Old towns', 'Beaches', 'Caves'],
        highlights: [
          { title: 'Imperial Huế', body: 'The citadel, royal tombs, and refined cuisine of the Nguyễn emperors.' },
          { title: 'Hội An lanterns', body: 'A car-free UNESCO old town of tailors, tea houses, and riverside lights.' },
          { title: 'Golden coast', body: 'Đà Nẵng’s beaches and the Marble Mountains, the Bà Nà hills above.' },
        ],
        signature: {
          eyebrow: 'Signature',
          heading: 'The heritage trail',
          body: 'Few stretches of Vietnam hold so much history in so little distance. Follow the thread of empires and trade from the citadel to the old port.',
          points: [
            'The walled citadel and royal tombs of Huế',
            'Lantern-lit Hội An and the Thu Bồn river',
            'The Chăm sanctuary of Mỹ Sơn',
          ],
        },
      },
      'Southern Vietnam': {
        tagline: 'River deltas, island beaches and the restless energy of Sài Gòn.',
        intro:
          'Floating markets and flooded paddies, cosmopolitan cities and tropical islands — the warm, easy-going south runs at the pace of the water.',
        intro2:
          'Drift the Mekong’s waterways, trace history from the Củ Chi tunnels to the colonial centre, and unwind on the beaches of Phú Quốc. Browse our tours below, or read our itinerary suggestions.',
        tags: ['River life', 'Islands', 'City & history', 'Street food'],
        highlights: [
          { title: 'The Mekong', body: 'Floating markets at dawn, orchards, and riverside homestays.' },
          { title: 'Sài Gòn energy', body: 'Củ Chi tunnels, colonial landmarks, and endless street food.' },
          { title: 'Island escapes', body: 'White-sand beaches and clear seas on Phú Quốc.' },
        ],
        signature: {
          eyebrow: 'Signature',
          heading: 'Life on the water',
          body: 'In the south, the river is the road. Slow down to the rhythm of the delta and the islands, where days unfold on boats and beaches.',
          points: [
            'Dawn floating markets on the Mekong Delta',
            'Riverside homestays and orchard villages',
            'Island hopping around Phú Quốc',
          ],
        },
      },
    } as Record<
      string,
      {
        tagline: string;
        intro: string;
        intro2: string;
        tags: string[];
        highlights: { title: string; body: string }[];
        signature: {
          eyebrow: string;
          heading: string;
          body: string;
          points: string[];
          stats?: { value: string; label: string }[];
        };
      }
    >,
  },
  // `/destinations` — when to visit, by region (unique to the destinations page).
  bestTime: {
    heading: 'When to visit',
    subtitle:
      'Vietnam runs over 1,600km north to south, so the best season depends on where you go — a quick guide by region.',
    regions: [
      {
        region: 'Northern Vietnam',
        months: 'Mar–May · Sep–Nov',
        note: 'Cool, dry and clear — ideal for Hạ Long and the mountains. Winters turn chilly up high; summers bring rain.',
      },
      {
        region: 'Central Vietnam',
        months: 'Feb–Aug',
        note: 'Warm and dry along the coast and old towns. Avoid Oct–Dec, the wettest and most storm-prone months.',
      },
      {
        region: 'Southern Vietnam',
        months: 'Dec–Apr',
        note: 'The dry season for the Mekong and the islands. May–Nov is wetter but stays warm with short showers.',
      },
    ],
  },
  // `/destinations` — practical know-before-you-go tips (unique to the destinations page).
  travelTips: {
    heading: 'Know before you go',
    subtitle: 'A few practical notes to make planning your Vietnam trip easier.',
    items: [
      {
        title: 'Visas',
        body: 'Most nationalities can apply for a Vietnam e-visa online — sort it a couple of weeks ahead.',
      },
      {
        title: 'Money',
        body: 'The currency is the Vietnamese đồng (VND). Cards work in cities; carry small cash for markets.',
      },
      {
        title: 'Getting around',
        body: 'Domestic flights, trains and private transfers — we arrange every leg of your journey.',
      },
      {
        title: 'Staying connected',
        body: 'A cheap local SIM or eSIM at the airport gives you fast 4G almost everywhere you travel.',
      },
      {
        title: 'Health & safety',
        body: 'Vietnam is very safe for travellers. Drink bottled water and take the usual precautions.',
      },
      {
        title: 'What to pack',
        body: 'Layers for the north, light rain gear for the centre, and summer wear for the south.',
      },
    ],
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
    viewer: {
      label: 'Photo viewer',
      previous: 'Previous photo',
      next: 'Next photo',
      close: 'Close viewer',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      counter: (current: number, total: number) => `${current} / ${total}`,
    },
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
  // Dedicated `/faq` page — comprehensive, grouped Q&A.
  faqPage: {
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'FAQs',
    title: 'Frequently asked questions',
    subtitle:
      'Everything travellers ask us most, grouped so you can find your answer fast. Still unsure? Our team is one message away.',
    searchPlaceholder: 'Search questions…',
    searchLabel: 'Search frequently asked questions',
    noResults: 'No questions match your search. Try different keywords or contact our team.',
    ctaHeading: 'Still have a question?',
    ctaBody: 'Our trip designers reply within a day — tell us what you’re planning.',
    ctaButton: 'Ask our team',
    categories: [
      {
        title: 'Booking & payment',
        items: [
          {
            question: 'How do I book a tour?',
            answer:
              'Browse our tours, choose a departure date, and send an enquiry or book online. Our team confirms availability and guides you through secure payment.',
          },
          {
            question: 'What payment methods do you accept?',
            answer:
              'We accept major cards through Stripe and payments via PayPal. Every transaction runs through encrypted, secure checkout.',
          },
          {
            question: 'Do I pay a deposit or the full amount?',
            answer:
              'Most tours are held with a deposit, with the balance due before departure. The exact terms are shown on each tour before you confirm.',
          },
        ],
      },
      {
        title: 'Itineraries & customisation',
        items: [
          {
            question: 'Can itineraries be customised?',
            answer:
              'Yes — most journeys can be tailored to your pace, interests, and group size. Share your preferences in an enquiry and our trip designers will adapt the plan.',
          },
          {
            question: 'Can you arrange private or family tours?',
            answer:
              'Absolutely. We run private departures for couples, families, and small groups, with itineraries paced to suit everyone travelling.',
          },
          {
            question: 'Can you book flights, hotels, and transfers too?',
            answer:
              'We arrange domestic flights, hotels, and private transfers as part of your trip, so every leg is handled end to end.',
          },
        ],
      },
      {
        title: 'Guides & on-trip',
        items: [
          {
            question: 'Are your guides local and licensed?',
            answer:
              'Every trip is led by a vetted, licensed local guide chosen for their knowledge of the region and their care for travellers.',
          },
          {
            question: 'What is included in the tour price?',
            answer:
              'Inclusions are listed on each tour page — typically guiding, listed accommodation, transport, and the activities in the itinerary.',
          },
          {
            question: 'Is support available during the trip?',
            answer:
              'Yes. You have 24/7 on-trip support, so there is always someone to reach if plans change or you need a hand.',
          },
        ],
      },
      {
        title: 'Cancellations & changes',
        items: [
          {
            question: 'What is your cancellation policy?',
            answer:
              'Cancellation terms vary by tour and departure, and are shown on each tour page before you book. Our team is always happy to clarify the details.',
          },
          {
            question: 'Can I change my travel dates?',
            answer:
              'Date changes are usually possible subject to availability. Reach out as early as you can and we will do our best to re-arrange your trip.',
          },
          {
            question: 'What happens if you cancel a departure?',
            answer:
              'If we ever cancel a departure, you can move to another date or receive a full refund of what you paid us.',
          },
        ],
      },
      {
        title: 'Travelling in Vietnam',
        items: [
          {
            question: 'Do I need a visa?',
            answer:
              'Most nationalities can apply for a Vietnam e-visa online. Sort it a couple of weeks before you travel and we can point you to the official portal.',
          },
          {
            question: 'When is the best time to visit?',
            answer:
              'It depends on the region — the north is best in spring and autumn, the centre from February to August, and the south in the December–April dry season.',
          },
          {
            question: 'Is Vietnam safe for travellers?',
            answer:
              'Vietnam is very safe for visitors. Take the usual travel precautions, drink bottled water, and your guide will look after the rest.',
          },
        ],
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
  // Rich multi-field enquiry form ("Plan your trip") — maps the Enquiry model.
  planTrip: {
    heading: 'Plan your trip',
    subtitle:
      'Tell our local experts a little about your trip and we’ll craft a tailored itinerary and quote — free and no obligation.',
    benefits: [
      'Tailored to your pace, dates & budget',
      'Designed by local experts — no middlemen',
      'A no-obligation itinerary & quote in ~24h',
    ],
    fields: {
      name: 'Your name',
      namePlaceholder: 'e.g. Alex Carter',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      phone: 'Phone / WhatsApp',
      phonePlaceholder: 'Optional',
      nationality: 'Nationality',
      nationalityPlaceholder: 'e.g. Australian',
      travelDate: 'Approx. arrival date',
      travellers: 'Travellers',
      travellersPlaceholder: 'e.g. 2',
      message: 'Anything else?',
      messagePlaceholder: 'Tell us about your dream trip, must-sees, or any questions…',
    },
    durationLabel: 'How long in Vietnam?',
    duration: ['1–3 days', '4–6 days', 'About a week', '2+ weeks'],
    budgetLabel: 'Hotel preference',
    budget: ['Comfort · 3★', 'Premium · 4★', 'Luxury · 5★'],
    interestsLabel: 'What are you into?',
    interests: ['Cruises', 'Trekking', 'Culture & heritage', 'Food', 'Beaches & islands', 'Family'],
    submit: 'Send enquiry',
    note: 'Free and no-obligation — we usually reply within 24 hours.',
  },
  blog: {
    heading: 'Travel guides & stories',
    subtitle:
      'Practical guides and slow-travel inspiration from our local experts — to help you plan with confidence.',
    viewAll: 'Read the journal',
    readMore: 'Read more',
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
      { label: 'FAQs', href: '/faq' },
      { label: 'Privacy Statement', href: '/privacy' },
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Contact', href: '#contact' },
    ],
    contactHeading: 'Contact',
    email: 'hello@example.com',
    phone: '+84 00 000 0000',
    rights: 'All rights reserved.',
  },
} as const;

export type Messages = typeof messages;
