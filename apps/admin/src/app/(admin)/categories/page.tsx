import Link from 'next/link';
import { Plus, Search, Tags } from 'lucide-react';

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
import { DeleteCategory } from '../../../components/categories/delete-category';
import { listCategories, type CategoryList } from '../../../lib/categories/data';

interface CategoriesPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

/** Builds a `/categories` href that preserves the active search while changing the page. */
function pageHref(page: number, search: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (search) params.set('search', search);
  const qs = params.toString();
  return qs ? `/categories?${qs}` : '/categories';
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const { page: pageParam, search: searchParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const search = (searchParam ?? '').trim();

  let result: CategoryList | undefined;
  let error: string | null = null;
  try {
    result = await listCategories({ page, search: search || undefined });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Tour categories</h1>
          <p className="text-muted-foreground text-sm">
            Group your tours by theme. Inactive categories are shown here too; the display order is
            controlled by the “Order” field.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/categories/new" />}>
          <Plus data-icon="inline-start" />
          New category
        </Button>
      </div>

      <form action="/categories" method="get" className="flex max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by name…"
            className="pl-8"
            aria-label="Search categories"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load categories: {error}. Check that the API is running and your admin session
          is valid.
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tags />
            </EmptyMedia>
            <EmptyTitle>{search ? 'No categories match your search' : 'No categories yet'}</EmptyTitle>
            <EmptyDescription>
              {search
                ? 'Try a different name, or clear the search to see them all.'
                : 'Create your first category to start organizing tours.'}
            </EmptyDescription>
          </EmptyHeader>
          {!search ? (
            <Button nativeButton={false} render={<Link href="/categories/new" />}>
              <Plus data-icon="inline-start" />
              New category
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
                  <TableHead className="w-20 text-right">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {category.order}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? 'Active' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/categories/${category.slug}/edit`} />}
                        >
                          Edit
                        </Button>
                        <DeleteCategory slug={category.slug} name={category.name} />
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
