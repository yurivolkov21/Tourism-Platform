'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Tags } from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deleteCategory } from '../../lib/categories/actions';
import type { Category } from '../../lib/categories/data';

type Tab = 'all' | 'active' | 'draft';
const PAGE_SIZE = 25;

const DELETE_DESCRIPTION =
  'This permanently deletes the category and can’t be undone. You can only delete one that’s turned off (Draft) and has no tours attached.';

/**
 * Client-side Categories table: tab + search filtering happens in memory (instant, no server
 * round-trip — the catalog is small and loaded once). Tabs show live counts; pagination kicks in
 * only past {@link PAGE_SIZE} rows. Mirrors the Destinations table (no images for categories).
 */
export function CategoriesTable({ rows }: { rows: Category[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.isActive).length,
      draft: rows.filter((r) => !r.isActive).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'active' && !r.isActive) return false;
      if (tab === 'draft' && r.isActive) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const paged = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'draft', label: 'Draft', count: counts.draft },
  ];
  const selectTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1"
        >
          {tabs.map((t) => {
            const isActive = t.value === tab;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTab(t.value)}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
                )}
              >
                {t.label}
                <Badge variant="secondary" className="px-1.5 tabular-nums">
                  {t.count}
                </Badge>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name…"
            aria-label="Search by name"
            className="bg-background pl-8"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tags />
            </EmptyMedia>
            <EmptyTitle>No categories match your filters</EmptyTitle>
            <EmptyDescription>Try a different name or clear the filters to see them all.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20 text-right">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {category.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {category.order}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'default' : 'secondary'} className="gap-1.5">
                        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                        {category.isActive ? 'Active' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        editHref={`/categories/${category.slug}/edit`}
                        deleteAction={deleteCategory}
                        deleteId={category.slug}
                        deleteTitle={`Delete “${category.name}”?`}
                        deleteDescription={DELETE_DESCRIPTION}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between px-1">
              <p className="text-muted-foreground text-sm">
                Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="cursor-pointer"
                  disabled={current <= 1}
                  onClick={() => setPage(current - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {current} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="cursor-pointer"
                  disabled={current >= totalPages}
                  onClick={() => setPage(current + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default CategoriesTable;
