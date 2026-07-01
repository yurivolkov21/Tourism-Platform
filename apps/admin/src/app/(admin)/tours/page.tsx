import Link from 'next/link';
import { Compass, Plus, Search } from 'lucide-react';

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
import { DeleteTour } from '../../../components/tours/delete-tour';
import { listCategories, type Category } from '../../../lib/categories/data';
import { listTours, type TourList, type TourSummary } from '../../../lib/tours/data';

interface ToursPageProps {
  searchParams: Promise<{ page?: string; search?: string; category?: string; status?: string }>;
}

const FILTER_CLASS =
  'border-input bg-background h-9 rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function money(value: string, currency: string): string {
  const n = Number(value);
  const body = Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : value;
  return currency === 'USD' ? `$${body}` : `${currency} ${body}`;
}

function primaryDestination(tour: TourSummary): string {
  const primary = tour.destinations.find((d) => d.isPrimary) ?? tour.destinations[0];
  return primary?.destination.name ?? '—';
}

/** Builds a `/tours` href preserving the active filters while changing the page. */
function pageHref(page: number, params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  if (page > 1) sp.set('page', String(page));
  else sp.delete('page');
  const qs = sp.toString();
  return qs ? `/tours?${qs}` : '/tours';
}

export default async function ToursPage({ searchParams }: ToursPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const search = (sp.search ?? '').trim();
  const category = (sp.category ?? '').trim();
  const status = sp.status === 'published' || sp.status === 'draft' ? sp.status : '';
  const isPublished = status === 'published' ? true : status === 'draft' ? false : undefined;

  let result: TourList | undefined;
  let error: string | null = null;
  try {
    result = await listTours({
      page,
      search: search || undefined,
      category: category || undefined,
      isPublished,
    });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  // Best-effort: the category filter dropdown shouldn't break the page if it can't load.
  let categories: Category[] = [];
  try {
    categories = (await listCategories({ pageSize: 100 })).data;
  } catch {
    categories = [];
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;
  const activeParams = { search, category, status };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Tours</h1>
          <p className="text-muted-foreground text-sm">
            Manage your tour catalog. Drafts (unpublished) are shown here too.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/tours/new" />}>
          <Plus data-icon="inline-start" />
          New tour
        </Button>
      </div>

      <form action="/tours" method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by title…"
            className="pl-8"
            aria-label="Search tours"
          />
        </div>
        <select name="category" defaultValue={category} className={FILTER_CLASS} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className={FILTER_CLASS} aria-label="Status">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load tours: {error}. Check that the API is running and your admin session is
          valid.
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Compass />
            </EmptyMedia>
            <EmptyTitle>
              {search || category || status ? 'No tours match your filters' : 'No tours yet'}
            </EmptyTitle>
            <EmptyDescription>
              {search || category || status
                ? 'Try different filters, or clear them to see them all.'
                : 'Create your first tour to start building the catalog.'}
            </EmptyDescription>
          </EmptyHeader>
          {!search && !category && !status ? (
            <Button nativeButton={false} render={<Link href="/tours/new" />}>
              <Plus data-icon="inline-start" />
              New tour
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Primary destination</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tour) => (
                  <TableRow key={tour.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/tours/${tour.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {tour.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tour.category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{primaryDestination(tour)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium">{money(tour.basePrice, tour.currency)}</span>
                      {tour.compareAtPrice ? (
                        <span className="text-muted-foreground ml-1 text-xs line-through">
                          {money(tour.compareAtPrice, tour.currency)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{tour.durationDays}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={tour.isPublished ? 'default' : 'secondary'}>
                          {tour.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        {tour.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/tours/${tour.slug}/departures`} />}
                        >
                          Departures
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/tours/${tour.slug}/edit`} />}
                        >
                          Edit
                        </Button>
                        <DeleteTour slug={tour.slug} title={tour.title} />
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
                    href={pageHref(meta.page - 1, activeParams)}
                    aria-disabled={meta.page <= 1}
                    className={meta.page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href={pageHref(meta.page, activeParams)} isActive>
                    {meta.page}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={pageHref(meta.page + 1, activeParams)}
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
