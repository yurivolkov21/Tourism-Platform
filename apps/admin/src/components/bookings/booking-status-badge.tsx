import { Badge } from '@tourism/ui';

import {
  bookingStatusMeta,
  type BookingStatus,
} from '../../lib/bookings/format';

/** Coloured status pill for a booking — shared by the list table and the detail header. */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, variant } = bookingStatusMeta(status);
  return (
    <Badge variant={variant} className="gap-1.5">
      <span
        className="size-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {label}
    </Badge>
  );
}

export default BookingStatusBadge;
