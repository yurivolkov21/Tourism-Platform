export type TripBookingStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export type TripBooking = {
  code: string;
  status: TripBookingStatus;
  tourSlug: string;
  tourTitle: string;
  destination: string;
  image: string;
  departureDate: string;
  bookedOn: string;
  numAdults: number;
  numChildren: number;
  totalAmount: number;
  currency: string;
  daysUntilDeparture: number | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialRequests?: string;
  paymentProvider: 'STRIPE' | 'PAYPAL';
};
