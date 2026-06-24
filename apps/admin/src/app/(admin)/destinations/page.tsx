import Link from 'next/link';
import { MapPin, Plus, Search } from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { listDestinations, type DestinationList } from '../../../lib/destinations/data';

interface DestinationsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

/** Builds a `/destinations` href that preserves the active search while changing the page. */
function pageHref(page: number, search: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (search) params.set('search', search);
  const qs = params.toString();
  return qs ? `/destinations?${qs}` : '/destinations';
}

export default async function DestinationsPage({ searchParams }: DestinationsPageProps) {
  const { page: pageParam, search: searchParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const search = (searchParam ?? '').trim();

  let result: DestinationList | undefined;
  let error: string | null = null;
  try {
    result = await listDestinations({ page, search: search || undefined });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Destinations</h1>
          <p className="text-muted-foreground text-sm">
            Manage the places your tours run in. Drafts (inactive) are shown here too.
          </p>
        </div>
        <Button render={<Link href="/destinations/new" />}>
          <Plus data-icon="inline-start" />
          New destination
        </Button>
      </div>

      <form action="/destinations" method="get" className="flex max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by name…"
            className="pl-8"
            aria-label="Search destinations"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

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
              {search ? 'No destinations match your search' : 'No destinations yet'}
            </EmptyTitle>
            <EmptyDescription>
              {search
                ? 'Try a different name, or clear the search to see them all.'
                : 'Create your first destination to start building the catalog.'}
            </EmptyDescription>
          </EmptyHeader>
          {!search ? (
            <Button render={<Link href="/destinations/new" />}>
              <Plus data-icon="inline-start" />
              New destination
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((destination) => (
                  <TableRow key={destination.id}>
                    <TableCell className="font-medium">{destination.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {destination.region ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{destination.country}</TableCell>
                    <TableCell>
                      <Badge variant={destination.isActive ? 'default' : 'secondary'}>
                        {destination.isActive ? 'Active' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/destinations/${destination.slug}/edit`} />}
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

          {meta && meta.totalPages > 1 ? (
            <Pagination className="justify-between">
              <p className="text-muted-foreground self-center text-sm">
                Page {meta.page} of {meta.totalPages} · {meta.total} total
              </p>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={pageHref(meta.page - 1, search)}
                    aria-disabled={meta.page <= 1}
                    className={meta.page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href={pageHref(meta.page, search)} isActive>
                    {meta.page}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={pageHref(meta.page + 1, search)}
                    aria-disabled={meta.page >= meta.totalPages}
                    className={
                      meta.page >= meta.totalPages ? 'pointer-events-none opacity-50' : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      )}
    </div>
  );
}
