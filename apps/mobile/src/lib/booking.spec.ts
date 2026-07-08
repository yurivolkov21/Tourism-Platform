import { ApiRequestError, type components } from '@tourism/core';
import {
  bookingErrorMessage,
  bookingStatusMeta,
  createBooking,
  toBookingVm,
  toDepartureOptions,
} from './booking';
import { getApiClient } from './api';

jest.mock('./api', () => ({ getApiClient: jest.fn() }));
jest.mock('./supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));

type BookingDto = components['schemas']['BookingDto'];
type DepartureDto = components['schemas']['DepartureDto'];

function apiError(status: number, code: string): ApiRequestError {
  return new ApiRequestError(status, { code, message: code } as never);
}

const departure = {
  id: 'dep-1',
  startDate: '2026-08-15',
  seatsTotal: 10,
  seatsBooked: 4,
  priceOverride: null,
} as unknown as DepartureDto;

describe('toDepartureOptions', () => {
  test('uses the base price when no override, UTC weekday label, seats left', () => {
    expect(toDepartureOptions([departure], 120)).toEqual([
      { id: 'dep-1', label: 'Sat, 15 Aug 2026', price: 120, seatsLeft: 6 },
    ]);
  });

  test('price override wins and seats clamp at 0', () => {
    const overbooked = { ...departure, priceOverride: '99.00', seatsBooked: 12 } as DepartureDto;
    expect(toDepartureOptions([overbooked], 120)[0]).toMatchObject({ price: 99, seatsLeft: 0 });
  });
});

describe('bookingStatusMeta', () => {
  test.each([
    ['PAID', 'Paid', 'success'],
    ['PENDING', 'Awaiting payment', 'warning'],
    ['CANCELLED', 'Cancelled', 'muted'],
    ['REFUNDED', 'Refunded', 'destructive'],
    ['PARTIALLY_REFUNDED', 'Partially refunded', 'destructive'],
  ])('%s → %s / %s', (status, label, tone) => {
    expect(bookingStatusMeta(status)).toEqual({ label, tone });
  });

  test('unknown status falls back to muted with the raw status as label', () => {
    expect(bookingStatusMeta('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tone: 'muted' });
  });
});

const bookingDto = {
  id: 'b-1',
  code: 'BK-7Q2KX9AB',
  status: 'PAID',
  numAdults: 2,
  numChildren: 1,
  totalAmount: '300.00',
  currency: 'USD',
  paymentProvider: 'STRIPE',
  contactName: 'Nguyen Van A',
  contactEmail: 'a@example.com',
  contactPhone: null,
  specialRequests: null,
  tour: { slug: 'hoi-an-walking-tour', title: 'Hoi An Walking Tour' },
  departure: { startDate: '2026-08-15', endDate: '2026-08-18' },
  createdAt: '2026-07-07T10:00:00.000Z',
  updatedAt: '2026-07-07T10:00:00.000Z',
  refundedAmount: null,
  cancellationRequest: null,
} as unknown as BookingDto;

describe('toBookingVm', () => {
  test('maps the full DTO', () => {
    const vm = toBookingVm(bookingDto);
    expect(vm).toMatchObject({
      code: 'BK-7Q2KX9AB',
      status: 'PAID',
      statusMeta: { label: 'Paid', tone: 'success' },
      tourTitle: 'Hoi An Walking Tour',
      tourSlug: 'hoi-an-walking-tour',
      departureLabel: 'Sat, 15 Aug 2026',
      bookedOn: '07 Jul 2026',
      party: '2 adults · 1 child',
      totalAmount: 300,
      currency: 'USD',
      paymentProvider: 'STRIPE',
    });
    expect(vm.contactPhone).toBeUndefined();
    expect(vm.refundedAmount).toBeUndefined();
    expect(vm.cancellationStatus).toBeUndefined();
  });

  test('singular party line and refund fields', () => {
    const vm = toBookingVm({
      ...bookingDto,
      numAdults: 1,
      numChildren: 0,
      status: 'PARTIALLY_REFUNDED',
      refundedAmount: '30.00',
      cancellationRequest: { status: 'REFUNDED', reason: '', createdAt: '', decisionNote: null },
    } as unknown as BookingDto);
    expect(vm.party).toBe('1 adult');
    expect(vm.refundedAmount).toBe(30);
    expect(vm.cancellationStatus).toBe('REFUNDED');
  });
});

describe('bookingErrorMessage', () => {
  test('maps a known API code', () => {
    expect(bookingErrorMessage(apiError(409, 'SEATS_NOT_AVAILABLE'))).toMatch(/sold out/i);
  });
  test('unknown errors fall back to generic copy', () => {
    expect(bookingErrorMessage(new Error('boom'))).toMatch(/something went wrong/i);
  });
});

describe('createBooking USER_NOT_SYNCED retry', () => {
  const payload = {
    tourSlug: 'hoi-an-walking-tour',
    departureId: 'dep-1',
    numAdults: 2,
    paymentProvider: 'STRIPE' as const,
    contactName: 'Nguyen Van A',
    contactEmail: 'a@example.com',
  };

  test('re-syncs once then retries', async () => {
    const POST = jest
      .fn()
      .mockRejectedValueOnce(apiError(401, 'USER_NOT_SYNCED')) // create #1
      .mockResolvedValueOnce({ data: {} }) // auth/sync
      .mockResolvedValueOnce({ data: { data: bookingDto } }); // create #2
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    const result = await createBooking(payload);
    expect(result.code).toBe('BK-7Q2KX9AB');
    expect(POST).toHaveBeenCalledTimes(3);
    expect(POST.mock.calls[1][0]).toBe('/api/v1/auth/sync');
  });

  test('a plain 401 (unmirrored user without the code) also re-syncs, like web', async () => {
    const POST = jest
      .fn()
      .mockRejectedValueOnce(apiError(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce({ data: {} }) // auth/sync
      .mockResolvedValueOnce({ data: { data: bookingDto } });
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    const result = await createBooking(payload);
    expect(result.code).toBe('BK-7Q2KX9AB');
    expect(POST).toHaveBeenCalledTimes(3);
  });

  test('other errors are not retried', async () => {
    const POST = jest.fn().mockRejectedValue(apiError(409, 'SEATS_NOT_AVAILABLE'));
    (getApiClient as jest.Mock).mockReturnValue({ POST });

    await expect(createBooking(payload)).rejects.toMatchObject({ code: 'SEATS_NOT_AVAILABLE' });
    expect(POST).toHaveBeenCalledTimes(1);
  });
});
