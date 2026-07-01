import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';

import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
} from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { PostsTable } from '../../../components/posts/posts-table';
import { listPosts, type PostList } from '../../../lib/posts/data';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { ServerTablePagination } from '../../../components/crud/server-table-pagination';
import { parsePageSize } from '../../../lib/pagination';

interface PostsPageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string; pageSize?: string }>;
}

const FILTER_CLASS =
  'border-input bg-background h-9 rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const search = (sp.search ?? '').trim();
  const status = sp.status === 'DRAFT' || sp.status === 'PUBLISHED' ? sp.status : '';
  const pageSize = parsePageSize(sp.pageSize);

  let result: PostList | undefined;
  let error: string | null = null;
  try {
    result = await listPosts({ page, pageSize, search: search || undefined, status: status || undefined });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold">Posts</h1>
          <p className="text-muted-foreground text-sm">
            Editorial blog posts. Drafts are shown here too; only published posts appear on the site.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/posts/new" />}>
          <Plus data-icon="inline-start" />
          New post
        </Button>
      </div>

      <form action="/posts" method="get" className="flex flex-wrap items-center gap-2">
        {/* Carry the chosen page size across a filter submit (native GET replaces the whole query). */}
        <input type="hidden" name="pageSize" value={String(pageSize)} />
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by title…"
            className="pl-8"
            aria-label="Search posts"
          />
        </div>
        <select name="status" defaultValue={status} className={FILTER_CLASS} aria-label="Status">
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load posts: {error}. Check that the API is running and your admin session is
          valid.
        </ErrorAlert>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{search || status ? 'No posts match your filters' : 'No posts yet'}</EmptyTitle>
            <EmptyDescription>
              {search || status
                ? 'Try different filters, or clear them to see them all.'
                : 'Write your first post to start the journal.'}
            </EmptyDescription>
          </EmptyHeader>
          {!search && !status ? (
            <Button nativeButton={false} render={<Link href="/posts/new" />}>
              <Plus data-icon="inline-start" />
              New post
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <PostsTable rows={rows} />

          {meta ? (
            <ServerTablePagination
              page={meta.page}
              pageCount={meta.totalPages}
              total={meta.total}
              pageSize={meta.pageSize}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
