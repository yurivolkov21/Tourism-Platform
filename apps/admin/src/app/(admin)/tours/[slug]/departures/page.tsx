import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarRange, Plus } from 'lucide-react';

import {
  Badge,
  Button,
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

import { apiErrorMessage } from '../../../../../lib/api/error';
import { listDepartures, type Departure } from '../../../../../lib/departures/data';
import { getTour, type TourDetail } from '../../../../../lib/tours/data';

interface DeparturesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}

const FILTER_CLASS =
  'border-input bg-background h-9 rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

const STATUS_VARIANT: Record<Departure['status'], 'default' | 'secondary' | 'destructive'> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

function price(departure: Departure, currency: string): string {
  if (!departure.priceOverride) return 'Tour base';
  const n = Number(departure.priceOverride);
  const body = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : departure.priceOverride;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}

export default async function DeparturesPage({ params, searchParams }: DeparturesPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const status = sp.status === 'OPEN' || sp.status === 'CLOSED' || sp.status === 'CANCELLED' ? sp.status : undefined;

  let tour: TourDetail;
  try {
    tour = await getTour(slug);
  } catch {
    notFound();
  }

  let rows: Departure[] = [];
  let error: string | null = null;
  try {
    rows = await listDepartures(slug, { status });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tours" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to tours
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold">Departures</h1>
            <p className="text-muted-foreground text-sm">{tour.title}</p>
          </div>
          <Button nativeButton={false} render={<Link href={`/tours/${slug}/departures/new`} />}>
            <Plus data-icon="inline-start" />
            New departure
          </Button>
        </div>
      </div>

      <form action={`/tours/${slug}/departures`} method="get" className="flex items-center gap-2">
        <select name="status" defaultValue={status ?? ''} className={FILTER_CLASS} aria-label="Status">
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load departures: {error}.
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRange />
            </EmptyMedia>
            <EmptyTitle>{status ? 'No departures with this status' : 'No departures yet'}</EmptyTitle>
            <EmptyDescription>
              {status
                ? 'Try a different status, or clear the filter.'
                : 'Add a departure date so customers can book this tour.'}
            </EmptyDescription>
          </EmptyHeader>
          {!status ? (
            <Button nativeButton={false} render={<Link href={`/tours/${slug}/departures/new`} />}>
              <Plus data-icon="inline-start" />
              New departure
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium tabular-nums">{d.startDate}</TableCell>
                  <TableCell className="tabular-nums">{d.endDate}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.seatsBooked}/{d.seatsTotal}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={d.priceOverride ? 'font-medium' : 'text-muted-foreground'}>
                      {price(d, tour.currency)}
                    </span>
                    {d.compareAtPrice ? (
                      <span className="text-muted-foreground ml-1 text-xs line-through">
                        {price({ ...d, priceOverride: d.compareAtPrice }, tour.currency)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/tours/${slug}/departures/${d.id}/edit`} />}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
