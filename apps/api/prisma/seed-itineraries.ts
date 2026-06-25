/**
 * Detailed, time-stamped itineraries keyed by tour slug — modelled on Lily's
 * day-by-day breakdowns (TEXT only). Each day's `description` is newline-separated
 * "HH:MM — activity" milestones (arrival/departure days are lighter), so travellers
 * can see exactly what a day involves. The web parses these lines into a timeline
 * (see apps/web/src/lib/itinerary.ts); each stays well under the VarChar(2000) cap.
 *
 * The seed reads `ITINERARIES[tour.slug]` (replace-all per tour), so adding/adjusting
 * a tour's days happens here, not inline in the catalog.
 */

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
}

export const ITINERARIES: Record<string, ItineraryDay[]> = {
  // ── Day tours ─────────────────────────────────────────────────────────────
  'hoi-an-walking-tour': [
    {
      dayNumber: 1,
      title: 'Hoi An old town & lantern dusk',
      description: [
        '15:30 — Meet your guide at the tourist information centre on Le Loi street.',
        '15:45 — Walk the old town: the Japanese Covered Bridge, the Fujian Assembly Hall and a 200-year-old merchant house.',
        '16:45 — Duck into a tailor’s workshop and a traditional medicine shop to hear the trading-port story.',
        '17:30 — Coffee or a cao lau / white-rose dumpling tasting as the lanterns are lit.',
        '18:15 — Stroll the riverfront as the old town glows; free time for photos and the night market.',
        '18:45 — Float your own paper lantern on the Thu Bon river to close the tour.',
      ].join('\n'),
    },
  ],
  'ba-na-hills-day': [
    {
      dayNumber: 1,
      title: 'Ba Na Hills & the Golden Bridge',
      description: [
        '07:30 — Hotel pickup in Da Nang and the scenic drive to the cable-car station.',
        '08:30 — Ride the record-breaking cable car up into the cool hills.',
        '09:15 — The Golden Bridge — the giant stone hands and cloud-level views.',
        '10:00 — Explore Le Jardin gardens, the Linh Ung pagoda and the Debay wine cellar.',
        '12:00 — Buffet lunch with mountain views.',
        '13:30 — Indoor games at Fantasy Park and the French Village.',
        '15:30 — Cable car down and the drive back.',
        '16:30 — Drop-off at your Da Nang hotel.',
      ].join('\n'),
    },
  ],
  'hue-imperial-day': [
    {
      dayNumber: 1,
      title: 'Imperial Hue full day',
      description: [
        '08:00 — Pickup from your central Hue hotel.',
        '08:30 — The Imperial Citadel and the Forbidden Purple City.',
        '10:30 — The tomb of Emperor Tu Duc, set among pines and lotus ponds.',
        '11:45 — The ornate tomb of Emperor Khai Dinh.',
        '12:30 — Local lunch of Hue specialities.',
        '14:00 — A dragon-boat ride on the Perfume River to the Thien Mu Pagoda.',
        '15:30 — Dong Ba market for a last wander.',
        '16:30 — Return to your hotel.',
      ].join('\n'),
    },
  ],
  'ninh-binh-day': [
    {
      dayNumber: 1,
      title: 'Hoa Lu, Tam Coc & Mua Cave',
      description: [
        '07:30–08:00 — Pickup from your Hanoi Old Quarter hotel; drive to Ninh Binh (~2h).',
        '09:15 — Short break en route.',
        '10:30 — Hoa Lu, the 10th-century ancient capital, and its dynastic temples.',
        '11:45 — Buffet lunch of local specialities.',
        '13:00 — A 1.5-hour bamboo-boat ride through the Tam Coc limestone caves.',
        '15:00 — Cycle through rice-field villages.',
        '15:45 — Climb the 500 steps to the Mua Cave viewpoint over the valley.',
        '17:00 — Drive back to Hanoi.',
      ].join('\n'),
    },
  ],
  'cu-chi-tunnels-half-day': [
    {
      dayNumber: 1,
      title: 'Cu Chi tunnels half day',
      description: [
        '08:00–08:30 — Pickup from your District 1 hotel; drive to Cu Chi (~1h).',
        '09:30 — Introductory documentary on the tunnel network.',
        '10:00 — Guided walk through the living areas, kitchens, traps and ventilation.',
        '10:45 — Crawl a widened section of the tunnels (optional).',
        '11:15 — Rice-paper workshop and a taste of steamed cassava, the wartime staple.',
        '11:45 — Optional shooting range (own cost).',
        '12:30 — Drive back, arriving Ho Chi Minh City around 14:00.',
      ].join('\n'),
    },
  ],
  'mekong-delta-day': [
    {
      dayNumber: 1,
      title: 'Cai Rang market & the orchard channels',
      description: [
        '05:30 — Early pickup from your District 1 hotel for the drive to the delta.',
        '07:30 — Board a boat for the Cai Rang floating market at its busiest.',
        '08:30 — Slip into the narrow orchard channels by sampan.',
        '09:30 — A rice-noodle workshop and a tropical-fruit tasting.',
        '11:00 — Cycle or stroll a village lane to meet local families.',
        '12:00 — Riverside lunch of delta specialities.',
        '13:30 — Relax on the cruise back to the pier; drive to the city.',
        '16:00 — Drop-off in Ho Chi Minh City.',
      ].join('\n'),
    },
  ],
  'phu-quoc-4-islands': [
    {
      dayNumber: 1,
      title: 'An Thoi archipelago by speedboat',
      description: [
        '08:00 — Pickup and transfer to An Thoi harbour.',
        '08:45 — Board the speedboat and cruise out among the southern islands.',
        '09:30 — First snorkel stop over a shallow coral reef (gear provided).',
        '11:00 — Beach time and swimming on a quiet island.',
        '12:00 — Fresh seafood BBQ lunch on board.',
        '13:30 — Second snorkel stop at a deeper reef.',
        '15:00 — Optional ride on the world’s longest sea-crossing cable car.',
        '16:30 — Return to harbour and hotel drop-off.',
      ].join('\n'),
    },
  ],
  'phong-nha-paradise-cave-day': [
    {
      dayNumber: 1,
      title: 'Phong Nha grotto & Paradise Cave',
      description: [
        '08:00 — Pickup from Phong Nha town or Dong Hoi.',
        '09:00 — Boat along the Son river into the river-cut Phong Nha cave.',
        '10:30 — Explore the lit chambers and rock formations on foot.',
        '12:00 — Local lunch near the national park.',
        '13:30 — Walk up to Paradise Cave and its cathedral-scale interior (~1km of boardwalk).',
        '15:30 — Free time for photos of the karst valley.',
        '16:00 — Drive back to town for drop-off.',
      ].join('\n'),
    },
  ],
  'hanoi-street-food-walk': [
    {
      dayNumber: 1,
      title: 'Old Quarter street-food walk',
      description: [
        '17:00 — Meet your foodie guide at the Hang Be market entrance.',
        '17:20 — Bun cha — grilled pork with herbs and noodles.',
        '17:50 — Pho at a family-run stall.',
        '18:20 — Nem (fried spring rolls) and banh cuon.',
        '18:50 — Banh mi from a beloved corner cart.',
        '19:20 — A craft of bia hoi on a plastic stool, people-watching.',
        '19:50 — Finish with Hanoi’s famous egg coffee.',
      ].join('\n'),
    },
  ],
  'mui-ne-dunes-day': [
    {
      dayNumber: 1,
      title: 'Sand dunes, Fairy Stream & fishing village',
      description: [
        '04:30 — Early pickup for sunrise over the dunes (later start available on request).',
        '05:30 — The White Sand Dunes — sweeping views and optional quad-bike or sand-sledding.',
        '07:00 — The Red Sand Dunes, glowing in the morning light.',
        '08:00 — Wade up the Fairy Stream between red-rock canyons and palm groves.',
        '09:00 — The Mui Ne fishing village and its bay full of round basket boats.',
        '09:45 — Breakfast or coffee with a sea view.',
        '10:30 — Return transfer to your resort.',
      ].join('\n'),
    },
  ],

  // ── Cruises ──────────────────────────────────────────────────────────────
  'halong-bay-2d1n': [
    {
      dayNumber: 1,
      title: 'Hanoi → Ha Long Bay & sunset cruise',
      description: [
        '08:00 — Pickup from your Hanoi Old Quarter hotel; drive to the wharf (~2.5h).',
        '11:30 — Board your cruise; welcome drink and cabin check-in.',
        '12:30 — Lunch on board as you sail out among the karsts.',
        '14:30 — Visit a pearl farm, then kayak or swim from Titov Island.',
        '16:00 — Short hike to the Titov viewpoint over the bay.',
        '18:00 — Sunset party on the sundeck and a cooking demonstration.',
        '19:30 — Dinner, then squid fishing off the back of the boat.',
      ].join('\n'),
    },
    {
      dayNumber: 2,
      title: 'Sung Sot cave & return',
      description: [
        '06:30 — Optional sunrise Tai Chi on the sundeck.',
        '07:00 — Light breakfast as the bay wakes up.',
        '08:00 — Explore the cathedral-like Sung Sot (Surprise) cave.',
        '09:30 — Brunch on board while cruising back.',
        '11:00 — Disembark at the wharf.',
        '11:30 — Drive back to Hanoi, arriving mid-afternoon.',
      ].join('\n'),
    },
  ],
  'halong-lan-ha-3d2n': [
    {
      dayNumber: 1,
      title: 'Hanoi → Lan Ha Bay',
      description: [
        '08:00 — Pickup in Hanoi and transfer to the harbour.',
        '12:00 — Board the cruise; lunch as you sail into the quieter Lan Ha Bay.',
        '14:30 — Kayak among secluded karsts and swim from a hidden beach.',
        '17:30 — Sunset on deck.',
        '19:00 — Welcome dinner on board.',
      ].join('\n'),
    },
    {
      dayNumber: 2,
      title: 'Lagoons, caves & Cat Ba',
      description: [
        '06:30 — Sunrise Tai Chi and breakfast.',
        '08:30 — Tender out to a sea cave and hidden lagoons by kayak.',
        '11:00 — Visit a floating fishing village.',
        '12:30 — Lunch, then a Cat Ba island beach in the afternoon.',
        '17:30 — Sunset over the water; dinner on board.',
      ].join('\n'),
    },
    {
      dayNumber: 3,
      title: 'Sunrise & return to Hanoi',
      description: [
        '06:30 — Final sunrise Tai Chi.',
        '08:00 — Leisurely brunch as the cruise winds back through the karsts.',
        '10:30 — Disembark and transfer back to Hanoi.',
      ].join('\n'),
    },
  ],

  // ── Trekking & adventure ─────────────────────────────────────────────────
  'sa-pa-trek-3d2n': [
    {
      dayNumber: 1,
      title: 'Sa Pa → Sa Seng & first homestay',
      description: [
        '08:30 — Meet your local guide for breakfast in Sa Pa town.',
        '09:30 — Trek out through Sa Seng village and terraced fields (~6km).',
        '12:00 — Picnic lunch by a waterfall; an afternoon swim if it’s warm.',
        '14:00 — Continue along hillside paths with valley views (~5km).',
        '16:30 — Arrive at the homestay; help cook dinner with your host family.',
        '19:00 — Family dinner and a glass of local rice wine.',
      ].join('\n'),
    },
    {
      dayNumber: 2,
      title: 'Through the valley to Ban Ho',
      description: [
        '07:30 — Breakfast with the family.',
        '08:30 — Trek through bamboo forest to the Giang Ta Chai waterfall and a rattan bridge.',
        '11:00 — Visit Red Dao and Black Hmong villages along the way.',
        '12:30 — Lunch in a village.',
        '14:00 — Descend to the Tay village of Ban Ho amid rice paddies (~7km total).',
        '17:00 — Second homestay; rest and dinner.',
      ].join('\n'),
    },
    {
      dayNumber: 3,
      title: 'Nam Toong remote fields & return',
      description: [
        '07:30 — Breakfast at the homestay.',
        '08:30 — Morning trek to Nam Toong and its remote rice fields.',
        '11:30 — Return to Ban Ho for lunch.',
        '13:30 — Final walk to the road and transfer back to Sa Pa.',
      ].join('\n'),
    },
  ],
  'ha-giang-loop-3d2n': [
    {
      dayNumber: 1,
      title: 'Ha Giang → Yen Minh',
      description: [
        '08:00 — Gear up and safety briefing at the tour office.',
        '08:30 — Ride north through the Quan Ba “Heaven’s Gate” pass.',
        '10:30 — The Twin Mountains viewpoint and a coffee stop.',
        '12:30 — Lunch in a roadside town.',
        '14:00 — Wind up onto the karst plateau, stopping at viewpoints.',
        '17:00 — Arrive Yen Minh; homestay dinner.',
      ].join('\n'),
    },
    {
      dayNumber: 2,
      title: 'Dong Van & the Ma Pi Leng pass',
      description: [
        '07:30 — Breakfast and ride to the Lung Cu flag tower near the border.',
        '10:00 — The Hmong King’s palace at Sa Phin.',
        '12:00 — Lunch in Dong Van old quarter.',
        '14:00 — Ride the breathtaking Ma Pi Leng pass high above the Nho Que river.',
        '15:30 — Optional boat on the Nho Que river.',
        '17:30 — Arrive Du Gia; homestay dinner.',
      ].join('\n'),
    },
    {
      dayNumber: 3,
      title: 'Du Gia → Ha Giang',
      description: [
        '08:00 — Breakfast and a morning swim at the Du Gia waterfall.',
        '09:30 — Ride back through villages and valleys.',
        '12:00 — Lunch en route.',
        '14:00 — Return to Ha Giang city.',
      ].join('\n'),
    },
  ],

  // ── Multi-day packages ───────────────────────────────────────────────────
  'north-vietnam-5d4n': [
    {
      dayNumber: 1,
      title: 'Hanoi arrival & Vespa tour',
      description: [
        'On arrival — airport pickup and hotel check-in.',
        '16:00 — A 4.5-hour Vespa tour of the Old Quarter, French Quarter and Long Bien Bridge.',
        '18:30 — Street-food and local-village stops along the way.',
        '20:00 — Finish with a traditional egg coffee; evening at leisure.',
      ].join('\n'),
    },
    {
      dayNumber: 2,
      title: 'Ha Long Bay cruise (day 1)',
      description: [
        '08:00 — Transfer from Hanoi to the wharf.',
        '12:00 — Board the cruise; lunch as you sail among the karsts.',
        '14:30 — Pearl farm, then kayaking and swimming at Titov Island.',
        '18:00 — Sunset party, cooking demonstration and squid fishing.',
        '19:30 — Dinner on board.',
      ].join('\n'),
    },
    {
      dayNumber: 3,
      title: 'Ha Long Bay cruise (day 2) → Hanoi',
      description: [
        '06:30 — Sunrise Tai Chi and breakfast.',
        '08:00 — Explore the Sung Sot cave.',
        '09:30 — Brunch while cruising back to the wharf.',
        '11:30 — Transfer to Hanoi; afternoon at leisure.',
      ].join('\n'),
    },
    {
      dayNumber: 4,
      title: 'Ninh Binh day tour',
      description: [
        '08:00 — Drive to Ninh Binh.',
        '10:00 — The Hoa Lu ancient capital.',
        '11:45 — Buffet lunch of local specialities.',
        '13:00 — A bamboo-boat ride through the Tam Coc caves.',
        '15:00 — Cycle through the villages and climb to the Mua Cave viewpoint.',
        '17:30 — Return to Hanoi.',
      ].join('\n'),
    },
    {
      dayNumber: 5,
      title: 'Departure',
      description: [
        'Morning — breakfast and free time.',
        'On schedule — airport transfer for your departure.',
      ].join('\n'),
    },
  ],
  'vietnam-romantic-10d': [
    {
      dayNumber: 1,
      title: 'Hanoi arrival & food tour',
      description: [
        'On arrival — airport pickup and hotel check-in.',
        '17:30 — An evening walking street-food tour of the Old Quarter.',
      ].join('\n'),
    },
    {
      dayNumber: 2,
      title: 'Ha Long Bay cruise (day 1)',
      description: [
        '08:00 — Transfer to the wharf and board your cruise.',
        '14:30 — Pearl farm, kayaking and a Titov Island swim.',
        '18:00 — Sunset party and squid fishing; dinner on board.',
      ].join('\n'),
    },
    {
      dayNumber: 3,
      title: 'Ha Long Bay cruise (day 2) → Hanoi',
      description: [
        '06:30 — Sunrise Tai Chi and breakfast.',
        '08:00 — The Sung Sot cave, then brunch as you cruise back.',
        '11:30 — Transfer back to Hanoi.',
      ].join('\n'),
    },
    {
      dayNumber: 4,
      title: 'Ninh Binh day tour',
      description: [
        '08:00 — Drive to Ninh Binh.',
        '10:00 — Hoa Lu ancient capital and the Trang An UNESCO landscape by boat.',
        '14:00 — Climb to the Mua Cave viewpoint.',
        '17:30 — Return to Hanoi.',
      ].join('\n'),
    },
    {
      dayNumber: 5,
      title: 'Hanoi → Da Nang',
      description: [
        'Morning — at leisure, then transfer to the airport.',
        'Afternoon — domestic flight to Da Nang and hotel check-in by the beach.',
      ].join('\n'),
    },
    {
      dayNumber: 6,
      title: 'Ba Na Hills & the Golden Bridge',
      description: [
        '08:00 — Drive to Ba Na Hills and ride the cable car.',
        '09:15 — The Golden Bridge and the French Village.',
        '12:00 — Lunch with mountain views.',
        '14:00 — Fantasy Park and the gardens; cable car down.',
        '16:30 — Return to Da Nang.',
      ].join('\n'),
    },
    {
      dayNumber: 7,
      title: 'Hue imperial city',
      description: [
        '08:00 — Scenic drive over the Hai Van pass to Hue.',
        '10:30 — The Imperial Citadel.',
        '13:00 — Royal tombs and a Perfume River boat to the Thien Mu Pagoda.',
        '16:30 — Check in to your Hue hotel.',
      ].join('\n'),
    },
    {
      dayNumber: 8,
      title: 'My Son & Hoi An',
      description: [
        '08:00 — Drive south to the My Son Cham temple ruins.',
        '11:30 — Continue to Hoi An and check in.',
        '17:30 — An evening stroll through the lantern-lit old town.',
      ].join('\n'),
    },
    {
      dayNumber: 9,
      title: 'Hoi An cooking & basket boats',
      description: [
        '08:30 — Market visit to shop for ingredients.',
        '09:30 — A hands-on Vietnamese cooking class, then lunch on your dishes.',
        '14:00 — A basket-boat ride through the coconut-palm water-coconut village.',
        '16:00 — Free afternoon for tailors, cafes or the beach.',
      ].join('\n'),
    },
    {
      dayNumber: 10,
      title: 'Departure',
      description: [
        'Morning — at leisure for last-minute shopping.',
        'On schedule — airport transfer for your departure.',
      ].join('\n'),
    },
  ],
};
