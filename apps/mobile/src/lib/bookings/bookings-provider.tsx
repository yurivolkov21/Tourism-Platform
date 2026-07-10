import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { loadTripBookings } from '../bookings/trip-bookings';
import type { TripBooking } from '../bookings/types';

type BookingsContextValue = {
  bookings: TripBooking[];
  upcomingCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const BookingsContext = createContext<BookingsContextValue | null>(null);

export function BookingsProvider({ children }: PropsWithChildren) {
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await loadTripBookings();
      setBookings(next);
    } catch (e) {
      setBookings([]);
      setError(e instanceof Error ? e.message : 'Could not load bookings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upcomingCount = useMemo(() => {
    return bookings.filter((b) => b.daysUntilDeparture != null && b.daysUntilDeparture >= 0).length;
  }, [bookings]);

  const value = useMemo(
    () => ({
      bookings,
      upcomingCount,
      isLoading,
      error,
      refresh,
    }),
    [bookings, upcomingCount, isLoading, error, refresh],
  );

  return (
    <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>
  );
}

export function useBookings(): BookingsContextValue {
  const ctx = useContext(BookingsContext);
  if (!ctx) {
    throw new Error('useBookings must be used within BookingsProvider');
  }
  return ctx;
}
