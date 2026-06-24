import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';

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
import { DeletePost } from '../../../components/posts/delete-post';
import { listPosts, type PostList } from '../../../lib/posts/data';

interface PostsPageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

const FILTER_CLASS =
  'border-input bg-background h-9 rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function pageHref(page: number, params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return qs ? `/posts?${qs}` : '/posts';
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const search = (sp.search ?? '').trim();
  const status = sp.status === 'DRAFT' || sp.status === 'PUBLISHED' ? sp.status : '';

  let result: PostList | undefined;
  let error: string | null = null;
  try {
    result = await listPosts({ page, search: search || undefined, status: status || undefined });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];
  const meta = result?.meta;
  const activeParams = { search, status };

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
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          Couldn&apos;t load posts: {error}. Check that the API is running and your admin session is
          valid.
        </div>
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
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {post.publishedAt ? post.publishedAt.slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/posts/${post.slug}/edit`} />}
                        >
                          Edit
                        </Button>
                        <DeletePost slug={post.slug} title={post.title} />
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
