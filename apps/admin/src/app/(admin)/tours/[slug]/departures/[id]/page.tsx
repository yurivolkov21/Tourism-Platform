import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import { RowActions } from '../../../../../../components/crud/row-actions';
import { deleteDeparture } from '../../../../../../lib/departures/actions';
import { findDeparture } from '../../../../../../lib/departures/data';
import { isDeparturePast } from '../../../../../../lib/departures/format';
import { listBookings } from '../../../../../../lib/bookings/data';
import { bookingStatusMeta, formatGuests, formatMoney } from '../../../../../../lib/bookings/format';
import { formatRelativeTime } from '../../../../../../lib/relative-time';

interface DepartureDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Label/value row for the details rail. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

export default async function DepartureDetailPage({ params }: DepartureDetailPageProps) {
  const { slug, id } = await params;

  const departure = await findDeparture(slug, id).catch(() => undefined);
  if (!departure) notFound();

  // Bookings on this departure (server-side filter; the set is small — one departure's seats).
  const bookings = await listBookings({ departureId: id, pageSize: 100 }).catch(() => null);
  const rows = bookings?.data ?? [];

  const past = isDeparturePast(departure.startDate);
  const pct =
    departure.seatsTotal > 0 ? Math.round((departure.seatsBooked / departure.seatsTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href={`/tours/${slug}/departures`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to departures
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Departure — {formatDate(departure.startDate)}
            </h1>
            <Badge variant={STATUS_VARIANT[departure.status] ?? 'secondary'} className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
              {departure.status}
            </Badge>
            {past ? <Badge variant="outline">Departed</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {formatDate(departure.startDate)} → {formatDate(departure.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/tours/${slug}/departures/${departure.id}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/tours/${slug}/departures/${departure.id}/edit`}
            deleteAction={(depId) => deleteDeparture(slug, depId)}
            deleteId={departure.id}
            deleteTitle="Delete this departure?"
            deleteDescription="This permanently deletes the departure and can’t be undone. You can only delete one with no bookings."
            redirectTo={`/tours/${slug}/departures`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main — bookings on this departure */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                  No bookings on this departure yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((b) => {
                        const meta = bookingStatusMeta(b.status);
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              <Link
                                href={`/bookings/${b.code}`}
                                className="hover:text-primary font-medium hover:underline"
                              >
                                {b.code}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <span className="block">{b.contactName}</span>
                              <span className="text-muted-foreground text-xs">{b.contactEmail}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatGuests(b.numAdults, b.numChildren)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(b.totalAmount, b.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={meta.variant} className="gap-1.5">
                                <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                                {meta.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold tabular-nums">
                {departure.seatsBooked}
                <span className="text-muted-foreground text-base font-normal">
                  {' '}
                  / {departure.seatsTotal} seats
                </span>
              </p>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-muted-foreground text-xs">{pct}% booked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row label="Start" value={formatDate(departure.startDate)} />
                <Row label="End" value={formatDate(departure.endDate)} />
                <Row label="Status" value={departure.status} />
                <Row
                  label="Price"
                  value={
                    departure.priceOverride
                      ? formatMoney(departure.priceOverride, 'USD')
                      : 'Tour base price'
                  }
                />
                <Row
                  label="Compare-at"
                  value={
                    departure.compareAtPrice ? formatMoney(departure.compareAtPrice, 'USD') : '—'
                  }
                />
                <Row
                  label="Created"
                  value={
                    <span className="font-normal">
                      {formatDate(departure.createdAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(departure.createdAt)}
                      </span>
                    </span>
                  }
                />
                <Row
                  label="Updated"
                  value={
                    <span className="font-normal">
                      {formatDate(departure.updatedAt)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {formatRelativeTime(departure.updatedAt)}
                      </span>
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
