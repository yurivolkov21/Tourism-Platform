import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarRange, Plus } from 'lucide-react';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../../../lib/api/error';
import { AdminListHeader } from '../../../../../components/crud/list-header';
import { DeparturesTable } from '../../../../../components/departures/departures-table';
import {
  listDepartures,
  type Departure,
} from '../../../../../lib/departures/data';
import { getTour, type TourDetail } from '../../../../../lib/tours/data';
import { ErrorAlert } from '../../../../../components/crud/error-alert';

interface DeparturesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DeparturesPage({ params }: DeparturesPageProps) {
  const { slug } = await params;

  let tour: TourDetail;
  try {
    tour = await getTour(slug);
  } catch {
    notFound();
  }

  // Load the full (small) schedule once; the table filters by status client-side for instant UX.
  let rows: Departure[] = [];
  let error: string | null = null;
  try {
    rows = await listDepartures(slug);
  } catch (e) {
    error = apiErrorMessage(e);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/tours" />}
        className="w-fit"
      >
        <ArrowLeft data-icon="inline-start" />
        Back to tours
      </Button>

      <AdminListHeader
        title="Departures"
        description={`Scheduled dates for ${tour.title}. Past dates are marked “Departed” and can’t be booked.`}
        action={
          <Button
            nativeButton={false}
            render={<Link href={`/tours/${slug}/departures/new`} />}
          >
            <Plus data-icon="inline-start" />
            New departure
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>Couldn&apos;t load departures: {error}.</ErrorAlert>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRange />
            </EmptyMedia>
            <EmptyTitle>No departures yet</EmptyTitle>
            <EmptyDescription>
              Add a departure date so customers can book this tour.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            nativeButton={false}
            render={<Link href={`/tours/${slug}/departures/new`} />}
          >
            <Plus data-icon="inline-start" />
            New departure
          </Button>
        </Empty>
      ) : (
        <DeparturesTable rows={rows} slug={slug} currency={tour.currency} />
      )}
    </div>
  );
}
