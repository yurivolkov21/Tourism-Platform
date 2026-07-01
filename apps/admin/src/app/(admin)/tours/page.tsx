import Link from 'next/link';
import { Compass, Plus } from 'lucide-react';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { ToursTable } from '../../../components/tours/tours-table';
import { listTours, type TourList } from '../../../lib/tours/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function ToursPage() {
  // Load the whole (small) catalog once; the table filters/searches client-side for instant UX.
  let result: TourList | undefined;
  let error: string | null = null;
  try {
    result = await listTours({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Tours"
        description="Manage your tour catalog. Drafts (unpublished) are shown here too; open a tour to view details, edit it, or manage its departures."
        action={
          <Button nativeButton={false} render={<Link href="/tours/new" />}>
            <Plus data-icon="inline-start" />
            New tour
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load tours: {error}. Check that the API is running and your admin session is
          valid.
        </ErrorAlert>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Compass />
            </EmptyMedia>
            <EmptyTitle>No tours yet</EmptyTitle>
            <EmptyDescription>Create your first tour to start building the catalog.</EmptyDescription>
          </EmptyHeader>
          <Button nativeButton={false} render={<Link href="/tours/new" />}>
            <Plus data-icon="inline-start" />
            New tour
          </Button>
        </Empty>
      ) : (
        <ToursTable rows={rows} />
      )}
    </div>
  );
}
