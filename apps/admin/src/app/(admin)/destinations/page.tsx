import Link from 'next/link';
import { MapPin, Plus } from 'lucide-react';

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

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { AdminListPagination } from '../../../components/crud/list-pagination';
import { AdminSearchField } from '../../../components/crud/search-field';
import { AdminStatusTabs } from '../../../components/crud/status-tabs';
import { RowActions } from '../../../components/crud/row-actions';
import { deleteDestination } from '../../../lib/destinations/actions';
import { listDestinations, type DestinationList } from '../../../lib/destinations/data';

interface DestinationsPageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

function buildHref(params: { page?: number; search?: string; status?: string }): string {
  const sp = new URLSearchParams();
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  const qs = sp.toString();
  return qs ? `/destinations?${qs}` : '/destinations';
}

export default async function DestinationsPage({ searchParams }: DestinationsPageProps) {
  const { page: pageParam, search: searchParam, status: statusParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const search = (searchParam ?? '').trim();
  const status = statusParam === 'active' || statusParam === 'draft' ? statusParam : undefined;
  const isActive = status === 'active' ? true : status === 'draft' ? false : undefined;

  let result: DestinationList | undefined;
  let error: string | null = null;
  try {
    result = await listDestinations({ page, search: search || undefined, isActive });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  const tabs = [
    { value: 'all', label: 'All', href: buildHref({ search }) },
    { value: 'active', label: 'Active', href: buildHref({ search, status: 'active' }) },
    { value: 'draft', label: 'Draft', href: buildHref({ search, status: 'draft' }) },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Destinations"
        description="Manage the places your tours run in. Drafts (inactive) are shown here too."
        action={
          <Button nativeButton={false} render={<Link href="/destinations/new" />}>
            <Plus data-icon="inline-start" />
            New destination
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminStatusTabs tabs={tabs} active={status ?? 'all'} />
        <AdminSearchField
          action="/destinations"
          defaultValue={search}
          placeholder="Search by name…"
          hidden={status ? { status } : undefined}
        />
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load destinations: {error}. Check that the API is running and your admin
          session is valid.
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>
              {search || status ? 'No destinations match your filters' : 'No destinations yet'}
            </EmptyTitle>
            <EmptyDescription>
              {search || status
                ? 'Try a different name or clear the filters to see them all.'
                : 'Create your first destination to start building the catalog.'}
            </EmptyDescription>
          </EmptyHeader>
          {!search && !status ? (
            <Button nativeButton={false} render={<Link href="/destinations/new" />}>
              <Plus data-icon="inline-start" />
              New destination
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((destination) => (
                  <TableRow key={destination.id}>
                    <TableCell className="font-medium">{destination.name}</TableCell>
                    <TableCell className="text-muted-foreground">{destination.region ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{destination.country}</TableCell>
                    <TableCell>
                      <Badge variant={destination.isActive ? 'default' : 'secondary'} className="gap-1.5">
                        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                        {destination.isActive ? 'Active' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        editHref={`/destinations/${destination.slug}/edit`}
                        deleteAction={deleteDestination}
                        deleteId={destination.slug}
                        deleteTitle={`Delete “${destination.name}”?`}
                        deleteDescription="This permanently removes the destination. It must be inactive and have no tours attached before it can be deleted."
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {meta ? (
            <AdminListPagination meta={meta} hrefFor={(p) => buildHref({ page: p, search, status })} />
          ) : null}
        </>
      )}
    </div>
  );
}
