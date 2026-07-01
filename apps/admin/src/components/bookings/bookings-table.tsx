import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import { formatMoney } from '../../lib/bookings/format';
import type { Booking } from '../../lib/bookings/data';
import { BookingStatusBadge } from './booking-status-badge';

/** Short date like "15 Aug 2026" from an ISO/`YYYY-MM-DD` string; em dash when unparseable. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Read-only bookings table. Rows link to the detail page by code; filtering/paging are URL-driven. */
export function BookingsTable({ rows }: { rows: Booking[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Tour</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Travel date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">
                <Link href={`/bookings/${b.code}`} className="hover:text-primary hover:underline">
                  {b.code}
                </Link>
              </TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground">{b.tour.title}</TableCell>
              <TableCell>
                <span className="block font-medium">{b.contactName}</span>
                <span className="text-muted-foreground text-xs">{b.contactEmail}</span>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {shortDate(b.departure.startDate)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(b.totalAmount, b.currency)}
              </TableCell>
              <TableCell>
                <BookingStatusBadge status={b.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default BookingsTable;
