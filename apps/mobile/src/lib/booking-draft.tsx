import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';

/**
 * In-memory state for the stepped booking flow (departure sheet → contact →
 * payment). Deliberately NOT persisted: abandoning the flow discards it, and
 * `setTrip` always starts fresh so contact details never leak across trips.
 * The API payload is still built exclusively by `buildCreateBookingPayload`
 * at the payment step — this context only carries the inputs there.
 */
export interface BookingDraft {
  tourSlug: string;
  departureId: string;
  /** Pre-formatted ("Sat, 15 Aug 2026") so later steps don't refetch departures. */
  departureLabel: string;
  /** Effective per-person price of the chosen departure. */
  unitPrice: number;
  currency: string;
  adults: number;
  children: number;
  name?: string;
  email?: string;
  phone?: string;
  requests?: string;
}

export type BookingTrip = Pick<
  BookingDraft,
  | 'tourSlug'
  | 'departureId'
  | 'departureLabel'
  | 'unitPrice'
  | 'currency'
  | 'adults'
  | 'children'
>;

export interface BookingContact {
  name: string;
  email: string;
  phone: string;
  requests: string;
}

interface BookingDraftValue {
  draft: BookingDraft | null;
  setTrip(trip: BookingTrip): void;
  setContact(contact: BookingContact): void;
  reset(): void;
}

const BookingDraftContext = createContext<BookingDraftValue | null>(null);

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  // The draft carries contact PII — never let it survive an account switch.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setDraft(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setTrip = useCallback((trip: BookingTrip) => {
    setDraft({ ...trip }); // fresh draft — never carry contact across trips
  }, []);

  const setContact = useCallback((contact: BookingContact) => {
    setDraft((current) => (current ? { ...current, ...contact } : current));
  }, []);

  const reset = useCallback(() => setDraft(null), []);

  const value = useMemo(
    () => ({ draft, setTrip, setContact, reset }),
    [draft, setTrip, setContact, reset],
  );
  return (
    <BookingDraftContext.Provider value={value}>
      {children}
    </BookingDraftContext.Provider>
  );
}

export function useBookingDraft(): BookingDraftValue {
  const value = useContext(BookingDraftContext);
  if (!value)
    throw new Error(
      'useBookingDraft must be used inside <BookingDraftProvider>',
    );
  return value;
}
