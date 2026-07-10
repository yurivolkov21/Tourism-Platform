import type { TripBooking } from '../bookings/types';

/** Static sample bookings for Trips tab UI preview only — not API data. */
export const MOCK_TRIP_BOOKINGS: TripBooking[] = [
  {
    code: 'NXR-8F2K9M',
    status: 'PAID',
    tourSlug: 'ha-long-bay-heritage-cruise',
    tourTitle: 'Ha Long Bay Heritage Cruise',
    destination: 'Quảng Ninh',
    image:
      'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=70&auto=format&fit=crop',
    departureDate: '2026-08-14',
    bookedOn: '2026-06-02',
    numAdults: 2,
    numChildren: 0,
    totalAmount: 1240,
    currency: 'USD',
    daysUntilDeparture: 44,
    contactName: 'Alex Nguyen',
    contactEmail: 'alex.nguyen@example.com',
    contactPhone: '+84 90 123 4567',
    paymentProvider: 'STRIPE',
  },
  {
    code: 'NXR-3PL7QW',
    status: 'PENDING',
    tourSlug: 'sapa-rice-terrace-trek',
    tourTitle: 'Sapa Rice Terrace Trek',
    destination: 'Lào Cai',
    image:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=70&auto=format&fit=crop',
    departureDate: '2026-09-05',
    bookedOn: '2026-06-28',
    numAdults: 2,
    numChildren: 1,
    totalAmount: 890,
    currency: 'USD',
    daysUntilDeparture: 66,
    contactName: 'Alex Nguyen',
    contactEmail: 'alex.nguyen@example.com',
    paymentProvider: 'PAYPAL',
    specialRequests: 'Vegetarian meals for 1 adult.',
  },
  {
    code: 'NXR-1HT4RN',
    status: 'PAID',
    tourSlug: 'hoi-an-lantern-coast',
    tourTitle: 'Hội An Lantern & Coast',
    destination: 'Quảng Nam',
    image:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=70&auto=format&fit=crop',
    departureDate: '2025-11-20',
    bookedOn: '2025-09-10',
    numAdults: 2,
    numChildren: 0,
    totalAmount: 720,
    currency: 'USD',
    daysUntilDeparture: null,
    contactName: 'Alex Nguyen',
    contactEmail: 'alex.nguyen@example.com',
    paymentProvider: 'STRIPE',
  },
  {
    code: 'NXR-5MK2DL',
    status: 'PAID',
    tourSlug: 'mekong-delta-discovery',
    tourTitle: 'Mekong Delta Discovery',
    destination: 'Cần Thơ',
    image:
      'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=70&auto=format&fit=crop',
    departureDate: '2026-03-15',
    bookedOn: '2026-02-01',
    numAdults: 2,
    numChildren: 1,
    totalAmount: 760,
    currency: 'USD',
    daysUntilDeparture: null,
    contactName: 'Alex Nguyen',
    contactEmail: 'alex.nguyen@example.com',
    paymentProvider: 'STRIPE',
  },
];

export function getNextTrip(bookings: TripBooking[]): TripBooking | null {
  const upcoming = bookings
    .filter((b) => b.daysUntilDeparture != null && b.daysUntilDeparture >= 0)
    .filter((b) => b.status === 'PAID' || b.status === 'PENDING')
    .sort((a, b) => (a.daysUntilDeparture ?? 0) - (b.daysUntilDeparture ?? 0));
  return upcoming[0] ?? null;
}

export function splitMockBookings(bookings: TripBooking[]): {
  upcoming: TripBooking[];
  past: TripBooking[];
} {
  const upcoming = bookings.filter(
    (b) =>
      b.daysUntilDeparture != null &&
      b.daysUntilDeparture >= 0 &&
      (b.status === 'PAID' || b.status === 'PENDING'),
  );
  const past = bookings.filter((b) => !upcoming.includes(b));
  return { upcoming, past };
}

export function getMockTripByCode(code: string): TripBooking | undefined {
  return MOCK_TRIP_BOOKINGS.find((b) => b.code === code);
}
