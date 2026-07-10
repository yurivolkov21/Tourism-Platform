import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';

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
import { DestinationsTable } from '../../../components/destinations/destinations-table';
import {
  listDestinations,
  type DestinationList,
} from '../../../lib/destinations/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function DestinationsPage() {
  // Load the whole (small) catalog once; the table filters/searches client-side for instant UX.
  let result: DestinationList | undefined;
  let error: string | null = null;
  try {
    result = await listDestinations({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Destinations"
        description="Manage the places your tours run in. Drafts (inactive) are shown here too."
        action={
          <Button
            nativeButton={false}
            render={<Link href="/destinations/new" />}
          >
            <Plus data-icon="inline-start" />
            New destination
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load destinations: {error}. Check that the API is
          running and your admin session is valid.
        </ErrorAlert>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>No destinations yet</EmptyTitle>
            <EmptyDescription>
              Create your first destination to start building the catalog.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            nativeButton={false}
            render={<Link href="/destinations/new" />}
          >
            <Plus data-icon="inline-start" />
            New destination
          </Button>
        </Empty>
      ) : (
        <DestinationsTable rows={rows} />
      )}
    </div>
  );
}
