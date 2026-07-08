import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { BookingDraftProvider, useBookingDraft } from '../lib/booking-draft';

let mockAuthCallback: ((event: string, session: unknown) => void) | undefined;
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mockAuthCallback = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
    },
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <BookingDraftProvider>{children}</BookingDraftProvider>
);

const trip = {
  tourSlug: 'hoi-an-walking-tour',
  departureId: 'dep-1',
  departureLabel: 'Sat, 15 Aug 2026',
  unitPrice: 100,
  currency: 'USD',
  adults: 2,
  children: 1,
};

test('setTrip seeds the draft, setContact enriches it, reset clears', () => {
  const { result } = renderHook(() => useBookingDraft(), { wrapper });
  expect(result.current.draft).toBeNull();

  act(() => result.current.setTrip(trip));
  expect(result.current.draft).toMatchObject({ tourSlug: 'hoi-an-walking-tour', adults: 2 });

  act(() =>
    result.current.setContact({ name: 'Nguyen Van A', email: 'a@x.com', phone: '', requests: '' }),
  );
  expect(result.current.draft).toMatchObject({ name: 'Nguyen Van A', email: 'a@x.com' });

  act(() => result.current.reset());
  expect(result.current.draft).toBeNull();
});

test('setTrip starts a FRESH draft (no contact leakage across trips)', () => {
  const { result } = renderHook(() => useBookingDraft(), { wrapper });
  act(() => result.current.setTrip(trip));
  act(() =>
    result.current.setContact({ name: 'Nguyen Van A', email: 'a@x.com', phone: '', requests: '' }),
  );
  act(() => result.current.setTrip({ ...trip, tourSlug: 'sapa-trek', departureId: 'dep-9' }));
  expect(result.current.draft?.tourSlug).toBe('sapa-trek');
  expect(result.current.draft?.name).toBeUndefined();
});

test('setContact without a trip is a no-op', () => {
  const { result } = renderHook(() => useBookingDraft(), { wrapper });
  act(() =>
    result.current.setContact({ name: 'A', email: 'a@x.com', phone: '', requests: '' }),
  );
  expect(result.current.draft).toBeNull();
});

test('signing out clears the draft (contact PII must not survive an account switch)', () => {
  const { result } = renderHook(() => useBookingDraft(), { wrapper });
  act(() => result.current.setTrip(trip));
  act(() =>
    result.current.setContact({ name: 'Nguyen Van A', email: 'a@x.com', phone: '', requests: '' }),
  );
  expect(result.current.draft).not.toBeNull();
  act(() => mockAuthCallback?.('SIGNED_OUT', null));
  expect(result.current.draft).toBeNull();
});
