/* eslint-disable */
/**
 * Fixture generator for @tourism/api.
 * Authors the canonical dataset ONCE, then emits:
 *   - sample-data.ts            (typed, Prisma enum references)
 *   - json/<model>.json         (plain JSON, identical records)
 * Also self-validates: FK integrity, uniqueness, enum validity, VarChar caps,
 * and coverage of every named enum value.
 *
 * Run: node gen.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const JSON_DIR = path.join(OUT, 'json');
fs.mkdirSync(JSON_DIR, { recursive: true });

// ── UUID helper (valid 8-4-4-4-12 shape, deterministic & readable) ───────────
const uid = (tag /* 8 hex */, n) =>
  `${tag}-0000-4000-8000-${String(n).padStart(12, '0')}`;

// ── Date helper: 'YYYY-MM-DD' or ISO, offset from a fixed base (2026-07-01) ──
const BASE = Date.UTC(2026, 6, 1); // months 0-indexed → July
const DAY = 86400000;
const d = (offset) => new Date(BASE + offset * DAY).toISOString().slice(0, 10);
const ts = (offset, hour = 9) =>
  new Date(BASE + offset * DAY + hour * 3600000).toISOString();

// ── Boundary-text helper: real prose sliced to EXACTLY `cap` characters ──────
function fillTo(cap, pool) {
  let s = '';
  let i = 0;
  while (s.length < cap) {
    s += (s ? ' ' : '') + pool[i % pool.length];
    i++;
  }
  return s.slice(0, cap);
}

const DEST_POOL = [
  'The valley opens at dawn to a patchwork of flooded rice terraces that mirror the sky.',
  'Limestone karsts rise straight from jade water, their caves hiding lagoons reachable only by kayak.',
  'Narrow lanes wind past ochre merchant houses, tailors, and lantern-makers who have worked here for generations.',
  'Fishing boats return at first light while vendors ferry pyramids of fruit between sampans on the current.',
  'Mist settles over the pass each morning, lifting to reveal terraced slopes and remote hamlets below.',
  'Imperial tombs and pagodas line the river, their courtyards quiet beneath old frangipani trees.',
  'Street kitchens fire up before sunrise, filling the alleys with the smell of star anise and charcoal.',
  'A cable car climbs into cool highland forest where French villas cling to the ridgeline.',
  'White dunes roll toward the sea, shifting colour from cream to rose as the sun crosses them.',
  'Coral gardens fringe the archipelago, the water so clear the reef seems to float just below the hull.',
];
const POLICY_POOL = [
  'A non-refundable deposit of thirty percent of the total tour price is required to confirm every booking, and the outstanding balance falls due no later than the first day of the tour.',
  'Cancellations received fifteen or more days before the scheduled departure date forfeit fifty percent of the paid deposit; the remainder is returned to the original method of payment within ten business days.',
  'Cancellations received between seven and fifteen days before departure forfeit seventy-five percent of the deposit, and no portion of any balance already paid toward the tour is recoverable.',
  'Cancellations received within seven days of departure, and all no-shows, forfeit one hundred percent of monies paid, without exception, as supplier costs have by then been irrevocably committed.',
  'Requests to change a departure date are treated as a cancellation and rebooking, are always subject to availability, and may attract a difference in price where the new date sits in a higher season.',
  'Where the operator cancels a departure for reasons of force majeure, including but not limited to severe weather, flooding, or government restriction, guests are offered an alternative date or a credit valid for eighteen months.',
  'Travel insurance covering cancellation, medical treatment, and evacuation is strongly recommended for every guest and is the sole responsibility of the traveller to arrange before arrival.',
  'Prices are quoted per person in United States dollars, are based on twin-share occupancy, and exclude international airfare, visa fees, personal expenses, and gratuities unless expressly stated in the inclusions.',
  'The operator reserves the right to substitute hotels, guides, or vehicles of an equivalent or superior standard, and to adjust the running order of the itinerary where local conditions require it.',
  'By confirming a booking the lead traveller warrants that every member of the party is in adequate health to undertake the activities described and accepts the physical grading assigned to this tour.',
];
const REVIEW_POOL = [
  'From the first pickup to the final farewell the organisation was faultless and the pace judged perfectly for our group.',
  'Our guide had an encyclopaedic knowledge of the region and a gift for finding the quiet corners the big coaches never reach.',
  'The scenery genuinely exceeded the photographs, and we came away with a much deeper sense of the culture than we expected.',
  'Small touches — cold towels on the boat, a birthday surprise at dinner, an umbrella produced the moment it rained — made the trip feel personal.',
  'It was physically more demanding than we anticipated, but the support was constant and nobody in the party felt left behind.',
  'Communication before the tour was prompt and clear, every question answered within hours, which set the tone for the whole experience.',
  'We would not hesitate to book with this agency again and have already recommended them to three sets of friends back home.',
  'The food alone would have been worth the price, a parade of dishes we would never have found on our own.',
];
const ENQUIRY_POOL = [
  'We are a family of four hoping to travel through central Vietnam in the shoulder season and would like a private guide throughout.',
  'Could you advise whether the cruise cabins can be configured for a couple travelling with two teenagers, and what the single supplement would be?',
  'We are celebrating a fortieth wedding anniversary and would like to add a private dinner and a photographer for one evening.',
  'Our group of eight friends is fairly active and would prefer the more strenuous trekking options over the sightseeing days.',
  'We have dietary requirements, two vegetarians and one coeliac, and want to be sure every included meal can accommodate them.',
  'Flights are not yet booked, so we are flexible on dates within October and would value your advice on the best week for weather.',
  'Please could you send a detailed day-by-day itinerary with hotel names so we can compare it against another quote we have received.',
  'We would like to extend the trip with three nights on the coast at the end and need help arranging the internal transfer.',
];

// ═══════════════════════════════════════════════════════════════════════════
// USERS (24) — Unicode names, boundary fullName, null phone/fullName, 2 admins
// ═══════════════════════════════════════════════════════════════════════════
const U = 'a0000001';
const S = '5b000001';
const userDefs = [
  [
    'emma.thompson@example.com',
    'Emma Thompson',
    '+44 7700 900112',
    'CUSTOMER',
    'United Kingdom',
  ],
  [
    'james.miller@example.com',
    'James Miller',
    '+1 415 555 0142',
    'CUSTOMER',
    'United States',
  ],
  [
    'sophie.dubois@example.com',
    'Sophie Dubois',
    '+33 6 12 34 56 78',
    'CUSTOMER',
    'France',
  ],
  [
    'lukas.mueller@example.com',
    'Lukas Müller',
    '+49 151 23456789',
    'CUSTOMER',
    'Germany',
  ],
  [
    'olivia.nguyen@example.com',
    'Olivia Nguyễn',
    '+61 412 345 678',
    'CUSTOMER',
    'Australia',
  ],
  [
    'marco.rossi@example.com',
    'Marco Rossi',
    '+39 320 123 4567',
    'CUSTOMER',
    'Italy',
  ],
  [
    'hana.tanaka@example.com',
    'Hana Tanaka',
    '+81 90 1234 5678',
    'CUSTOMER',
    'Japan',
  ],
  [
    'noah.anderson@example.com',
    'Noah Anderson',
    '+1 604 555 0176',
    'CUSTOMER',
    'Canada',
  ],
  [
    'dang.thi.mai@example.com',
    'Đặng Thị Mai',
    '+84 90 123 4567',
    'CUSTOMER',
    'Vietnam',
  ],
  [
    'tran.van.hung@example.com',
    'Trần Văn Hùng',
    '+84 91 234 5678',
    'CUSTOMER',
    'Vietnam',
  ],
  [
    'jose.garcia@example.com',
    'José García',
    '+34 612 345 678',
    'CUSTOMER',
    'Spain',
  ],
  [
    'soren.jensen@example.com',
    'Søren Jensen',
    '+45 20 12 34 56',
    'CUSTOMER',
    'Denmark',
  ],
  [
    'bjorn.akesson@example.com',
    'Björn Åkesson',
    '+46 70 123 45 67',
    'CUSTOMER',
    'Sweden',
  ],
  ['renee.levesque@example.com', 'Renée Lévesque', null, 'CUSTOMER', 'Canada'],
  [
    'zoe.oneill@example.com',
    "Zoë O'Neill",
    '+353 85 123 4567',
    'CUSTOMER',
    'Ireland',
  ],
  [
    'chloe.martin@example.com',
    'Chloé Martin',
    '+33 7 65 43 21 09',
    'CUSTOMER',
    'France',
  ],
  [
    'piotr.kowalski@example.com',
    'Piotr Kowalski',
    '+48 512 345 678',
    'CUSTOMER',
    'Poland',
  ],
  [
    'mateus.oliveira@example.com',
    'Mateus Oliveira',
    '+55 11 91234 5678',
    'CUSTOMER',
    'Brazil',
  ],
  [
    'ananya.iyer@example.com',
    'Ananya Iyer',
    '+91 98765 43210',
    'CUSTOMER',
    'India',
  ],
  [
    'wei.chen@example.com',
    'Wei Chen',
    '+65 8123 4567',
    'CUSTOMER',
    'Singapore',
  ],
  // boundary: fullName null + phone null
  ['maria.fernandez@example.com', null, null, 'CUSTOMER', 'Spain'],
  // boundary: fullName at exactly 120 chars
  [
    'long.name@example.com',
    fillTo(120, [
      'María de los Ángeles Fernández de la Vega Sáenz de Santamaría del Río Guzmán y Bolaños de la Concepción Herrera Montalbán',
    ]),
    '+34 600 000 000',
    'CUSTOMER',
    'Spain',
  ],
  // admins
  [
    'admin@nexora.travel',
    'Nexora Site Admin',
    '+84 24 3826 0000',
    'ADMIN',
    'Vietnam',
  ],
  [
    'editor@nexora.travel',
    'Nguyễn Quản Trị',
    '+84 24 3826 0001',
    'ADMIN',
    'Vietnam',
  ],
];
const users = userDefs.map((r, i) => ({
  id: uid(U, i + 1),
  supabaseId: uid(S, i + 1),
  email: r[0],
  fullName: r[1],
  phone: r[2],
  locale: 'en',
  role: r[3],
  createdAt: ts(-200 + i, 8),
  updatedAt: ts(-10 + (i % 5), 8),
}));
const adminId = users.find((u) => u.role === 'ADMIN').id;
const editorId = users.filter((u) => u.role === 'ADMIN')[1].id;

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES (6, one inactive)
// ═══════════════════════════════════════════════════════════════════════════
const C = 'b0000001';
const catDefs = [
  [
    'day',
    'Day Tours',
    'Single-day experiences and excursions, back to your hotel by evening.',
    1,
    true,
  ],
  [
    'package',
    'Multi-day Packages',
    'Multi-day journeys combining several regions with overnight stays.',
    2,
    true,
  ],
  [
    'cruise',
    'Cruises',
    'Overnight bay and river cruises aboard boutique junks and sampans.',
    3,
    true,
  ],
  [
    'trekking',
    'Trekking & Adventure',
    'Mountain treks, homestays, and active adventures off the tarmac.',
    4,
    true,
  ],
  [
    'honeymoon',
    'Honeymoon',
    'Romantic, unhurried itineraries designed for couples.',
    5,
    true,
  ],
  [
    'seasonal-classics',
    'Seasonal Classics',
    'Retired seasonal departures kept for archival reference only.',
    6,
    false,
  ],
];
const categories = catDefs.map((r, i) => ({
  id: uid(C, i + 1),
  slug: r[0],
  name: r[1],
  description: r[2],
  order: r[3],
  isActive: r[4],
  createdAt: ts(-190, 8),
  updatedAt: ts(-30, 8),
}));
const catId = (slug) => categories.find((c) => c.slug === slug).id;

// ═══════════════════════════════════════════════════════════════════════════
// DESTINATIONS (16, one inactive, one description at 2000-char cap)
// ═══════════════════════════════════════════════════════════════════════════
const D = 'c0000001';
const destDefs = [
  [
    'hanoi',
    'Hà Nội',
    'Northern Vietnam',
    'A thousand-year-old capital where French boulevards meet the motorbike-filled Old Quarter, lakeside temples, and legendary street food.',
    true,
  ],
  [
    'ha-long-bay',
    'Hạ Long Bay',
    'Northern Vietnam',
    'A UNESCO seascape of thousands of limestone karsts rising from emerald water, best explored by overnight cruise, kayak, and hidden lagoon.',
    true,
  ],
  [
    'ninh-binh',
    'Ninh Bình',
    'Northern Vietnam',
    'The "Ha Long Bay on land": bamboo boats threading cave-pierced karst at Tam Cốc and Tràng An, the ancient capital of Hoa Lư, and the Mua Cave viewpoint.',
    true,
  ],
  [
    'sa-pa',
    'Sa Pa',
    'Northern Vietnam',
    'A misty mountain town overlooking emerald rice terraces, home to Hmong, Dao and Tày villages and Fansipan, Indochina’s highest peak.',
    true,
  ],
  [
    'ha-giang',
    'Hà Giang',
    'Northern Vietnam',
    'Vietnam’s wild northern frontier, where the legendary loop winds past the Mã Pí Lèng pass, limestone plateaus, and remote hamlets.',
    true,
  ],
  [
    'cat-ba',
    'Cát Bà',
    'Northern Vietnam',
    'The largest island off Hải Phòng, gateway to quiet Lan Hạ Bay, a national park of langurs, and a working fishing harbour.',
    true,
  ],
  [
    'da-nang',
    'Đà Nẵng',
    'Central Vietnam',
    'A breezy coastal city of long beaches and river bridges, gateway to the Marble Mountains and the Golden Bridge at Bà Nà Hills.',
    true,
  ],
  [
    'hoi-an',
    'Hội An',
    'Central Vietnam',
    'A UNESCO-listed ancient town glowing with silk lanterns, riverside cafes, centuries-old merchant houses, tailors, and a famous cooking scene.',
    true,
  ],
  [
    'hue',
    'Huế',
    'Central Vietnam',
    'The imperial capital of the Nguyễn dynasty: a walled citadel, royal tombs along the Perfume River, and the Thiên Mụ Pagoda.',
    true,
  ],
  [
    'phong-nha',
    'Phong Nha',
    'Central Vietnam',
    'A UNESCO karst national park hiding some of the world’s grandest caves, river-boat grottoes, and jungle kayaking.',
    true,
  ],
  [
    'ho-chi-minh-city',
    'Hồ Chí Minh City',
    'Southern Vietnam',
    'The energetic south’s commercial heart (Saigon): colonial landmarks, war history, rooftop bars, and the Củ Chi tunnels on its doorstep.',
    true,
  ],
  [
    'mekong-delta',
    'Mekong Delta',
    'Southern Vietnam',
    'A watery maze of rivers, orchards and floating markets where life moves by sampan, best seen at dawn on the Cái Răng market.',
    true,
  ],
  [
    'phu-quoc',
    'Phú Quốc',
    'Southern Vietnam',
    'Vietnam’s largest island: white-sand beaches, pepper farms, an island cable car, and the clear snorkelling of the An Thới archipelago.',
    true,
  ],
  [
    'mui-ne',
    'Mũi Né',
    'Southern Vietnam',
    'A laid-back fishing-village resort famous for its red and white sand dunes, kite-surfing, and the Fairy Stream.',
    true,
  ],
  // boundary: description at exactly 2000 chars
  ['da-lat', 'Đà Lạt', 'Central Vietnam', fillTo(2000, DEST_POOL), true],
  // inactive
  [
    'con-dao',
    'Côn Đảo',
    'Southern Vietnam',
    'A remote former-prison archipelago now prized for turtle-nesting beaches and diving; departures currently suspended.',
    false,
  ],
];
const destinations = destDefs.map((r, i) => ({
  id: uid(D, i + 1),
  slug: r[0],
  name: r[1],
  country: 'Vietnam',
  region: r[2],
  description: r[3],
  isActive: r[4],
  createdAt: ts(-185, 8),
  updatedAt: ts(-25, 8),
}));
const destId = (slug) => destinations.find((x) => x.slug === slug).id;

// ═══════════════════════════════════════════════════════════════════════════
// TOURS (24) — every category/difficulty/badge/travellerType; published/draft;
// compareAtPrice null & set; title@200 & summary@500 caps; decimal precision.
// ═══════════════════════════════════════════════════════════════════════════
const T = 'd0000001';
// [slug, destSlugs[], catSlug, title, summary, durationDays, maxGroupSize,
//  basePrice, compareAtPrice|null, difficulty, isPublished, isFeatured,
//  suitableFor[], badges[], highlights[], included[], excluded[], meetingPoint]
const tourDefs = [
  [
    'hoi-an-walking-tour',
    ['hoi-an'],
    'day',
    'Hội An Ancient Town Walking Tour',
    'A guided half-day stroll through the lantern-lit UNESCO old town, ending with a paper lantern floated down the Thu Bồn river at dusk.',
    1,
    12,
    39.0,
    49.0,
    'easy',
    true,
    true,
    ['COUPLE', 'FAMILY', 'SOLO'],
    ['POPULAR'],
    [
      'Wander 200-year-old merchant houses and the Japanese Covered Bridge',
      'Watch silk lanterns light the old town at dusk',
      'Float your own paper lantern on the Thu Bồn river',
      'Taste cao lầu and white-rose dumplings',
    ],
    [
      'Local English-speaking guide',
      'Heritage-site entrance tickets',
      'Paper lantern',
      'Bottled water',
    ],
    ['Lunch', 'Personal expenses', 'Tips'],
    'Hội An tourist information centre, 78 Lê Lợi street',
  ],
  [
    'ba-na-hills-day',
    ['da-nang'],
    'day',
    'Bà Nà Hills & Golden Bridge Day Trip',
    'Ride the record-breaking cable car to the Golden Bridge, the French Village and Fantasy Park, high in the cool hills above Đà Nẵng.',
    1,
    18,
    79.0,
    95.0,
    'easy',
    true,
    true,
    ['FAMILY', 'COUPLE', 'FRIENDS'],
    ['POPULAR', 'BEST_VALUE'],
    [
      'The iconic Golden Bridge held by two giant stone hands',
      'A record-breaking cable car into the highland forest',
      'Le Jardin gardens and the Linh Ứng pagoda',
      'Indoor Fantasy Park games and a buffet lunch',
    ],
    [
      'Hotel pickup & drop-off in Đà Nẵng',
      'Cable car tickets',
      'Fantasy Park entrance',
      'Buffet lunch',
      'English-speaking guide',
      'Insurance',
    ],
    ['Drinks during meals', 'Wax museum & wine tasting', 'Personal expenses'],
    'Hotel pickup in Đà Nẵng (7:00–8:00 AM)',
  ],
  [
    'hue-imperial-day',
    ['hue'],
    'day',
    'Huế Imperial City Full-Day Tour',
    'Explore the walled citadel, the royal tombs of the Nguyễn emperors and the Thiên Mụ Pagoda, with a relaxed dragon-boat ride on the Perfume River.',
    1,
    16,
    55.0,
    null,
    'easy',
    true,
    false,
    ['COUPLE', 'SOLO', 'FAMILY'],
    [],
    [
      'The Imperial Citadel and the Forbidden Purple City',
      'Royal tombs of Tự Đức and Khải Định',
      'A dragon-boat ride to the Thiên Mụ Pagoda',
    ],
    [
      'English-speaking guide',
      'Monument entrance fees',
      'Dragon-boat ride',
      'Lunch',
      'Bottled water',
    ],
    ['Drinks', 'Personal expenses', 'Tips'],
    'Hotel pickup in central Huế',
  ],
  [
    'ninh-binh-day',
    ['ninh-binh'],
    'day',
    'Ninh Bình: Hoa Lư, Tam Cốc & Mua Cave',
    'A full day in the "Ha Long Bay on land": the ancient capital of Hoa Lư, a bamboo-boat ride through the Tam Cốc caves, and the climb to Mua Cave.',
    1,
    20,
    49.0,
    59.0,
    'moderate',
    true,
    false,
    ['FRIENDS', 'COUPLE', 'SOLO'],
    ['BEST_VALUE'],
    [
      'The 10th-century temples of Hoa Lư',
      'A bamboo boat ride through the Tam Cốc caves',
      'The 500-step climb to the Mua Cave panorama',
      'Cycling through quiet rice-field villages',
    ],
    [
      'Round-trip transfer from Hà Nội',
      'English-speaking guide',
      'Bamboo boat ride',
      'Buffet lunch',
      'Bicycle hire',
      'Entrance fees',
    ],
    ['Drinks', 'Boat-rower tips', 'Personal expenses'],
    'Hà Nội Old Quarter hotel pickup',
  ],
  [
    'cu-chi-tunnels-half-day',
    ['ho-chi-minh-city'],
    'day',
    'Củ Chi Tunnels Half-Day Tour',
    'Crawl a section of the legendary Củ Chi tunnel network and learn how an underground city sustained life during the war, just outside Saigon.',
    1,
    20,
    29.0,
    null,
    'easy',
    true,
    false,
    ['SOLO', 'FRIENDS', 'FAMILY'],
    [],
    [
      'Crawl through a widened section of the tunnels',
      'See the trap, kitchen and ventilation systems',
      'A guide who brings the history vividly to life',
    ],
    [
      'Round-trip transfer from Hồ Chí Minh City',
      'English-speaking guide',
      'Tunnel entrance fee',
      'Bottled water',
    ],
    ['Lunch', 'Shooting range', 'Tips'],
    'District 1 hotel pickup, Hồ Chí Minh City',
  ],
  [
    'mekong-delta-day',
    ['mekong-delta'],
    'day',
    'Mekong Delta & Cái Răng Floating Market',
    'Drift through the Cái Răng floating market at dawn, then slip into the narrow orchard channels by sampan for a taste of life on the river.',
    1,
    16,
    45.0,
    null,
    'easy',
    true,
    false,
    ['FAMILY', 'COUPLE', 'SOLO'],
    [],
    [
      'The Cái Răng floating market at first light',
      'A sampan ride into quiet orchard channels',
      'Tropical fruit, a rice-noodle workshop and a riverside lunch',
    ],
    [
      'Transfer from Hồ Chí Minh City',
      'English-speaking guide',
      'Boat trips',
      'Lunch',
      'Seasonal fruit tasting',
    ],
    ['Drinks', 'Personal expenses', 'Tips'],
    'District 1 hotel pickup, Hồ Chí Minh City (early start)',
  ],
  [
    'phu-quoc-4-islands',
    ['phu-quoc'],
    'day',
    'Phú Quốc 4-Islands Snorkelling Cruise',
    'A full-day speedboat hop around the An Thới archipelago with two snorkel stops over coral reefs and a fresh seafood lunch on board.',
    1,
    18,
    52.0,
    65.0,
    'easy',
    true,
    true,
    ['FRIENDS', 'COUPLE', 'FAMILY'],
    ['POPULAR'],
    [
      'Snorkel two coral reefs in the clearest water in Vietnam',
      'Island-hop the An Thới archipelago by speedboat',
      'A fresh seafood BBQ lunch on the water',
      'Optional ride on the sea-crossing cable car',
    ],
    [
      'Speedboat cruise',
      'Snorkel gear',
      'Seafood lunch',
      'English-speaking guide',
      'Insurance',
    ],
    ['Cable car ticket', 'Drinks', 'Fishing gear hire'],
    'An Thới harbour, Phú Quốc',
  ],
  [
    'phong-nha-paradise-cave-day',
    ['phong-nha'],
    'day',
    'Phong Nha & Paradise Cave Full-Day',
    'Boat into the river-cut Phong Nha grotto, then walk the vast illuminated chambers of Paradise Cave, one of the longest dry caves in Asia.',
    1,
    16,
    62.0,
    null,
    'moderate',
    true,
    false,
    ['FRIENDS', 'SOLO', 'COUPLE'],
    [],
    [
      'A river-boat ride into the Phong Nha cave system',
      'The cathedral-scale chambers of Paradise Cave',
      'Lush limestone-karst scenery of a UNESCO park',
    ],
    [
      'Transfer from Đồng Hới / Phong Nha town',
      'English-speaking guide',
      'Boat ride',
      'Cave entrance fees',
      'Lunch',
    ],
    ['Drinks', 'Personal expenses', 'Tips'],
    'Phong Nha town centre / Đồng Hới hotel pickup',
  ],
  [
    'hanoi-street-food-walk',
    ['hanoi'],
    'day',
    'Hà Nội Old Quarter Street Food Walk',
    'Graze the Old Quarter with a local foodie guide — phở, bún chả, bánh mì and egg coffee across eight hand-picked stops.',
    1,
    10,
    35.0,
    null,
    'easy',
    false,
    false, // DRAFT on purpose
    ['SOLO', 'FRIENDS', 'COUPLE'],
    ['NEW'],
    [
      'Eight tastings across the maze of the Old Quarter',
      'Hà Nội classics: phở, bún chả, nem and bánh mì',
      'Finish with the city’s famous egg coffee',
    ],
    ['All food tastings', 'Egg coffee', 'Local foodie guide', 'Bottled water'],
    ['Alcoholic drinks', 'Tips'],
    'Hàng Bè market entrance, Hà Nội Old Quarter',
  ],
  [
    'mui-ne-dunes-day',
    ['mui-ne'],
    'day',
    'Mũi Né Sand Dunes & Fairy Stream',
    'A half-day jeep tour of Mũi Né’s red and white sand dunes, the Fairy Stream canyon and the basket-boat fishing village — best at sunrise.',
    1,
    14,
    42.0,
    52.0,
    'easy',
    true,
    false,
    ['FAMILY', 'COUPLE', 'FRIENDS'],
    [],
    [
      'Sunrise over the sweeping White Sand Dunes',
      'The glowing Red Sand Dunes and optional sand-sledding',
      'Wade up the Fairy Stream between red-rock canyons',
      'The Mũi Né fishing village and its round basket boats',
    ],
    [
      'Hotel pickup & drop-off in Mũi Né',
      'Jeep transport',
      'English-speaking guide',
      'Bottled water',
    ],
    ['Quad-bike / sand-sled hire', 'Breakfast', 'Tips'],
    'Hotel pickup in Mũi Né',
  ],
  // ── Cruises ──
  [
    'halong-bay-2d1n',
    ['ha-long-bay', 'hanoi'],
    'cruise',
    'Hạ Long Bay Luxury Cruise 2D1N',
    'An overnight cruise among the karsts of Hạ Long Bay — kayaking, a cave visit, a sunset party and a night aboard a boutique junk.',
    2,
    24,
    175.0,
    210.0,
    'easy',
    true,
    true,
    ['COUPLE', 'FAMILY', 'FRIENDS'],
    ['POPULAR'],
    [
      'A night aboard a boutique junk among the karsts',
      'Kayaking and swimming from Titop Island',
      'The vast Sửng Sốt "Surprise" cave',
      'A sunset party, cooking demo and squid fishing',
    ],
    [
      'Round-trip transfer from Hà Nội',
      'One night aboard the cruise',
      'All meals on board (1B, 2L, 1D)',
      'Kayak & cave entrance',
      'English-speaking guide',
    ],
    ['Drinks', 'Tips', 'Travel insurance'],
    'Hà Nội Old Quarter hotel pickup',
  ],
  [
    'halong-lan-ha-3d2n',
    ['ha-long-bay', 'cat-ba'],
    'cruise',
    'Hạ Long & Lan Hạ Bay Cruise 3D2N',
    'A slower, more exclusive three-day cruise into the quieter Lan Hạ Bay — hidden lagoons, kayaks and caves away from the crowds.',
    3,
    20,
    320.0,
    380.0,
    'easy',
    true,
    false,
    ['COUPLE', 'FRIENDS'],
    ['EXCLUSIVE'],
    [
      'Two nights aboard a boutique junk in Lan Hạ Bay',
      'Kayaking into hidden lagoons and karst archways',
      'Cát Bà island, beaches and a floating village',
      'A relaxed, uncrowded pace away from the main bay',
    ],
    [
      'Round-trip transfer from Hà Nội',
      'Two nights aboard the cruise',
      'All meals on board',
      'Kayaks & activities',
      'English-speaking guide',
    ],
    ['Drinks', 'Tips', 'Travel insurance'],
    'Hà Nội Old Quarter hotel pickup',
  ],
  // ── Trekking ──
  [
    'sa-pa-trek-3d2n',
    ['sa-pa'],
    'trekking',
    'Sa Pa 3-Day Trek with Local Families',
    'A moderate three-day trek between rice terraces and ethnic-minority villages, with two homestay nights cooking and living alongside local families.',
    3,
    12,
    149.0,
    179.0,
    'moderate',
    true,
    true,
    ['FRIENDS', 'SOLO', 'COUPLE'],
    ['BEST_VALUE'],
    [
      'Trek 13–16 km a day through terraced valleys',
      'Meet Hmong, Red Dao and Tày communities',
      'Two nights in family homestays, cooking with your hosts',
      'Waterfalls, rattan bridges and untouched rice fields',
    ],
    [
      'Transfers to/from Sa Pa',
      'Local trekking guide',
      'All meals during the trek',
      'Two homestay nights',
      'Water & local rice wine',
    ],
    ['Additional drinks', 'Personal trekking gear', 'Tips'],
    'Sa Pa town centre (bus arrival point)',
  ],
  [
    'ha-giang-loop-3d2n',
    ['ha-giang'],
    'trekking',
    'Hà Giang Loop Motorbike Adventure 3D2N',
    'Ride (or be ridden) around Vietnam’s most spectacular frontier road — the Mã Pí Lèng pass, limestone plateaus and remote villages over three days.',
    3,
    10,
    165.0,
    null,
    'challenging',
    true,
    false,
    ['FRIENDS', 'SOLO'],
    ['NEW'],
    [
      'The legendary Mã Pí Lèng pass above the Nho Quế river',
      'The Đồng Văn karst plateau geopark',
      'Frontier markets and ethnic-minority villages',
      'Ride your own bike or relax with an easy-rider',
    ],
    [
      'Motorbike or easy-rider driver',
      'Fuel',
      'Local guide',
      'Two nights in homestays',
      'All meals on the loop',
    ],
    ['Personal travel insurance', 'Drinks', 'Tips'],
    'Hà Giang city tour office',
  ],
  [
    'cat-ba-national-park-trek',
    ['cat-ba'],
    'trekking',
    'Cát Bà National Park Jungle Trek',
    'A full-day trek across the forested spine of Cát Bà island in search of the rare golden-headed langur, ending at a quiet beach.',
    1,
    12,
    58.0,
    null,
    'moderate',
    true,
    false,
    ['FRIENDS', 'SOLO'],
    [],
    [
      'Trek the forested ridge of Cát Bà National Park',
      'Look out for the endangered golden-headed langur',
      'A summit viewpoint over Lan Hạ Bay',
      'Finish at a quiet cove for a swim',
    ],
    ['National park entrance', 'Local guide', 'Packed lunch', 'Bottled water'],
    ['Transfers to the island', 'Drinks', 'Tips'],
    'Cát Bà town pier',
  ],
  // ── Multi-day packages ──
  [
    'north-vietnam-5d4n',
    ['hanoi', 'ha-long-bay', 'ninh-binh'],
    'package',
    '5-Day North Vietnam: Hà Nội, Hạ Long & Ninh Bình',
    'The classic northern loop in five days — a Hà Nội Vespa tour, an overnight Hạ Long Bay cruise, and the karst scenery of Ninh Bình.',
    5,
    16,
    487.0,
    550.0,
    'easy',
    true,
    true,
    ['COUPLE', 'FAMILY', 'FRIENDS'],
    ['BEST_VALUE', 'POPULAR'],
    [
      'A 4.5-hour Vespa tour of Hà Nội’s Old Quarter',
      'An overnight luxury cruise in Hạ Long Bay',
      'A bamboo boat ride through the Tam Cốc caves',
      'The 500-step climb to the Mua Cave panorama',
    ],
    [
      '4 breakfasts, 3 lunches, 2 dinners',
      'Private car & cruise transfers',
      '3 hotel nights + 1 cruise night',
      'All activities & entrance fees',
      'English-speaking guides',
      'Airport transfers',
      '24/7 hotline support',
    ],
    [
      'International & domestic airfare',
      'Travel insurance',
      'Drinks beyond water',
      'Personal expenses & tips',
    ],
    'Nội Bài International Airport / Hà Nội hotel',
  ],
  [
    'central-heritage-6d5n',
    ['da-nang', 'hoi-an', 'hue', 'phong-nha'],
    'package',
    '6-Day Central Vietnam Heritage Road',
    'From imperial Huế through the caves of Phong Nha to lantern-lit Hội An and the beaches of Đà Nẵng, the UNESCO heart of Vietnam in six days.',
    6,
    16,
    612.5,
    699.0,
    'moderate',
    true,
    true,
    ['COUPLE', 'FAMILY', 'FRIENDS'],
    ['NEW'],
    [
      'The imperial citadel and royal tombs of Huế',
      'Paradise Cave in Phong Nha national park',
      'A Hội An cooking class and basket-boat ride',
      'Free beach time on the Đà Nẵng coast',
    ],
    [
      '5 breakfasts, 4 lunches, 2 dinners',
      'Private car & internal transfers',
      '5 hotel nights',
      'All entrance fees & guided tours',
      'English-speaking guides',
      'Airport transfers',
    ],
    [
      'International airfare',
      'Travel insurance',
      'Drinks beyond water',
      'Personal expenses & tips',
    ],
    'Đà Nẵng or Huế airport / hotel',
  ],
  [
    'vietnam-grand-tour-14d',
    [
      'hanoi',
      'ha-long-bay',
      'hue',
      'hoi-an',
      'ho-chi-minh-city',
      'mekong-delta',
    ],
    'package',
    // boundary: title at exactly 200 chars, summary at exactly 500 chars
    fillTo(200, [
      '14-Day Grand Tour of Vietnam from the Northern Highlands and Hạ Long Bay through the Imperial Centre and Lantern Towns down to the Mekong Delta and the Bustling Streets of Historic Saigon City',
    ]),
    fillTo(500, [
      'This is the complete north-to-south journey across Vietnam in a fortnight, weaving together the misty rice terraces of the north, an overnight cruise among the karsts of Hạ Long Bay, the imperial monuments of Huế, the tailors and lanterns of Hội An, the war history of Saigon, and a dawn sampan through the floating markets of the Mekong Delta, all at an unhurried pace with private guides.',
    ]),
    14,
    12,
    1299.99,
    1499.0,
    'moderate',
    true,
    true,
    ['COUPLE', 'FRIENDS', 'SOLO'],
    ['EXCLUSIVE', 'BEST_VALUE'],
    [
      'The full length of the country in one journey',
      'An overnight Hạ Long Bay cruise',
      'UNESCO sites north to south',
      'A dawn visit to the Cái Răng floating market',
    ],
    [
      '13 breakfasts, 9 lunches, 5 dinners',
      'All internal flights & transfers',
      '12 hotel nights + 1 cruise night',
      'All entrance fees & guided tours',
      'English-speaking guides',
      'Airport transfers',
      '24/7 support',
    ],
    [
      'International airfare',
      'Travel insurance',
      'Drinks beyond water',
      'Personal expenses & tips',
    ],
    'Nội Bài International Airport / Hà Nội hotel',
  ],
  // ── Honeymoon ──
  [
    'vietnam-romantic-10d',
    ['hanoi', 'ha-long-bay', 'da-nang', 'hoi-an'],
    'honeymoon',
    '10-Day Vietnam Romantic Getaway',
    'A ten-day north-to-centre honeymoon: Hà Nội food, a Hạ Long Bay cruise, Ninh Bình karsts, Bà Nà Hills, imperial Huế and lantern-lit Hội An.',
    10,
    12,
    724.0,
    818.0,
    'easy',
    true,
    true,
    ['COUPLE'],
    ['EXCLUSIVE'],
    [
      'A Hà Nội Old Quarter street-food walk',
      'An overnight Hạ Long Bay cruise with kayaking',
      'UNESCO sites: Tràng An, Hội An and My Sơn',
      'A Hội An cooking class and basket-boat ride',
    ],
    [
      '9 breakfasts, 6 lunches, 2 dinners',
      'Private car, cruise & internal transfers',
      '9 nights (hotel + cruise)',
      'All entrance fees & a cooking class',
      'English-speaking guides',
      'Airport transfers',
      '24/7 support',
    ],
    [
      'International airfare',
      'Travel insurance',
      'Drinks beyond water',
      'Personal expenses & tips',
    ],
    'Nội Bài International Airport / Hà Nội hotel',
  ],
  [
    'phu-quoc-honeymoon-5d',
    ['phu-quoc'],
    'honeymoon',
    '5-Day Phú Quốc Island Honeymoon',
    'Five slow days on Vietnam’s largest island: a private sunset cruise, a couples’ spa afternoon, snorkelling, and long empty stretches of white sand.',
    5,
    8,
    540.0,
    620.0,
    'easy',
    true,
    false,
    ['COUPLE'],
    ['LIMITED_OFFER'],
    [
      'A private sunset cruise for two',
      'A couples’ spa afternoon',
      'Snorkelling in the An Thới archipelago',
      'Beachfront resort nights with breakfast',
    ],
    [
      '4 breakfasts, 1 dinner',
      'Airport transfers',
      '4 resort nights',
      'Private cruise & spa session',
      'Snorkelling day trip',
    ],
    [
      'International & domestic airfare',
      'Travel insurance',
      'Lunches',
      'Personal expenses',
    ],
    'Phú Quốc International Airport',
  ],
  [
    'dalat-highlands-3d',
    ['da-lat'],
    'package',
    '3-Day Đà Lạt Highlands Escape',
    'A cool-climate break in the pine-clad highlands: flower gardens, a coffee farm, the Datanla falls by alpine coaster, and a canyoning morning.',
    3,
    14,
    268.0,
    null,
    'moderate',
    true,
    false,
    ['COUPLE', 'FRIENDS', 'FAMILY'],
    [],
    [
      'French-era villas and the old railway station',
      'A working highland coffee farm',
      'The Datanla falls by alpine coaster',
      'An optional canyoning morning',
    ],
    [
      '2 breakfasts, 1 lunch',
      'Private transfers',
      '2 hotel nights',
      'Coffee-farm visit & entrance fees',
      'English-speaking guide',
    ],
    ['Canyoning add-on', 'Drinks', 'Tips'],
    'Đà Lạt hotel or Liên Khương airport',
  ],
  [
    'saigon-city-half-day',
    ['ho-chi-minh-city'],
    'day',
    'Saigon City Highlights Half-Day',
    'A compact morning tour of Saigon’s landmarks — the Notre-Dame Basilica, the Central Post Office, Reunification Palace and the War Remnants Museum.',
    1,
    20,
    25.0,
    null,
    'easy',
    true,
    false,
    ['SOLO', 'FRIENDS', 'FAMILY', 'BUSINESS'],
    [],
    [
      'The colonial Notre-Dame Basilica and Post Office',
      'Reunification Palace',
      'The War Remnants Museum',
      'The bustling Bến Thành market',
    ],
    [
      'Hotel pickup in District 1',
      'English-speaking guide',
      'Entrance fees',
      'Bottled water',
    ],
    ['Lunch', 'Personal expenses', 'Tips'],
    'District 1 hotel pickup, Hồ Chí Minh City',
  ],
  [
    'business-hanoi-city-day',
    ['hanoi'],
    'day',
    'Hà Nội Executive City Day',
    'A flexible, chauffeured day around Hà Nội for business travellers — key sights between meetings, at your own pace, with a private guide and car.',
    1,
    4,
    145.0,
    null,
    'easy',
    true,
    false,
    ['BUSINESS', 'SOLO', 'COUPLE'],
    ['LIMITED_OFFER'],
    [
      'A private car and guide for the full day',
      'The Old Quarter, the Temple of Literature and Hoàn Kiếm Lake',
      'A flexible schedule that works around meetings',
      'A curated lunch reservation',
    ],
    [
      'Private car & driver',
      'English-speaking guide',
      'Entrance fees',
      'Bottled water',
    ],
    ['Lunch', 'Evening use', 'Tips'],
    'Your Hà Nội hotel or office',
  ],
];
const tours = tourDefs.map((r, i) => ({
  id: uid(T, i + 1),
  slug: r[0],
  title: r[3],
  summary: r[4],
  categoryId: catId(r[2]),
  durationDays: r[5],
  maxGroupSize: r[6],
  basePrice: r[7].toFixed(2),
  compareAtPrice: r[8] === null ? null : r[8].toFixed(2),
  currency: 'USD',
  difficulty: r[9],
  isPublished: r[10],
  isFeatured: r[11],
  suitableFor: r[12],
  badges: r[13],
  included: r[15],
  excluded: r[16],
  highlights: r[14],
  meetingPoint: r[17],
  createdAt: ts(-180 + i, 8),
  updatedAt: ts(-20 + (i % 7), 8),
  _dest: r[1],
}));
const tourId = (slug) => tours.find((x) => x.slug === slug).id;

// TourDestination join (first = primary)
const tourDestinations = [];
for (const t of tours) {
  t._dest.forEach((slug, idx) => {
    tourDestinations.push({
      tourId: t.id,
      destinationId: destId(slug),
      isPrimary: idx === 0,
    });
  });
}
tours.forEach((t) => delete t._dest);

// ═══════════════════════════════════════════════════════════════════════════
// ITINERARY DAYS — for a representative subset of tours (~30 rows)
// ═══════════════════════════════════════════════════════════════════════════
const IDT = 'd1000001';
const itinRaw = {
  'hoi-an-walking-tour': [
    [
      'Hội An old town & lantern dusk',
      [
        '15:30 — Meet your guide at the tourist information centre on Lê Lợi street.',
        '15:45 — Walk the old town: the Japanese Covered Bridge and a 200-year-old merchant house.',
        '17:30 — A cao lầu tasting as the lanterns are lit.',
        '18:45 — Float your own paper lantern on the Thu Bồn river to close the tour.',
      ],
    ],
  ],
  'halong-bay-2d1n': [
    [
      'Hà Nội to Hạ Long, board & explore',
      [
        '08:00 — Hotel pickup in the Old Quarter and the drive to the harbour.',
        '12:30 — Board the junk, welcome lunch as you sail into the bay.',
        '15:00 — Kayak and swim from Titop Island.',
        '19:00 — Dinner on deck followed by squid fishing.',
      ],
    ],
    [
      'Sửng Sốt cave & return',
      [
        '06:30 — Optional Tai Chi on the sun deck at sunrise.',
        '08:00 — Visit the vast Sửng Sốt "Surprise" cave.',
        '10:30 — Brunch aboard as the junk returns to port.',
        '15:30 — Arrive back in Hà Nội.',
      ],
    ],
  ],
  'sa-pa-trek-3d2n': [
    [
      'Sa Pa to Lao Chải valley',
      [
        '09:00 — Meet in Sa Pa and trek down into the Muong Hoa valley.',
        '12:30 — Picnic lunch among the rice terraces.',
        '16:00 — Arrive at the first homestay in Tả Van; help cook dinner.',
      ],
    ],
    [
      'Tả Van to Giàng Tả Chải',
      [
        '08:00 — Breakfast with the family, then trek through bamboo forest.',
        '13:00 — Riverside lunch and a swim beneath a waterfall.',
        '17:00 — Second homestay night with a Red Dao family.',
      ],
    ],
    [
      'Return trek & transfer',
      [
        '08:30 — A gentler morning trek back toward the road.',
        '12:00 — Farewell lunch in Sa Pa.',
        '14:00 — Transfer to the bus or overnight train.',
      ],
    ],
  ],
  'north-vietnam-5d4n': [
    [
      'Arrive Hà Nội, Vespa food tour',
      [
        'On arrival — Airport transfer and hotel check-in.',
        '17:00 — A 4.5-hour Vespa tour of the Old Quarter and colonial quarter with street-food stops.',
      ],
    ],
    [
      'Hà Nội to Hạ Long cruise',
      [
        '08:00 — Drive to Hạ Long and board the overnight cruise.',
        '15:00 — Kayaking and a cave visit.',
        '19:00 — Dinner and a sunset party on deck.',
      ],
    ],
    [
      'Cruise to Ninh Bình',
      [
        '08:00 — Cave visit and brunch as the junk returns.',
        '13:00 — Transfer to Ninh Bình and check in.',
      ],
    ],
    [
      'Ninh Bình karst day',
      [
        '08:30 — Bamboo boat ride through the Tam Cốc caves.',
        '11:00 — The 500-step climb to the Mua Cave viewpoint.',
        '14:00 — Cycle through the rice-field villages.',
      ],
    ],
    [
      'Depart Hà Nội',
      [
        '09:00 — Transfer back to Hà Nội.',
        'Flexible — Airport drop-off for your onward flight.',
      ],
    ],
  ],
  'ba-na-hills-day': [
    [
      'Bà Nà Hills & the Golden Bridge',
      [
        '07:30 — Hotel pickup in Đà Nẵng and the drive to the cable-car station.',
        '08:30 — Ride the record-breaking cable car into the hills.',
        '12:00 — Buffet lunch, then Fantasy Park and the French Village.',
        '15:30 — Descend and return to Đà Nẵng.',
      ],
    ],
  ],
  'ha-giang-loop-3d2n': [
    [
      'Hà Giang to Đồng Văn',
      [
        '08:00 — Safety briefing and set off on the loop.',
        '12:00 — Lunch at Tam Sơn in the Quản Bạ valley.',
        '17:00 — Reach Đồng Văn old town for the night.',
      ],
    ],
    [
      'The Mã Pí Lèng pass',
      [
        '08:00 — Ride the Mã Pí Lèng pass above the Nho Quế river.',
        '11:00 — Optional boat on the Nho Quế gorge.',
        '16:00 — Homestay in a Tày village.',
      ],
    ],
    [
      'Return to Hà Giang',
      [
        '08:30 — The final leg back through the karst plateau.',
        '13:00 — Farewell lunch and return to Hà Giang city.',
      ],
    ],
  ],
};
const itineraryDays = [];
let idSeq = 0;
for (const [slug, days] of Object.entries(itinRaw)) {
  days.forEach((day, i) => {
    idSeq++;
    itineraryDays.push({
      id: uid(IDT, idSeq),
      tourId: tourId(slug),
      dayNumber: i + 1,
      title: day[0],
      description: day[1].join('\n'),
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQS (~16)
// ═══════════════════════════════════════════════════════════════════════════
const FQ = 'd2000001';
const faqRaw = {
  'hoi-an-walking-tour': [
    [
      'What should I wear?',
      'Comfortable walking shoes and light clothing. The old town is pedestrian-only, so expect gentle walking on flat streets.',
    ],
    [
      'Is this tour suitable for children?',
      'Yes — the pace is relaxed and the lantern release is a favourite with kids. Strollers are manageable on most streets.',
    ],
  ],
  'ba-na-hills-day': [
    [
      'How cold is it at the top?',
      'Bà Nà Hills sits at about 1,487 m and is markedly cooler than the coast — bring a light jacket even in summer.',
    ],
  ],
  'halong-bay-2d1n': [
    [
      'Do I need to be a strong swimmer to kayak?',
      'No — kayaking is optional and done in calm, sheltered water with life jackets provided. You can also swim straight from the boat.',
    ],
    [
      'Is the cruise suitable for a wheelchair user?',
      'The junk has steep stairs between decks and is not step-free, so it is difficult for wheelchair users; contact us to discuss alternatives.',
    ],
  ],
  'sa-pa-trek-3d2n': [
    [
      'How fit do I need to be?',
      'A reasonable level of fitness helps — you cover 13–16 km a day on uneven hill paths. The pace is steady rather than fast, with regular stops.',
    ],
    [
      'What are the homestays like?',
      'Simple, clean and warm-hearted: shared mattresses with mosquito nets, a family dinner and basic bathrooms. They are a highlight for most travellers.',
    ],
  ],
  'north-vietnam-5d4n': [
    [
      'Is airfare included?',
      'No — international and domestic flights are excluded, but we can book them for you. Airport transfers within Vietnam are included.',
    ],
    [
      'Can the itinerary be customised?',
      'Yes. This is a popular template; we routinely adjust hotels, pace and extra nights to suit couples, families or small groups.',
    ],
  ],
  'vietnam-grand-tour-14d': [
    [
      'Are the internal flights included?',
      'Yes — all internal flights and transfers between regions are included in the price; only your international airfare is extra.',
    ],
  ],
  'ha-giang-loop-3d2n': [
    [
      'I cannot ride a motorbike — can I still join?',
      'Absolutely. Most guests ride pillion with an experienced "easy-rider" driver, so no licence or riding experience is needed.',
    ],
  ],
  'phu-quoc-honeymoon-5d': [
    [
      'Can you arrange a private candlelit dinner?',
      'Yes — a private beach or garden dinner can be added on any evening; let us know at booking and we will arrange it with the resort.',
    ],
  ],
  'business-hanoi-city-day': [
    [
      'Can the schedule flex around my meetings?',
      'Yes — the car and guide are yours for the day and the itinerary is built entirely around your availability.',
    ],
  ],
};
const faqs = [];
let fqSeq = 0;
for (const [slug, list] of Object.entries(faqRaw)) {
  list.forEach((f, i) => {
    fqSeq++;
    faqs.push({
      id: uid(FQ, fqSeq),
      tourId: tourId(slug),
      question: f[0],
      answer: f[1],
      order: i,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// POLICIES (~14) — every PolicyKind; one body at the 4000-char cap
// ═══════════════════════════════════════════════════════════════════════════
const PO = 'd3000001';
const DEPOSIT = [
  'BOOKING',
  'Deposit & payment',
  'Secure your seats with a 30% deposit by card (Stripe) or PayPal. You will receive a confirmation email with your booking code and a full day-by-day plan. The remaining balance can be settled before the tour begins.',
];
const CANCEL = [
  'CANCELLATION',
  'Cancellation policy',
  'A 30% deposit confirms your booking; the balance is due on the tour start date. Cancellations 15+ days before departure forfeit 50% of the deposit; 7–15 days before forfeit 75%; within 7 days forfeit 100%. Date changes are subject to availability.',
];
const GENERAL = [
  'GENERAL',
  'What to bring',
  'Bring comfortable shoes, sun protection, a light rain layer, and any personal medication. Modest dress is required to enter temples and pagodas. A small daypack is useful for water and a camera.',
];
const policyRaw = {
  'halong-bay-2d1n': [DEPOSIT, CANCEL, GENERAL],
  'halong-lan-ha-3d2n': [DEPOSIT, CANCEL],
  'sa-pa-trek-3d2n': [DEPOSIT, CANCEL, GENERAL],
  'ha-giang-loop-3d2n': [DEPOSIT, CANCEL],
  'north-vietnam-5d4n': [DEPOSIT, CANCEL],
  'vietnam-romantic-10d': [DEPOSIT, CANCEL],
  // boundary: full terms body at exactly 4000 chars
  'vietnam-grand-tour-14d': [
    ['GENERAL', 'Full booking terms & conditions', fillTo(4000, POLICY_POOL)],
    CANCEL,
  ],
};
const policies = [];
let poSeq = 0;
for (const [slug, list] of Object.entries(policyRaw)) {
  list.forEach((p, i) => {
    poSeq++;
    policies.push({
      id: uid(PO, poSeq),
      tourId: tourId(slug),
      kind: p[0],
      title: p[1],
      body: p[2],
      order: i,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPARTURES (~36) — OPEN/CLOSED/CANCELLED; sold-out; priceOverride; boundary
// ═══════════════════════════════════════════════════════════════════════════
const E = 'e0000001';
const departures = [];
let depSeq = 0;
const depKey = {}; // slug -> [ids in order]
function addDep(
  slug,
  startOff,
  seatsTotal,
  seatsBooked,
  status,
  priceOverride,
  compareAt,
) {
  depSeq++;
  const t = tours.find((x) => x.slug === slug);
  const id = uid(E, depSeq);
  departures.push({
    id,
    tourId: t.id,
    startDate: d(startOff),
    endDate: d(startOff + Math.max(0, t.durationDays - 1)),
    priceOverride:
      priceOverride === undefined ? null : priceOverride.toFixed(2),
    compareAtPrice: compareAt === undefined ? null : compareAt.toFixed(2),
    seatsTotal,
    seatsBooked,
    status,
    createdAt: ts(-120, 8),
    updatedAt: ts(-5, 8),
  });
  (depKey[slug] = depKey[slug] || []).push(id);
}
// Regular OPEN departures for most published tours
for (const t of tours.filter((x) => x.isPublished)) {
  const total = Math.max(5, Math.ceil(t.maxGroupSize * 0.6));
  addDep(t.slug, 30, total, Math.floor(total * 0.3), 'OPEN');
  addDep(t.slug, 75, total, 0, 'OPEN');
}
// Edge departures
addDep('hoi-an-walking-tour', 45, 12, 12, 'OPEN'); // SOLD OUT (seatsBooked == seatsTotal)
addDep('ba-na-hills-day', -20, 12, 12, 'CLOSED'); // past & closed
addDep('halong-bay-2d1n', 90, 24, 3, 'OPEN', 199.0, 240.0); // priceOverride + compareAt
addDep('ha-giang-loop-3d2n', -40, 8, 2, 'CANCELLED'); // cancelled departure
addDep('sa-pa-trek-3d2n', 120, 5, 0, 'OPEN'); // boundary: min seatsTotal (5)
addDep('vietnam-grand-tour-14d', 200, 12, 1, 'OPEN', 1199.99); // deep-future, discounted override

// ═══════════════════════════════════════════════════════════════════════════
// BOOKINGS (30) — every BookingStatus; both providers; refunds; null phone;
// specialRequests@1000; numChildren 0 & >0.
// ═══════════════════════════════════════════════════════════════════════════
const B = 'f0000001';
const SR_LONG = fillTo(1000, [
  'We are travelling with my elderly mother who uses a walking stick and would appreciate a slower pace on any steps, plus a ground-floor room where possible.',
  'One of our party is strictly vegetarian and another is allergic to shellfish, so please flag this to every restaurant and the cruise kitchen.',
  'We would like a quiet double bed rather than twin, and if a late checkout can be arranged on the final morning that would be wonderful.',
  'Please could the guide meet us in the lobby rather than call the room, as we will be watching for you from there.',
]);
const bookings = [];
let bkSeq = 0;
function addBooking(spec) {
  bkSeq++;
  const t = tours.find((x) => x.slug === spec.slug);
  const dep = departures.find((x) => x.id === spec.departureId);
  const u = users[spec.user];
  const price =
    spec.priceOverride !== undefined ? spec.priceOverride : Number(t.basePrice);
  const total = (price * (spec.adults + 0.5 * spec.children)).toFixed(2);
  bookings.push({
    id: uid(B, bkSeq),
    code: spec.code,
    userId: u.id,
    tourId: t.id,
    departureId: dep.id,
    numAdults: spec.adults,
    numChildren: spec.children,
    totalAmount: total,
    currency: 'USD',
    status: spec.status,
    contactName: u.fullName || spec.contactName || 'Traveller',
    contactEmail: u.email,
    contactPhone: spec.phone === undefined ? u.phone || null : spec.phone,
    specialRequests: spec.special || null,
    paymentProvider: spec.provider,
    providerSessionId: spec.sessionId || null,
    providerPaymentId: spec.paymentId || null,
    refundReason: spec.refundReason || null,
    refundedById: spec.refundedBy || null,
    paidAt: spec.paidAt || null,
    cancelledAt: spec.cancelledAt || null,
    createdAt: spec.createdAt,
    updatedAt: spec.updatedAt || spec.createdAt,
  });
}
const dep0 = (slug) => depKey[slug][0];
let code = 0;
const nextCode = () => `BK-${String(++code).padStart(4, '0')}`;
const bookingSpecs = [
  {
    slug: 'hoi-an-walking-tour',
    user: 0,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_hoian_0001',
    paymentId: 'pi_test_hoian_0001',
    paidAt: ts(-40, 10),
    createdAt: ts(-42, 10),
  },
  {
    slug: 'ba-na-hills-day',
    user: 1,
    adults: 2,
    children: 1,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-BANA-0002',
    paymentId: 'CAP-BANA-0002',
    paidAt: ts(-38, 11),
    createdAt: ts(-39, 11),
  },
  {
    slug: 'phu-quoc-4-islands',
    user: 4,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_phuquoc_0003',
    paymentId: 'pi_test_phuquoc_0003',
    paidAt: ts(-35, 9),
    createdAt: ts(-36, 9),
  },
  {
    slug: 'halong-bay-2d1n',
    user: 3,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_halong_0004',
    paymentId: 'pi_test_halong_0004',
    paidAt: ts(-33, 14),
    createdAt: ts(-34, 14),
    special:
      'Celebrating an anniversary — a bottle of wine on the first night would be a lovely surprise.',
  },
  {
    slug: 'sa-pa-trek-3d2n',
    user: 2,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-SAPA-0005',
    paymentId: 'CAP-SAPA-0005',
    paidAt: ts(-30, 8),
    createdAt: ts(-31, 8),
  },
  {
    slug: 'north-vietnam-5d4n',
    user: 1,
    adults: 2,
    children: 2,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_north_0006',
    paymentId: 'pi_test_north_0006',
    paidAt: ts(-28, 12),
    createdAt: ts(-29, 12),
  },
  {
    slug: 'vietnam-romantic-10d',
    user: 0,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_romantic_0007',
    paymentId: 'pi_test_romantic_0007',
    paidAt: ts(-26, 10),
    createdAt: ts(-27, 10),
  },
  {
    slug: 'halong-bay-2d1n',
    user: 5,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-HALONG-0008',
    paymentId: 'CAP-HALONG-0008',
    paidAt: ts(-24, 9),
    createdAt: ts(-25, 9),
  },
  {
    slug: 'ba-na-hills-day',
    user: 4,
    adults: 3,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_bana_0009',
    paymentId: 'pi_test_bana_0009',
    paidAt: ts(-22, 11),
    createdAt: ts(-23, 11),
  },
  {
    slug: 'sa-pa-trek-3d2n',
    user: 1,
    adults: 1,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_sapa_0010',
    paymentId: 'pi_test_sapa_0010',
    paidAt: ts(-20, 8),
    createdAt: ts(-21, 8),
  },
  {
    slug: 'sa-pa-trek-3d2n',
    user: 7,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-SAPA-0011',
    paymentId: 'CAP-SAPA-0011',
    paidAt: ts(-19, 8),
    createdAt: ts(-20, 8),
  },
  {
    slug: 'north-vietnam-5d4n',
    user: 4,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_north_0012',
    paymentId: 'pi_test_north_0012',
    paidAt: ts(-18, 9),
    createdAt: ts(-19, 9),
  },
  {
    slug: 'north-vietnam-5d4n',
    user: 6,
    adults: 2,
    children: 1,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-NORTH-0013',
    paymentId: 'CAP-NORTH-0013',
    paidAt: ts(-17, 10),
    createdAt: ts(-18, 10),
  },
  {
    slug: 'vietnam-romantic-10d',
    user: 5,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_romantic_0014',
    paymentId: 'pi_test_romantic_0014',
    paidAt: ts(-16, 12),
    createdAt: ts(-17, 12),
  },
  {
    slug: 'phu-quoc-4-islands',
    user: 7,
    adults: 2,
    children: 2,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_phuquoc_0015',
    paymentId: 'pi_test_phuquoc_0015',
    paidAt: ts(-15, 9),
    createdAt: ts(-16, 9),
  },
  {
    slug: 'hoi-an-walking-tour',
    user: 2,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-HOIAN-0016',
    paymentId: 'CAP-HOIAN-0016',
    paidAt: ts(-14, 15),
    createdAt: ts(-15, 15),
  },
  {
    slug: 'north-vietnam-5d4n',
    user: 6,
    adults: 2,
    children: 1,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_north_0017',
    paymentId: 'pi_test_north_0017',
    paidAt: ts(-13, 16),
    createdAt: ts(-14, 16),
    special: fillTo(1000, [SR_LONG]),
  },
  {
    slug: 'ba-na-hills-day',
    user: 5,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-BANA-0018',
    paymentId: 'CAP-BANA-0018',
    paidAt: ts(-12, 11),
    createdAt: ts(-13, 11),
  },
  // PENDING (awaiting payment; no paidAt)
  {
    slug: 'mekong-delta-day',
    user: 8,
    adults: 2,
    children: 0,
    status: 'PENDING',
    provider: 'STRIPE',
    sessionId: 'cs_test_mekong_0019',
    createdAt: ts(-3, 9),
  },
  {
    slug: 'hue-imperial-day',
    user: 9,
    adults: 1,
    children: 0,
    status: 'PENDING',
    provider: 'PAYPAL',
    sessionId: 'PAYID-HUE-0020',
    createdAt: ts(-2, 10),
  },
  {
    slug: 'cu-chi-tunnels-half-day',
    user: 18,
    adults: 4,
    children: 0,
    status: 'PENDING',
    provider: 'STRIPE',
    createdAt: ts(-1, 8),
    phone: null,
  },
  {
    slug: 'vietnam-grand-tour-14d',
    user: 19,
    adults: 2,
    children: 0,
    status: 'PENDING',
    provider: 'STRIPE',
    sessionId: 'cs_test_grand_0022',
    priceOverride: 1199.99,
    createdAt: ts(0, 9),
  },
  // CANCELLED
  {
    slug: 'phong-nha-paradise-cave-day',
    user: 10,
    adults: 2,
    children: 0,
    status: 'CANCELLED',
    provider: 'PAYPAL',
    sessionId: 'PAYID-PHONGNHA-0023',
    cancelledAt: ts(-6, 12),
    createdAt: ts(-9, 12),
  },
  {
    slug: 'mui-ne-dunes-day',
    user: 11,
    adults: 2,
    children: 0,
    status: 'CANCELLED',
    provider: 'STRIPE',
    sessionId: 'cs_test_muine_0024',
    cancelledAt: ts(-4, 9),
    createdAt: ts(-8, 9),
    phone: null,
  },
  {
    slug: 'halong-lan-ha-3d2n',
    user: 12,
    adults: 2,
    children: 0,
    status: 'CANCELLED',
    provider: 'STRIPE',
    sessionId: 'cs_test_lanha_0025',
    cancelledAt: ts(-5, 10),
    createdAt: ts(-11, 10),
  },
  // REFUNDED (refundedBy admin + refundReason + paidAt + cancelledAt)
  {
    slug: 'ba-na-hills-day',
    user: 13,
    adults: 2,
    children: 0,
    status: 'REFUNDED',
    provider: 'STRIPE',
    sessionId: 'cs_test_bana_0026',
    paymentId: 'pi_test_bana_0026',
    paidAt: ts(-50, 10),
    cancelledAt: ts(-44, 10),
    refundedBy: adminId,
    refundReason:
      'Guest hospitalised before departure; full refund approved on production of a medical certificate.',
    createdAt: ts(-52, 10),
  },
  {
    slug: 'halong-bay-2d1n',
    user: 14,
    adults: 2,
    children: 0,
    status: 'REFUNDED',
    provider: 'PAYPAL',
    sessionId: 'PAYID-HALONG-0027',
    paymentId: 'CAP-HALONG-0027',
    paidAt: ts(-48, 9),
    cancelledAt: ts(-41, 9),
    refundedBy: editorId,
    refundReason:
      'Typhoon warning forced cancellation of the departure; refunded in full under the force-majeure clause.',
    createdAt: ts(-49, 9),
  },
  {
    slug: 'sa-pa-trek-3d2n',
    user: 15,
    adults: 1,
    children: 0,
    status: 'REFUNDED',
    provider: 'STRIPE',
    sessionId: 'cs_test_sapa_0028',
    paymentId: 'pi_test_sapa_0028',
    paidAt: ts(-46, 8),
    cancelledAt: ts(-39, 8),
    refundedBy: adminId,
    refundReason:
      'Duplicate booking made in error by the guest; the second charge was refunded within 24 hours.',
    createdAt: ts(-47, 8),
    phone: null,
  },
  // extra PAID for review/wishlist variety
  {
    slug: 'central-heritage-6d5n',
    user: 16,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'STRIPE',
    sessionId: 'cs_test_central_0029',
    paymentId: 'pi_test_central_0029',
    paidAt: ts(-10, 9),
    createdAt: ts(-11, 9),
  },
  {
    slug: 'dalat-highlands-3d',
    user: 17,
    adults: 2,
    children: 0,
    status: 'PAID',
    provider: 'PAYPAL',
    sessionId: 'PAYID-DALAT-0030',
    paymentId: 'CAP-DALAT-0030',
    paidAt: ts(-7, 10),
    createdAt: ts(-8, 10),
  },
];
bookingSpecs.forEach((s) => {
  s.departureId = dep0(s.slug);
  s.code = nextCode();
  addBooking(s);
});
const bookingByCode = (c) => bookings.find((b) => b.code === c);

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT EVENTS (~20) — Stripe + PayPal; processed & unprocessed (retry)
// ═══════════════════════════════════════════════════════════════════════════
const PE = 'f1000001';
const paymentEvents = [];
let peSeq = 0;
function addEvent(provider, eventId, type, payload, processedOff) {
  peSeq++;
  paymentEvents.push({
    id: uid(PE, peSeq),
    provider,
    eventId,
    type,
    payload,
    processedAt: processedOff === null ? null : ts(processedOff, 10),
    receivedAt: ts((processedOff === null ? -1 : processedOff) - 1, 9),
  });
}
const paidStripe = bookings.filter(
  (b) => b.paymentProvider === 'STRIPE' && b.providerPaymentId,
);
const paidPaypal = bookings.filter(
  (b) => b.paymentProvider === 'PAYPAL' && b.providerPaymentId,
);
paidStripe.slice(0, 8).forEach((b, i) => {
  addEvent(
    'STRIPE',
    `evt_test_${b.code.toLowerCase()}`,
    'checkout.session.completed',
    {
      id: `evt_test_${i + 1}`,
      object: 'event',
      data: {
        object: {
          id: b.providerSessionId,
          payment_intent: b.providerPaymentId,
          amount_total: Math.round(Number(b.totalAmount) * 100),
          currency: 'usd',
        },
      },
    },
    -Math.abs(i + 1),
  );
});
paidPaypal.slice(0, 6).forEach((b, i) => {
  addEvent(
    'PAYPAL',
    `WH-TEST-${b.code}`,
    'PAYMENT.CAPTURE.COMPLETED',
    {
      id: `WH-${i + 1}`,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: b.providerPaymentId,
        status: 'COMPLETED',
        amount: { value: b.totalAmount, currency_code: 'USD' },
      },
    },
    -Math.abs(i + 1),
  );
});
// Unprocessed (received, not yet finished → provider retry re-runs handler)
addEvent(
  'STRIPE',
  'evt_test_unprocessed_1',
  'checkout.session.completed',
  {
    id: 'evt_unproc_1',
    object: 'event',
    data: {
      object: { id: 'cs_test_pending_x', payment_intent: 'pi_test_pending_x' },
    },
  },
  null,
);
addEvent(
  'STRIPE',
  'evt_test_refund_1',
  'charge.refunded',
  {
    id: 'evt_refund_1',
    object: 'event',
    data: { object: { id: 'cs_test_bana_0026', refunded: true } },
  },
  -43,
);
addEvent(
  'PAYPAL',
  'WH-TEST-REFUND-1',
  'PAYMENT.CAPTURE.REFUNDED',
  {
    id: 'WH-refund-1',
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    resource: { id: 'CAP-HALONG-0027', status: 'REFUNDED' },
  },
  -40,
);
addEvent(
  'PAYPAL',
  'WH-TEST-DENIED-1',
  'PAYMENT.CAPTURE.DENIED',
  {
    id: 'WH-denied-1',
    event_type: 'PAYMENT.CAPTURE.DENIED',
    resource: { id: 'CAP-FAILED-X', status: 'DECLINED' },
  },
  null,
);

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS (~30) — ratings 1..5; VERIFIED + CURATED (null FKs); approved/unapproved;
// featured; body@2000.
// ═══════════════════════════════════════════════════════════════════════════
const RV = 'a1000001';
const reviews = [];
let rvSeq = 0;
const verifiedSpecs = [
  {
    code: 'BK-0001',
    rating: 5,
    title: 'Magical at dusk',
    body: 'Our guide knew every corner of the old town and timed it so we floated our lanterns just as the lights came on. A lovely, gentle evening.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0002',
    rating: 5,
    title: 'The Golden Bridge delivers',
    body: 'Yes it is touristy, but standing on those giant hands in the clouds is jaw-dropping. Pickup was punctual and the cable car is incredible.',
    approved: true,
    featured: true,
  },
  {
    code: 'BK-0003',
    rating: 4,
    title: 'Lovely islands',
    body: 'A little busy at the first reef but the second stop was quieter and gorgeous. The seafood lunch was a feast and the crew were friendly.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0004',
    rating: 5,
    title: 'Unforgettable overnight',
    body: 'Waking up among the karsts with the mist still on the water is something I will never forget. The cabin was comfortable and the food excellent.',
    approved: true,
    featured: true,
  },
  {
    code: 'BK-0005',
    rating: 5,
    title: 'The homestays made it',
    body: 'Cooking dinner with our host family and waking over the rice terraces was the best part of three weeks in Vietnam. A warm, knowledgeable guide.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0006',
    rating: 5,
    title: 'Perfect first trip north',
    body: 'Hà Nội, Hạ Long and Ninh Bình in five days sounds rushed but it flowed beautifully. The Vespa tour was a brilliant start.',
    approved: true,
    featured: true,
  },
  {
    code: 'BK-0007',
    rating: 5,
    title: 'A dream honeymoon',
    body: 'Ten days that felt unhurried and special. The room touches in Hội An were a lovely surprise and the cooking class was such fun.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0008',
    rating: 4,
    title: 'Beautiful, slightly rushed',
    body: 'The 2-day format is short — I would book the 3-day next time — but everything was well run and the Sửng Sốt cave is astonishing.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0009',
    rating: 3,
    title: 'Good but crowded',
    body: 'The bridge and gardens are lovely, but it was extremely busy and the queues for the cable car down were long. Go as early as you can.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0010',
    rating: 5,
    title: 'Tough but rewarding',
    body: 'The trails are real trekking, not a stroll, but the scenery and the village encounters are worth every step. Pack proper shoes.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0011',
    rating: 4,
    title: 'Authentic and beautiful',
    body: 'A genuine look at mountain life away from the tourist track. Basic comforts at the homestays, but that is the point.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0012',
    rating: 5,
    title: 'Brilliant value',
    body: 'Everything was taken care of — transfers, guides, entrance fees. We just turned up and enjoyed it. Fantastic for what is included.',
    approved: true,
    featured: true,
  },
  {
    code: 'BK-0013',
    rating: 4,
    title: 'Smooth and well-paced',
    body: 'Great mix of city, bay and countryside. Long-ish drive to Ninh Bình but the scenery makes up for it.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0014',
    rating: 2,
    title: 'Underwhelmed by the hotels',
    body: 'The itinerary was good and the guides tried hard, but two of the hotels were tired and not the standard we were promised at booking.',
    approved: false,
    featured: false,
  },
  {
    code: 'BK-0015',
    rating: 5,
    title: 'Kids loved it',
    body: 'Snorkelling was the highlight of our trip for the whole family. The crew kept a close eye on the children the entire time.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0017',
    rating: 1,
    title: 'Rained the whole day',
    body: 'Nobody’s fault, but the weather ruined the views and there is no refund for that. The guide did his best in difficult conditions.',
    approved: false,
    featured: false,
  },
  {
    code: 'BK-0029',
    rating: 5,
    title: 'The heritage road is a must',
    body: 'Six days from Huế to Hội An was perfectly paced. Paradise Cave genuinely took our breath away and the cooking class was a joy.',
    approved: true,
    featured: false,
  },
  {
    code: 'BK-0030',
    rating: 4,
    title: 'A cool change of scene',
    body: 'Đà Lạt is a refreshing break from the heat. The coffee farm and the canyoning were highlights; the town itself is quirky and charming.',
    approved: true,
    featured: false,
  },
  // boundary: body at exactly 2000 chars
  {
    code: 'BK-0016',
    rating: 5,
    title: 'A full account of a wonderful week',
    body: fillTo(2000, REVIEW_POOL),
    approved: true,
    featured: false,
  },
];
verifiedSpecs.forEach((v) => {
  rvSeq++;
  const b = bookingByCode(v.code);
  const u = users.find((x) => x.id === b.userId);
  reviews.push({
    id: uid(RV, rvSeq),
    tourId: b.tourId,
    userId: b.userId,
    bookingId: b.id,
    rating: v.rating,
    title: v.title,
    body: v.body,
    authorName: u.fullName || 'Verified traveller',
    authorLocation: null,
    source: 'VERIFIED',
    isFeatured: v.featured,
    tripLabel: null,
    isApproved: v.approved,
    createdAt: ts(-5, 12),
    updatedAt: ts(-4, 12),
  });
});
const curatedSpecs = [
  [
    'Emily Carter',
    'Sydney, Australia',
    'Hạ Long Bay Cruise',
    5,
    'Our overnight cruise was flawless from start to finish. The guide knew every hidden cave, and the sunrise over the karsts is something I will never forget.',
    true,
  ],
  [
    'Lukas Meyer',
    'Munich, Germany',
    'Hội An Heritage Walk',
    5,
    'Wandering the lantern-lit old town with a local historian made Hội An come alive. Every detail of the trip was thoughtfully arranged.',
    true,
  ],
  [
    'Sophie Laurent',
    'Lyon, France',
    'Sa Pa Trekking',
    4,
    'The hill-tribe trek was the highlight of our month in Vietnam — challenging, beautiful, and our guide looked after us the whole way.',
    true,
  ],
  [
    'Hiroshi Sato',
    'Osaka, Japan',
    'Central Heritage Road',
    5,
    'Six days through the centre of Vietnam were impeccably organised. Paradise Cave and imperial Huế were the standouts for us.',
    false,
  ],
  [
    'Isabela Costa',
    'São Paulo, Brazil',
    'Phú Quốc Honeymoon',
    5,
    'The most romantic five days imaginable. The private sunset cruise and the empty beaches made our honeymoon perfect.',
    true,
  ],
  [
    'Daniel Nguyễn',
    'Melbourne, Australia',
    'Mekong Delta Day',
    4,
    'A wonderful way to see the delta at its most alive. The floating market at dawn is worth every minute of the early start.',
    false,
  ],
  // boundary: tripLabel at exactly 160 chars
  [
    'Anne-Sophie de la Croix-Rousse',
    'Geneva, Switzerland',
    fillTo(160, [
      'Fourteen-Day Grand Tour of Vietnam from the Northern Highlands and Hạ Long Bay through the Imperial Centre down to the Floating Markets of the Mekong Delta and Saigon City',
    ]),
    5,
    'A trip of a lifetime from top to bottom of the country. Faultless logistics and guides who felt like friends by the end.',
    true,
  ],
];
curatedSpecs.forEach((c) => {
  rvSeq++;
  reviews.push({
    id: uid(RV, rvSeq),
    tourId: null,
    userId: null,
    bookingId: null,
    rating: c[3],
    title: null,
    body: c[4],
    authorName: c[0],
    authorLocation: c[1],
    source: 'CURATED',
    isFeatured: c[5],
    tripLabel: c[2],
    isApproved: true,
    createdAt: ts(-60, 12),
    updatedAt: ts(-60, 12),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WISHLIST (20) — composite (userId, tourId)
// ═══════════════════════════════════════════════════════════════════════════
const wishlist = [];
const wlPairs = [
  [0, 'halong-bay-2d1n'],
  [0, 'vietnam-romantic-10d'],
  [1, 'north-vietnam-5d4n'],
  [1, 'sa-pa-trek-3d2n'],
  [2, 'hoi-an-walking-tour'],
  [2, 'central-heritage-6d5n'],
  [3, 'halong-lan-ha-3d2n'],
  [4, 'phu-quoc-4-islands'],
  [4, 'phu-quoc-honeymoon-5d'],
  [5, 'ba-na-hills-day'],
  [6, 'vietnam-grand-tour-14d'],
  [7, 'sa-pa-trek-3d2n'],
  [8, 'mekong-delta-day'],
  [9, 'hue-imperial-day'],
  [10, 'phong-nha-paradise-cave-day'],
  [11, 'mui-ne-dunes-day'],
  [16, 'dalat-highlands-3d'],
  [18, 'cu-chi-tunnels-half-day'],
  [19, 'vietnam-grand-tour-14d'],
  [4, 'ha-giang-loop-3d2n'],
];
wlPairs.forEach((p, i) => {
  wishlist.push({
    userId: users[p[0]].id,
    tourId: tourId(p[1]),
    createdAt: ts(-30 + i, 12),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ENQUIRIES (24) — every EnquiryStatus; with/without tour; interests[]; message@2000
// ═══════════════════════════════════════════════════════════════════════════
const EN = 'a2000001';
const enquiries = [];
let enSeq = 0;
function addEnquiry(spec) {
  enSeq++;
  enquiries.push({
    id: uid(EN, enSeq),
    name: spec.name,
    email: spec.email,
    phone: spec.phone === undefined ? null : spec.phone,
    message: spec.message,
    tourId: spec.tourSlug ? tourId(spec.tourSlug) : null,
    nationality: spec.nationality || null,
    travelDate: spec.travelOff === undefined ? null : d(spec.travelOff),
    groupSize: spec.groupSize || null,
    budgetTier: spec.budgetTier || null,
    interests: spec.interests || [],
    status: spec.status,
    createdAt:
      spec.createdOff !== undefined ? ts(spec.createdOff, 9) : ts(-enSeq, 9),
    updatedAt: ts(-1, 9),
  });
}
const enquirySpecs = [
  {
    name: 'Grace Miller',
    email: 'grace.miller@example.com',
    phone: '+1 212 555 0198',
    message:
      'We are a family of four hoping to travel through central Vietnam in October and would like a private guide throughout. Could you send a tailored quote?',
    tourSlug: 'central-heritage-6d5n',
    nationality: 'United States',
    travelOff: 120,
    groupSize: 4,
    budgetTier: 'Comfort',
    interests: ['Culture', 'Food', 'Beaches'],
    status: 'NEW',
  },
  {
    name: 'Tomáš Novák',
    email: 'tomas.novak@example.com',
    phone: '+420 601 234 567',
    message:
      'Interested in the Hà Giang loop for two experienced riders. Do you offer 4-day versions, and can we rent 250cc bikes?',
    tourSlug: 'ha-giang-loop-3d2n',
    nationality: 'Czech Republic',
    travelOff: 90,
    groupSize: 2,
    budgetTier: 'Budget',
    interests: ['Adventure', 'Motorbiking'],
    status: 'CONTACTED',
  },
  {
    name: 'Amara Okafor',
    email: 'amara.okafor@example.com',
    phone: '+44 7911 123456',
    message:
      'Planning a honeymoon and torn between Phú Quốc and a Hạ Long cruise. Could you advise which suits early December best?',
    tourSlug: 'phu-quoc-honeymoon-5d',
    nationality: 'United Kingdom',
    travelOff: 160,
    groupSize: 2,
    budgetTier: 'Luxury',
    interests: ['Honeymoon', 'Beaches', 'Spa'],
    status: 'QUOTED',
  },
  {
    name: 'Kenji Yamamoto',
    email: 'kenji.yamamoto@example.com',
    phone: '+81 80 9876 5432',
    message:
      'A group of eight friends, quite active — we would prefer the strenuous trekking options over sightseeing days. What can you put together?',
    tourSlug: 'sa-pa-trek-3d2n',
    nationality: 'Japan',
    travelOff: 75,
    groupSize: 8,
    budgetTier: 'Comfort',
    interests: ['Trekking', 'Homestay'],
    status: 'WON',
  },
  {
    name: 'Beatriz Santos',
    email: 'beatriz.santos@example.com',
    phone: '+351 912 345 678',
    message:
      'We enquired about the 14-day grand tour but have decided to travel independently this year. Thank you for the detailed quote.',
    tourSlug: 'vietnam-grand-tour-14d',
    nationality: 'Portugal',
    travelOff: 200,
    groupSize: 2,
    budgetTier: 'Comfort',
    interests: ['Culture'],
    status: 'LOST',
  },
  {
    name: 'Fatima Al-Sayed',
    email: 'fatima.alsayed@example.com',
    phone: '+20 100 123 4567',
    message:
      'Do you arrange fully custom private tours? We are three generations travelling together and need connecting rooms and a slow pace.',
    nationality: 'Egypt',
    groupSize: 7,
    budgetTier: 'Luxury',
    interests: ['Culture', 'Family'],
    status: 'NEW',
  },
  {
    name: 'Oliver Schmidt',
    email: 'oliver.schmidt@example.com',
    message:
      'What is the best month to see the rice terraces in the north at their greenest? Flexible on dates.',
    nationality: 'Germany',
    budgetTier: 'Budget',
    interests: ['Photography', 'Trekking'],
    status: 'CONTACTED',
  },
  {
    name: 'Mia Andersson',
    email: 'mia.andersson@example.com',
    phone: '+46 70 987 65 43',
    message:
      'We would like a vegetarian-friendly food tour of Hà Nội and Hội An. Two adults, no fixed dates yet.',
    nationality: 'Sweden',
    groupSize: 2,
    budgetTier: 'Comfort',
    interests: ['Food'],
    status: 'QUOTED',
  },
  {
    name: 'Ravi Menon',
    email: 'ravi.menon@example.com',
    phone: '+91 99887 76655',
    message:
      'Corporate incentive trip for twelve; need a half-day city tour plus a gala dinner venue recommendation in Saigon.',
    tourSlug: 'saigon-city-half-day',
    nationality: 'India',
    travelOff: 45,
    groupSize: 12,
    budgetTier: 'Luxury',
    interests: ['Business', 'Culture'],
    status: 'WON',
  },
  // boundary: message at exactly 2000 chars
  {
    name: 'Chloé Petit',
    email: 'chloe.petit@example.com',
    phone: '+33 6 11 22 33 44',
    message: fillTo(2000, ENQUIRY_POOL),
    tourSlug: 'vietnam-romantic-10d',
    nationality: 'France',
    travelOff: 130,
    groupSize: 2,
    budgetTier: 'Luxury',
    interests: ['Honeymoon', 'Culture', 'Food'],
    status: 'NEW',
  },
];
enquirySpecs.forEach(addEnquiry);
const statusesCycle = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];
const extraEnq = [
  [
    'Lucas Bernard',
    'lucas.bernard@example.com',
    '+33 6 55 44 33 22',
    'Interested in a Mekong Delta overnight rather than a day trip — do you run those?',
    'mekong-delta-day',
    'France',
    ['Culture', 'Food'],
  ],
  [
    'Sofia Rossi',
    'sofia.rossi@example.com',
    null,
    'Could a wheelchair user manage the Hội An walking tour? My father uses one part-time.',
    'hoi-an-walking-tour',
    'Italy',
    ['Accessibility', 'Culture'],
  ],
  [
    'Emma Wilson',
    'emma.wilson@example.com',
    '+61 400 111 222',
    'We want to add two nights in Đà Lạt to a central Vietnam trip. Possible?',
    'dalat-highlands-3d',
    'Australia',
    ['Nature'],
  ],
  [
    'Hans Bakker',
    'hans.bakker@example.com',
    '+31 6 12345678',
    'Do the Bà Nà Hills tickets include the wax museum, or is that extra?',
    'ba-na-hills-day',
    'Netherlands',
    ['Family'],
  ],
  [
    'Yuki Watanabe',
    'yuki.watanabe@example.com',
    '+81 90 1122 3344',
    'Is the Phong Nha cave tour suitable for a nervous swimmer? The boat part worries me.',
    'phong-nha-paradise-cave-day',
    'Japan',
    ['Nature', 'Adventure'],
  ],
  [
    'Carlos Mendez',
    'carlos.mendez@example.com',
    '+52 55 1234 5678',
    'Looking for a private car and guide for a flexible business day in Hà Nội next month.',
    'business-hanoi-city-day',
    'Mexico',
    ['Business'],
  ],
  [
    'Ingrid Larsen',
    'ingrid.larsen@example.com',
    '+47 400 12 345',
    'Any availability for the 5-day north tour over the New Year period for a family of five?',
    'north-vietnam-5d4n',
    'Norway',
    ['Family', 'Culture'],
  ],
  [
    'Priya Sharma',
    'priya.sharma@example.com',
    '+91 90000 11111',
    'We are vegetarians — can the cruise kitchen cater fully? Two adults on the 2D1N.',
    'halong-bay-2d1n',
    'India',
    ['Food', 'Nature'],
  ],
  [
    'Thomas Fischer',
    'thomas.fischer@example.com',
    null,
    'General question: how far in advance should we book for peak season in March?',
    null,
    'Germany',
    ['Planning'],
  ],
  [
    'Léa Moreau',
    'lea.moreau@example.com',
    '+33 6 99 88 77 66',
    'Do you offer a photography-focused itinerary in the north for a solo traveller?',
    'sa-pa-trek-3d2n',
    'France',
    ['Photography', 'Solo'],
  ],
  [
    'Daniel Kim',
    'daniel.kim@example.com',
    '+82 10 1234 5678',
    'Snorkelling trip for two in Phú Quốc — is the coral healthy at this time of year?',
    'phu-quoc-4-islands',
    'South Korea',
    ['Beaches'],
  ],
  [
    'Aisha Rahman',
    'aisha.rahman@example.com',
    '+60 12 345 6789',
    'Halal food options on the central heritage tour — are they easy to arrange?',
    'central-heritage-6d5n',
    'Malaysia',
    ['Food', 'Culture'],
  ],
  [
    'Marek Zieliński',
    'marek.zielinski@example.com',
    '+48 600 700 800',
    'Is the Củ Chi tunnels tour appropriate for a claustrophobic person if we skip the crawling?',
    'cu-chi-tunnels-half-day',
    'Poland',
    ['History'],
  ],
  [
    'Nadia Haddad',
    'nadia.haddad@example.com',
    '+961 3 123 456',
    'We would love a private Mũi Né sunrise tour just for our family of three.',
    'mui-ne-dunes-day',
    'Lebanon',
    ['Family', 'Nature'],
  ],
  [
    'Erik Johansson',
    'erik.johansson@example.com',
    '+46 73 456 78 90',
    'Could you quote the Lan Hạ 3-day cruise for two in a suite with a private balcony?',
    'halong-lan-ha-3d2n',
    'Sweden',
    ['Luxury', 'Nature'],
  ],
];
extraEnq.forEach((e, i) => {
  addEnquiry({
    name: e[0],
    email: e[1],
    phone: e[2],
    message: e[3],
    tourSlug: e[4],
    nationality: e[5],
    interests: e[6],
    status: statusesCycle[i % statusesCycle.length],
    groupSize: 2 + (i % 4),
    budgetTier: ['Budget', 'Comfort', 'Luxury'][i % 3],
    travelOff: 40 + i * 5,
    createdOff: -20 + i,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POSTS (10) — DRAFT & PUBLISHED; title@160, excerpt@300
// ═══════════════════════════════════════════════════════════════════════════
const PS = 'a3000001';
const postDefs = [
  [
    'best-time-to-visit-vietnam',
    'The best time to visit Vietnam, region by region',
    'When the north is misty and the south is golden — how to time your trip for the weather you want.',
    '## North, Central & South\n\nVietnam spans many microclimates. The north has a real winter; the centre is best in spring; the south is warm year-round. Plan around the season you want, not a single "best" month.\n\n### The north\n\nMarch to May and September to November are the sweet spots.',
    'PUBLISHED',
    editorId,
    -40,
  ],
  [
    'two-unhurried-days-in-hoi-an',
    'Two unhurried days in Hội An',
    'Lanterns, tailors, and riverside mornings — a slow itinerary for the old town.',
    '## Day 1\n\nWander the old town before the crowds, then a tailor fitting and a lantern-lit dinner.\n\n## Day 2\n\nCycle to the rice paddies and the beach, returning for the night market.',
    'PUBLISHED',
    editorId,
    -30,
  ],
  [
    'morning-at-the-mekong-floating-markets',
    'A morning at the Mekong floating markets',
    'Dawn on the delta: what to expect, what to eat, and how to find the quieter channels.',
    '## Start before sunrise\n\nThe markets are busiest at dawn. Hire a small boat to slip into the narrow channels the big tours miss.',
    'PUBLISHED',
    editorId,
    -22,
  ],
  [
    'packing-for-a-sa-pa-trek',
    'Packing for a Sa Pa trek: a short, honest list',
    'Boots, layers, and the three things everyone forgets before a mountain homestay.',
    '## The essentials\n\nBroken-in boots, a rain layer, and a head torch. Homestays provide bedding, so travel light.\n\n## What people forget\n\nA dry bag, blister plasters, and cash for the villages.',
    'PUBLISHED',
    adminId,
    -18,
  ],
  [
    'understanding-vietnamese-coffee',
    'A short guide to Vietnamese coffee',
    'From cà phê sữa đá to egg coffee — what to order and where it comes from.',
    '## The basics\n\nStrong robusta, slow drip, sweetened condensed milk. Egg coffee is a Hà Nội invention worth seeking out.',
    'PUBLISHED',
    editorId,
    -12,
  ],
  [
    'is-ha-giang-too-dangerous',
    'Is the Hà Giang loop too dangerous for beginners?',
    'An honest look at the risks of Vietnam’s most famous motorbike route — and how to ride it safely.',
    '## The honest answer\n\nThe roads are mountainous and the weather turns fast. If you have never ridden, take an easy-rider rather than a rental.',
    'DRAFT',
    editorId,
    null,
  ],
  [
    'a-first-timers-week-in-the-north',
    'A first-timer’s week in northern Vietnam',
    'Hà Nội, Hạ Long and Ninh Bình in seven days without rushing — a suggested shape for a first trip.',
    '## The shape of the week\n\nTwo nights in Hà Nội, an overnight cruise, then the karsts of Ninh Bình before flying south.',
    'DRAFT',
    adminId,
    null,
  ],
  [
    'eating-your-way-through-hanoi',
    'Eating your way through the Hà Nội Old Quarter',
    'Eight dishes, eight streets — a hungry walk through the heart of the capital.',
    '## Where to start\n\nBegin with phở for breakfast, then bún chả for lunch, and finish the day with egg coffee.',
    'DRAFT',
    editorId,
    null,
  ],
  [
    'the-caves-of-phong-nha',
    'The caves of Phong Nha, explained',
    'From day-trip grottoes to the world’s largest cave — which one is right for you?',
    '## The options\n\nParadise Cave for grandeur on a day trip, Sơn Đoòng for a once-in-a-lifetime expedition.',
    'PUBLISHED',
    editorId,
    -6,
  ],
  // boundary: title@160, excerpt@300
  [
    'choosing-a-halong-cruise',
    fillTo(160, [
      'A Complete and Thoroughly Considered Field Guide to Choosing Between the Overnight Cruises, Day Trips, and Multi-Day Packages That Sail the Waters of Hạ Long and Lan Hạ Bays',
    ]),
    fillTo(300, [
      'Everything you need to weigh up before you book a cruise on Hạ Long or Lan Hạ Bay, from cabin classes and crowd levels to the difference a third day makes and how to avoid the busiest routes, distilled into one practical and readable guide for first-time visitors to the bay.',
    ]),
    '## Read this first\n\nThe bay is bigger and busier than most people expect. This guide walks through every option in plain terms.',
    'PUBLISHED',
    editorId,
    -3,
  ],
];
const posts = postDefs.map((r, i) => ({
  id: uid(PS, i + 1),
  slug: r[0],
  title: r[1],
  excerpt: r[2],
  content: r[3],
  status: r[4],
  publishedAt: r[6] === null ? null : ts(r[6], 9),
  authorId: r[5],
  createdAt: ts((r[6] === null ? -1 : r[6]) - 2, 9),
  updatedAt: ts(r[6] === null ? -1 : r[6], 9),
}));

// ═══════════════════════════════════════════════════════════════════════════
// OUTBOX (12) — every EmailType; PENDING/SENT/FAILED; unique dedupeKey
// ═══════════════════════════════════════════════════════════════════════════
const OB = 'a4000001';
const outbox = [];
let obSeq = 0;
function addOutbox(
  type,
  status,
  dedupeKey,
  payload,
  attempts,
  lastError,
  processedOff,
) {
  obSeq++;
  outbox.push({
    id: uid(OB, obSeq),
    type,
    payload,
    status,
    attempts,
    dedupeKey,
    lastError: lastError || null,
    createdAt: ts(-10 + obSeq, 10),
    processedAt: processedOff === undefined ? null : ts(processedOff, 10),
  });
}
const b1 = bookings[0],
  b2 = bookings[3];
const bref = bookings.find((b) => b.status === 'REFUNDED');
addOutbox(
  'BOOKING_CONFIRMATION',
  'SENT',
  `booking-confirmation:${b1.id}`,
  {
    bookingCode: b1.code,
    to: b1.contactEmail,
    name: b1.contactName,
    tourTitle: 'Hội An Ancient Town Walking Tour',
  },
  1,
  null,
  -40,
);
addOutbox(
  'BOOKING_CONFIRMATION',
  'SENT',
  `booking-confirmation:${b2.id}`,
  {
    bookingCode: b2.code,
    to: b2.contactEmail,
    name: b2.contactName,
    tourTitle: 'Hạ Long Bay Luxury Cruise 2D1N',
  },
  1,
  null,
  -33,
);
addOutbox(
  'BOOKING_CONFIRMATION',
  'PENDING',
  `booking-confirmation:${bookings[28].id}`,
  {
    bookingCode: bookings[28].code,
    to: bookings[28].contactEmail,
    name: bookings[28].contactName,
    tourTitle: '6-Day Central Vietnam Heritage Road',
  },
  0,
  null,
);
addOutbox(
  'BOOKING_REFUNDED',
  'SENT',
  `booking-refunded:${bref.id}`,
  {
    bookingCode: bref.code,
    to: bref.contactEmail,
    name: bref.contactName,
    amount: bref.totalAmount,
    currency: 'USD',
  },
  1,
  null,
  -43,
);
addOutbox(
  'BOOKING_REFUNDED',
  'FAILED',
  `booking-refunded:${bookings[26].id}`,
  {
    bookingCode: bookings[26].code,
    to: bookings[26].contactEmail,
    name: bookings[26].contactName,
    amount: bookings[26].totalAmount,
    currency: 'USD',
  },
  3,
  'Resend API returned 422: recipient address rejected by the receiving mail server.',
  undefined,
);
addOutbox(
  'REVIEW_APPROVED',
  'SENT',
  `review-approved:${reviews[0].id}`,
  {
    to: users[0].email,
    name: users[0].fullName,
    tourTitle: 'Hội An Ancient Town Walking Tour',
    rating: 5,
  },
  1,
  null,
  -4,
);
addOutbox(
  'REVIEW_APPROVED',
  'PENDING',
  `review-approved:${reviews[2].id}`,
  {
    to: users[4].email,
    name: users[4].fullName,
    tourTitle: 'Phú Quốc 4-Islands Snorkelling Cruise',
    rating: 4,
  },
  0,
  null,
);
addOutbox(
  'REVIEW_APPROVED',
  'FAILED',
  `review-approved:${reviews[5].id}`,
  {
    to: users[1].email,
    name: users[1].fullName,
    tourTitle: '5-Day North Vietnam',
    rating: 5,
  },
  2,
  'Timeout contacting Resend after 2 attempts; will retry on the next drain.',
  undefined,
);
addOutbox(
  'ENQUIRY_RECEIVED',
  'SENT',
  `enquiry-received:${enquiries[0].id}`,
  {
    to: enquiries[0].email,
    name: enquiries[0].name,
    tourTitle: '6-Day Central Vietnam Heritage Road',
  },
  1,
  null,
  -19,
);
addOutbox(
  'ENQUIRY_RECEIVED',
  'SENT',
  `enquiry-received:${enquiries[3].id}`,
  {
    to: enquiries[3].email,
    name: enquiries[3].name,
    tourTitle: 'Sa Pa 3-Day Trek with Local Families',
  },
  1,
  null,
  -17,
);
addOutbox(
  'ENQUIRY_RECEIVED',
  'PENDING',
  `enquiry-received:${enquiries[9].id}`,
  {
    to: enquiries[9].email,
    name: enquiries[9].name,
    tourTitle: '10-Day Vietnam Romantic Getaway',
  },
  0,
  null,
);
addOutbox(
  'ENQUIRY_RECEIVED',
  'FAILED',
  `enquiry-received:${enquiries[5].id}`,
  { to: enquiries[5].email, name: enquiries[5].name, tourTitle: null },
  5,
  'Permanent failure: mailbox does not exist (SMTP 550). Marked failed after 5 attempts.',
  undefined,
);

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA ASSETS (83) — real Unsplash imagery: 16 destinations (hero + 2 gallery) +
// 23 tour heroes + 10 post heroes + 2 user avatars (still Cloudinary placeholders)
// ═══════════════════════════════════════════════════════════════════════════
const MA = 'a5000001';
const mediaAssets = [];
let maSeq = 0;
function addMedia(o) {
  maSeq++;
  mediaAssets.push({
    id: uid(MA, maSeq),
    publicId: o.publicId,
    type: o.type,
    ownerType: o.ownerType,
    ownerId: o.ownerId,
    role: o.role,
    format: o.format || null,
    width: o.width === undefined ? null : o.width,
    height: o.height === undefined ? null : o.height,
    durationSec: o.durationSec === undefined ? null : o.durationSec,
    posterId: o.posterId || null,
    bytes: o.bytes === undefined ? null : o.bytes,
    sortOrder: o.sortOrder || 0,
    createdAt: ts(-100 + maSeq, 8),
    updatedAt: ts(-10, 8),
  });
}
// Real Unsplash imagery (curated + human-vetted + user-approved 2026-07-06). See
// docs/07-plans/2026-07-06-real-content-authoring-plan.md. publicId = absolute URL
// (the Cloudinary builder passes absolute http(s) URLs through as-is).
const destMedia = {
  hanoi: [
    'https://images.unsplash.com/photo-1639484072046-6ac4984061e1?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526674956144-c9667d22f71f?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1680796030177-26de76d55748?w=1600&q=70&auto=format&fit=crop',
  ],
  'ha-long-bay': [
    'https://images.unsplash.com/photo-1761127138372-cad230082b19?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1669819894338-53ab7afc6958?w=1600&q=70&auto=format&fit=crop',
  ],
  'ninh-binh': [
    'https://images.unsplash.com/photo-1560079561-3086e6dbde25?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1685345411484-c181bea48e9e?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503539680555-732099a55a56?w=1600&q=70&auto=format&fit=crop',
  ],
  'sa-pa': [
    'https://images.unsplash.com/photo-1753003491860-89b500bc62f3?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1454580083719-5135531ae1dc?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1694083151781-946334842033?w=1600&q=70&auto=format&fit=crop',
  ],
  'ha-giang': [
    'https://images.unsplash.com/photo-1536511671359-849531c0a576?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534785918844-ee0cdd66df36?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1585750902093-98e021b3ace2?w=1600&q=70&auto=format&fit=crop',
  ],
  'cat-ba': [
    'https://images.unsplash.com/photo-1722987203822-5c7a8b5bdbfd?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1741319717005-ffd7b1f4bb63?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1547024842-44f3087a4e20?w=1600&q=70&auto=format&fit=crop',
  ],
  'da-nang': [
    'https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1440694997168-8ae4033554c7?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551696574-bf6016b8810f?w=1600&q=70&auto=format&fit=crop',
  ],
  'hoi-an': [
    'https://images.unsplash.com/photo-1694391744914-8d82068cb46f?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1771348763473-2263cbf2ed94?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1600&q=70&auto=format&fit=crop',
  ],
  hue: [
    'https://images.unsplash.com/photo-1716817623452-9ce58a3acac5?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1724533815121-ca09833513ee?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1568775791746-bcc117bcb312?w=1600&q=70&auto=format&fit=crop',
  ],
  'phong-nha': [
    'https://images.unsplash.com/photo-1523419163445-589ebf1785c8?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1554285859-6ac081ea54b9?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1719461208300-e9d199bc59f7?w=1600&q=70&auto=format&fit=crop',
  ],
  'ho-chi-minh-city': [
    'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1578031894526-2e165e29f9d2?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1737192577651-45407e33d197?w=1600&q=70&auto=format&fit=crop',
  ],
  'mekong-delta': [
    'https://images.unsplash.com/photo-1529271230144-e8c648ef570d?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1689760661317-a839f59b1c32?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1547558902-0a66a7526661?w=1600&q=70&auto=format&fit=crop',
  ],
  'phu-quoc': [
    'https://images.unsplash.com/photo-1693282814784-649be45a459b?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1775874045802-2995172ff0e7?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1738070374913-38213dff257c?w=1600&q=70&auto=format&fit=crop',
  ],
  'mui-ne': [
    'https://images.unsplash.com/photo-1554736000-7c1b76461421?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1617620217902-5a6eefe41fa7?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1756798712671-a5c7facf64fe?w=1600&q=70&auto=format&fit=crop',
  ],
  'da-lat': [
    'https://images.unsplash.com/photo-1678099006439-dba9e4d3f9f5?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584457173475-2996e0757ab8?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1564396738239-351774a1a50e?w=1600&q=70&auto=format&fit=crop',
  ],
  'con-dao': [
    'https://images.unsplash.com/photo-1686073769358-57d716df2f3b?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1768040632264-d8ad69bd4536?w=1600&q=70&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1768780652079-63dfef5f829e?w=1600&q=70&auto=format&fit=crop',
  ],
};
const tourHero = {
  'hoi-an-walking-tour':
    'https://images.unsplash.com/photo-1694391744914-8d82068cb46f?w=1600&q=70&auto=format&fit=crop',
  'ba-na-hills-day':
    'https://images.unsplash.com/photo-1741138327956-dfa75763b50d?w=1600&q=70&auto=format&fit=crop',
  'hue-imperial-day':
    'https://images.unsplash.com/photo-1716817623452-9ce58a3acac5?w=1600&q=70&auto=format&fit=crop',
  'ninh-binh-day':
    'https://images.unsplash.com/photo-1560079561-3086e6dbde25?w=1600&q=70&auto=format&fit=crop',
  'cu-chi-tunnels-half-day':
    'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600&q=70&auto=format&fit=crop',
  'mekong-delta-day':
    'https://images.unsplash.com/photo-1529271230144-e8c648ef570d?w=1600&q=70&auto=format&fit=crop',
  'phu-quoc-4-islands':
    'https://images.unsplash.com/photo-1693282814784-649be45a459b?w=1600&q=70&auto=format&fit=crop',
  'phong-nha-paradise-cave-day':
    'https://images.unsplash.com/photo-1523419163445-589ebf1785c8?w=1600&q=70&auto=format&fit=crop',
  'hanoi-street-food-walk':
    'https://images.unsplash.com/photo-1527997921830-de1cf1f9b430?w=1600&q=70&auto=format&fit=crop',
  'mui-ne-dunes-day':
    'https://images.unsplash.com/photo-1554736000-7c1b76461421?w=1600&q=70&auto=format&fit=crop',
  'halong-bay-2d1n':
    'https://images.unsplash.com/photo-1761127138372-cad230082b19?w=1600&q=70&auto=format&fit=crop',
  'halong-lan-ha-3d2n':
    'https://images.unsplash.com/photo-1741319717005-ffd7b1f4bb63?w=1600&q=70&auto=format&fit=crop',
  'sa-pa-trek-3d2n':
    'https://images.unsplash.com/photo-1753003491860-89b500bc62f3?w=1600&q=70&auto=format&fit=crop',
  'ha-giang-loop-3d2n':
    'https://images.unsplash.com/photo-1536511671359-849531c0a576?w=1600&q=70&auto=format&fit=crop',
  'cat-ba-national-park-trek':
    'https://images.unsplash.com/photo-1722987203822-5c7a8b5bdbfd?w=1600&q=70&auto=format&fit=crop',
  'north-vietnam-5d4n':
    'https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=1600&q=70&auto=format&fit=crop',
  'central-heritage-6d5n':
    'https://images.unsplash.com/photo-1724533815121-ca09833513ee?w=1600&q=70&auto=format&fit=crop',
  'vietnam-grand-tour-14d':
    'https://images.unsplash.com/photo-1669819894338-53ab7afc6958?w=1600&q=70&auto=format&fit=crop',
  'vietnam-romantic-10d':
    'https://images.unsplash.com/photo-1771348763473-2263cbf2ed94?w=1600&q=70&auto=format&fit=crop',
  'phu-quoc-honeymoon-5d':
    'https://images.unsplash.com/photo-1775874045802-2995172ff0e7?w=1600&q=70&auto=format&fit=crop',
  'dalat-highlands-3d':
    'https://images.unsplash.com/photo-1678099006439-dba9e4d3f9f5?w=1600&q=70&auto=format&fit=crop',
  'saigon-city-half-day':
    'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1600&q=70&auto=format&fit=crop',
  'business-hanoi-city-day':
    'https://images.unsplash.com/photo-1639484072046-6ac4984061e1?w=1600&q=70&auto=format&fit=crop',
};
const postHero = {
  'best-time-to-visit-vietnam':
    'https://images.unsplash.com/photo-1685345411484-c181bea48e9e?w=1600&q=70&auto=format&fit=crop',
  'two-unhurried-days-in-hoi-an':
    'https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1600&q=70&auto=format&fit=crop',
  'morning-at-the-mekong-floating-markets':
    'https://images.unsplash.com/photo-1689760661317-a839f59b1c32?w=1600&q=70&auto=format&fit=crop',
  'packing-for-a-sa-pa-trek':
    'https://images.unsplash.com/photo-1454580083719-5135531ae1dc?w=1600&q=70&auto=format&fit=crop',
  'understanding-vietnamese-coffee':
    'https://images.unsplash.com/photo-1471922597728-92f81bfe2445?w=1600&q=70&auto=format&fit=crop',
  'is-ha-giang-too-dangerous':
    'https://images.unsplash.com/photo-1534785918844-ee0cdd66df36?w=1600&q=70&auto=format&fit=crop',
  'a-first-timers-week-in-the-north':
    'https://images.unsplash.com/photo-1526674956144-c9667d22f71f?w=1600&q=70&auto=format&fit=crop',
  'eating-your-way-through-hanoi':
    'https://images.unsplash.com/photo-1680796030177-26de76d55748?w=1600&q=70&auto=format&fit=crop',
  'the-caves-of-phong-nha':
    'https://images.unsplash.com/photo-1554285859-6ac081ea54b9?w=1600&q=70&auto=format&fit=crop',
  'choosing-a-halong-cruise':
    'https://images.unsplash.com/photo-1668000018482-a02acf02b22a?w=1600&q=70&auto=format&fit=crop',
};
const postIdBySlug = (slug) => posts.find((p) => p.slug === slug).id;
Object.entries(destMedia).forEach(([slug, urls]) => {
  urls.forEach((url, i) =>
    addMedia({
      publicId: url,
      type: 'IMAGE',
      ownerType: 'DESTINATION',
      ownerId: destId(slug),
      role: i === 0 ? 'hero' : 'gallery',
      format: 'jpg',
      width: i === 0 ? 2000 : 1600,
      height: i === 0 ? 1125 : 1067,
      bytes: i === 0 ? 480000 : 400000,
      sortOrder: i,
    }),
  );
});
Object.entries(tourHero).forEach(([slug, url]) =>
  addMedia({
    publicId: url,
    type: 'IMAGE',
    ownerType: 'TOUR',
    ownerId: tourId(slug),
    role: 'hero',
    format: 'jpg',
    width: 1600,
    height: 900,
    bytes: 384000,
    sortOrder: 0,
  }),
);
Object.entries(postHero).forEach(([slug, url]) =>
  addMedia({
    publicId: url,
    type: 'IMAGE',
    ownerType: 'POST',
    ownerId: postIdBySlug(slug),
    role: 'hero',
    format: 'jpg',
    width: 1600,
    height: 900,
    bytes: 356000,
    sortOrder: 0,
  }),
);
addMedia({
  publicId: 'nexora/users/emma-thompson/avatar',
  type: 'IMAGE',
  ownerType: 'USER',
  ownerId: users[0].id,
  role: 'avatar',
  format: 'png',
  width: 512,
  height: 512,
  bytes: 88000,
  sortOrder: 0,
});
addMedia({
  publicId: 'nexora/users/lukas-muller/avatar',
  type: 'IMAGE',
  ownerType: 'USER',
  ownerId: users[3].id,
  role: 'avatar',
  format: 'jpg',
  width: 512,
  height: 512,
  bytes: 72000,
  sortOrder: 0,
});

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA GARBAGE (4) — orphaned assets pending destroy; unique publicId
// ═══════════════════════════════════════════════════════════════════════════
const MG = 'a6000001';
const mediaGarbage = [
  {
    id: uid(MG, 1),
    publicId: 'nexora/users/emma-thompson/avatar-old',
    resourceType: 'image',
    attempts: 0,
    lastError: null,
    createdAt: ts(-5, 8),
  },
  {
    id: uid(MG, 2),
    publicId: 'nexora/tours/hoi-an-walking-tour/gallery-removed',
    resourceType: 'image',
    attempts: 1,
    lastError:
      'Cloudinary destroy returned "not found"; will retry once more before giving up.',
    createdAt: ts(-4, 8),
  },
  {
    id: uid(MG, 3),
    publicId: 'nexora/tours/halong-bay-2d1n/promo-old',
    resourceType: 'video',
    attempts: 2,
    lastError:
      'Rate limited by Cloudinary (420); backing off before the next attempt.',
    createdAt: ts(-3, 8),
  },
  {
    id: uid(MG, 4),
    publicId: 'nexora/destinations/con-dao/hero-deleted',
    resourceType: 'image',
    attempts: 0,
    lastError: null,
    createdAt: ts(-2, 8),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ASSEMBLE + EMIT
// ═══════════════════════════════════════════════════════════════════════════
const MODELS = {
  users,
  tourCategories: categories,
  destinations,
  tours,
  tourDestinations,
  tourItineraryDays: itineraryDays,
  tourFaqs: faqs,
  tourPolicies: policies,
  tourDepartures: departures,
  bookings,
  paymentEvents,
  reviews,
  wishlist,
  enquiries,
  posts,
  outbox,
  mediaAssets,
  mediaGarbage,
};
const ENUM = {
  users: { role: 'UserRole' },
  tours: { suitableFor: ['TravellerType'], badges: ['TourBadge'] },
  tourPolicies: { kind: 'PolicyKind' },
  tourDepartures: { status: 'DepartureStatus' },
  bookings: { status: 'BookingStatus', paymentProvider: 'PaymentProvider' },
  paymentEvents: { provider: 'PaymentProvider' },
  reviews: { source: 'ReviewSource' },
  enquiries: { status: 'EnquiryStatus' },
  posts: { status: 'PostStatus' },
  outbox: { type: 'EmailType', status: 'OutboxStatus' },
  mediaAssets: {
    type: 'MediaType',
    ownerType: 'MediaOwnerType',
    role: 'MediaRole',
  },
};
function clean(obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) if (!k.startsWith('_')) o[k] = v;
  return o;
}
for (const [name, arr] of Object.entries(MODELS)) {
  fs.writeFileSync(
    path.join(JSON_DIR, `${name}.json`),
    JSON.stringify(arr.map(clean), null, 2) + '\n',
  );
}
function tsScalar(v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return '[' + v.map(tsScalar).join(', ') + ']';
  return JSON.stringify(v);
}
function tsValue(model, key, v) {
  const spec = ENUM[model] && ENUM[model][key];
  if (spec) {
    if (Array.isArray(spec))
      return '[' + v.map((x) => `${spec[0]}.${x}`).join(', ') + ']';
    if (v === null) return 'null';
    return `${spec}.${v}`;
  }
  return tsScalar(v);
}
function tsObject(model, obj) {
  const lines = Object.entries(clean(obj)).map(
    ([k, v]) => `    ${k}: ${tsValue(model, k, v)},`,
  );
  return `  {\n${lines.join('\n')}\n  }`;
}
function tsArray(model, arr) {
  return `[\n${arr.map((o) => tsObject(model, o)).join(',\n')},\n]`;
}
const enumImports = [
  'BookingStatus',
  'DepartureStatus',
  'EmailType',
  'EnquiryStatus',
  'MediaOwnerType',
  'MediaRole',
  'MediaType',
  'OutboxStatus',
  'PaymentProvider',
  'PolicyKind',
  'PostStatus',
  'ReviewSource',
  'TourBadge',
  'TravellerType',
  'UserRole',
];
let tsOut = `/**
 * Sample fixture data for @tourism/api — realistic, varied records covering
 * status/lifecycle, Unicode/i18n text, and boundary-value edge cases.
 *
 * GENERATED by prisma/fixtures/gen.cjs — do not edit by hand; edit the generator
 * and re-run (\`node gen.cjs\`). The JSON files under ./json mirror these exactly.
 *
 * Foreign keys are wired via explicit UUIDs. Decimal fields are strings (matching
 * Prisma's Decimal serialization); date-only fields are 'YYYY-MM-DD'; timestamps
 * are ISO-8601. Values are Prisma-createMany-friendly, but this dataset is
 * intentionally standalone (it is NOT wired into prisma/seed.ts).
 */
import {
${enumImports.map((e) => `  ${e},`).join('\n')}
} from '@prisma/client';

`;
for (const name of Object.keys(MODELS)) {
  tsOut += `export const ${name} = ${tsArray(name, MODELS[name])} as const;\n\n`;
}
tsOut += `export const fixtures = {
${Object.keys(MODELS)
  .map((n) => `  ${n},`)
  .join('\n')}
} as const;

export default fixtures;
`;
fs.writeFileSync(path.join(OUT, 'sample-data.ts'), tsOut);

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
const errors = [];
const warn = [];
const idset = (arr) => new Set(arr.map((x) => x.id));
const userIds = idset(users),
  catIds = idset(categories),
  destIds = idset(destinations),
  tourIds = idset(tours),
  depIds = idset(departures),
  bookIds = idset(bookings),
  postIds = idset(posts);
const fk = (label, arr, field, set, nullable) => {
  for (const r of arr) {
    const v = r[field];
    if (v === null || v === undefined) {
      if (!nullable) errors.push(`${label}.${field} null but required`);
      continue;
    }
    if (!set.has(v)) errors.push(`${label}.${field} → missing ref ${v}`);
  }
};
fk('tours', tours, 'categoryId', catIds);
tourDestinations.forEach((td) => {
  if (!tourIds.has(td.tourId))
    errors.push(`tourDestinations.tourId missing ${td.tourId}`);
  if (!destIds.has(td.destinationId))
    errors.push(`tourDestinations.destinationId missing ${td.destinationId}`);
});
fk('tourItineraryDays', itineraryDays, 'tourId', tourIds);
fk('tourFaqs', faqs, 'tourId', tourIds);
fk('tourPolicies', policies, 'tourId', tourIds);
fk('tourDepartures', departures, 'tourId', tourIds);
fk('bookings', bookings, 'userId', userIds);
fk('bookings', bookings, 'tourId', tourIds);
fk('bookings', bookings, 'departureId', depIds);
fk('bookings', bookings, 'refundedById', userIds, true);
fk('reviews', reviews, 'tourId', tourIds, true);
fk('reviews', reviews, 'userId', userIds, true);
fk('reviews', reviews, 'bookingId', bookIds, true);
fk('wishlist', wishlist, 'userId', userIds);
fk('wishlist', wishlist, 'tourId', tourIds);
fk('enquiries', enquiries, 'tourId', tourIds, true);
fk('posts', posts, 'authorId', userIds);
mediaAssets.forEach((m) => {
  const set = {
    TOUR: tourIds,
    DESTINATION: destIds,
    USER: userIds,
    POST: postIds,
  }[m.ownerType];
  if (!set.has(m.ownerId))
    errors.push(`mediaAssets.ownerId ${m.ownerId} not a valid ${m.ownerType}`);
});
const uniq = (label, arr, field) => {
  const seen = new Set();
  for (const r of arr) {
    const v = r[field];
    if (v === null || v === undefined) continue;
    if (seen.has(v)) errors.push(`${label}.${field} duplicate: ${v}`);
    seen.add(v);
  }
};
uniq('users', users, 'email');
uniq('users', users, 'supabaseId');
uniq('users', users, 'id');
uniq('tourCategories', categories, 'slug');
uniq('destinations', destinations, 'slug');
uniq('tours', tours, 'slug');
uniq('bookings', bookings, 'code');
uniq('bookings', bookings, 'providerSessionId');
uniq('posts', posts, 'slug');
uniq('outbox', outbox, 'dedupeKey');
uniq('mediaGarbage', mediaGarbage, 'publicId');
uniq('reviews', reviews, 'bookingId');
const compUniq = (label, arr, fields) => {
  const seen = new Set();
  for (const r of arr) {
    const key = fields.map((f) => r[f]).join('|');
    if (seen.has(key)) errors.push(`${label} duplicate composite ${key}`);
    seen.add(key);
  }
};
compUniq('wishlist', wishlist, ['userId', 'tourId']);
compUniq('tourDestinations', tourDestinations, ['tourId', 'destinationId']);
compUniq('tourItineraryDays', itineraryDays, ['tourId', 'dayNumber']);
compUniq('paymentEvents', paymentEvents, ['provider', 'eventId']);
const ENUM_VALUES = {
  UserRole: ['CUSTOMER', 'ADMIN'],
  DepartureStatus: ['OPEN', 'CLOSED', 'CANCELLED'],
  BookingStatus: ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'],
  PaymentProvider: ['STRIPE', 'PAYPAL'],
  EnquiryStatus: ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'],
  MediaType: ['IMAGE', 'VIDEO'],
  MediaOwnerType: ['TOUR', 'DESTINATION', 'USER', 'POST'],
  MediaRole: ['hero', 'gallery', 'avatar'],
  PolicyKind: ['CANCELLATION', 'BOOKING', 'GENERAL'],
  TravellerType: ['FAMILY', 'COUPLE', 'FRIENDS', 'SOLO', 'BUSINESS'],
  ReviewSource: ['VERIFIED', 'CURATED'],
  TourBadge: ['BEST_VALUE', 'LIMITED_OFFER', 'EXCLUSIVE', 'NEW', 'POPULAR'],
  EmailType: [
    'BOOKING_CONFIRMATION',
    'BOOKING_REFUNDED',
    'REVIEW_APPROVED',
    'ENQUIRY_RECEIVED',
  ],
  OutboxStatus: ['PENDING', 'SENT', 'FAILED'],
  PostStatus: ['DRAFT', 'PUBLISHED'],
};
const seen = {};
Object.keys(ENUM_VALUES).forEach((k) => (seen[k] = new Set()));
const chkEnum = (model, arr) => {
  const map = ENUM[model];
  if (!map) return;
  for (const [k, spec] of Object.entries(map)) {
    const enumName = Array.isArray(spec) ? spec[0] : spec;
    const allowed = ENUM_VALUES[enumName];
    for (const r of arr) {
      const val = r[k];
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) {
        if (v === null || v === undefined) continue;
        seen[enumName].add(v);
        if (!allowed.includes(v))
          errors.push(`${model}.${k} invalid ${enumName}: ${v}`);
      }
    }
  }
};
Object.entries(MODELS).forEach(([m, a]) => chkEnum(m, a));
for (const [name, vals] of Object.entries(ENUM_VALUES)) {
  for (const v of vals)
    if (!seen[name].has(v)) warn.push(`enum ${name}.${v} NOT covered`);
}
const CAPS = {
  users: { fullName: 120, phone: 20, locale: 10 },
  tourCategories: { slug: 60, name: 120, description: 500 },
  destinations: {
    slug: 80,
    name: 120,
    country: 60,
    region: 80,
    description: 2000,
  },
  tours: {
    slug: 120,
    title: 200,
    summary: 500,
    difficulty: 30,
    currency: 3,
    meetingPoint: 300,
  },
  tourItineraryDays: { title: 200, description: 2000 },
  tourFaqs: { question: 300, answer: 2000 },
  tourPolicies: { title: 200, body: 4000 },
  bookings: {
    code: 20,
    currency: 3,
    contactName: 120,
    contactEmail: 200,
    contactPhone: 30,
    specialRequests: 1000,
    providerSessionId: 255,
    providerPaymentId: 255,
    refundReason: 500,
  },
  reviews: {
    title: 120,
    body: 2000,
    authorName: 120,
    authorLocation: 120,
    tripLabel: 160,
  },
  paymentEvents: { eventId: 255, type: 100 },
  enquiries: {
    name: 120,
    email: 200,
    phone: 30,
    message: 2000,
    nationality: 80,
    budgetTier: 40,
  },
  posts: { slug: 80, title: 160, excerpt: 300 },
  outbox: { dedupeKey: 200, lastError: 1000 },
  mediaAssets: { publicId: 300, format: 10, posterId: 300 },
  mediaGarbage: { publicId: 300, resourceType: 10, lastError: 1000 },
};
const capReport = [];
for (const [model, caps] of Object.entries(CAPS)) {
  for (const r of MODELS[model]) {
    for (const [f, cap] of Object.entries(caps)) {
      const v = r[f];
      if (typeof v !== 'string') continue;
      if (v.length > cap)
        errors.push(`${model}.${f} exceeds ${cap}: ${v.length} chars`);
      if (v.length === cap) capReport.push(`${model}.${f} == ${cap}`);
    }
  }
}
const counts = Object.fromEntries(
  Object.entries(MODELS).map(([k, v]) => [k, v.length]),
);
console.log('── Record counts ──');
console.log(JSON.stringify(counts, null, 2));
console.log(
  `\nTotal records: ${Object.values(counts).reduce((a, b) => a + b, 0)}`,
);
console.log('\n── Boundary caps hit exactly ──');
capReport.forEach((c) => console.log('  ' + c));
if (warn.length) {
  console.log('\n── Coverage warnings ──');
  warn.forEach((w) => console.log('  ! ' + w));
}
if (errors.length) {
  console.log(`\nFAILED: ${errors.length} validation error(s):`);
  errors.forEach((e) => console.log('  x ' + e));
  process.exit(1);
}
console.log('\nOK — all integrity, uniqueness, enum, and cap checks passed.');
console.log(
  `Wrote sample-data.ts + json/*.json (${Object.keys(MODELS).length} models).`,
);
