'use client';

import Link from 'next/link';
import { TicketX } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { formatShortDate } from '../../lib/format-date';
import { formatRelativeTime } from '../../lib/relative-time';
import type { CancellationRequest, PageMeta } from '../../lib/cancellation-requests/data';

/** Truncated one-line reason for the queue table — the full text is on the booking detail page. */
function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Cancellation-request queue — read-only, oldest-first list of customer-initiated cancellations
 * awaiting a decision. No mutation actions here: refund/deny happen on the linked booking's detail
 * page, where the refund amount and payment provider context are visible.
 */
export function CancellationRequestsView({
  rows,
  meta,
}: {
  rows: CancellationRequest[];
  meta?: PageMeta;
}) {
  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TicketX />
            </EmptyMedia>
            <EmptyTitle>No cancellation requests</EmptyTitle>
            <EmptyDescription>
              Customer-initiated cancellations awaiting a decision will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/bookings/${r.booking.code}`} className="hover:underline">
                        {r.booking.code}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-52 truncate">{r.booking.tourTitle}</TableCell>
                    <TableCell>
                      <span className="block">{r.booking.customerName}</span>
                      <span className="text-muted-foreground text-xs">
                        {r.booking.customerEmail}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatShortDate(r.booking.departureStartDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-64">
                      {truncate(r.reason)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRelativeTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/bookings/${r.booking.code}`}
                        className="text-primary hover:underline"
                      >
                        Review →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {meta ? (
            <ServerTablePagination
              page={meta.page}
              pageCount={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export default CancellationRequestsView;
