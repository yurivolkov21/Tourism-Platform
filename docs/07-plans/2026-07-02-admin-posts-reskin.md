# Admin Posts reskin + detail — implementation plan

**STATUS: COMPLETE (2026-07-02)** — all 3 slices executed via subagent-driven development and
ff-merged to `main`: slice 1 `c6485b4` (BE author + detail page, `ecc:code-reviewer` APPROVE) ·
slice 2 `b91bce0` (list reskin) · slice 3 `644d50e` (form reskin). Gate green per slice; no
native `<select>` remains in admin (sweep verified).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the admin Posts module onto the established admin template — reskinned list, a new detail page (Markdown-rendered, with the author's name), and a Form Layout 2 form — per the approved spec `docs/06-specs/2026-07-02-admin-posts-reskin-design.md`.

**Architecture:** 3 slices, each its own branch, detail-first (the Tours rhythm). Slice 1 adds a small additive BE change (`AdminPostDetailDto` with `author {fullName, email}`, admin route only) + the detail page. Slice 2 rebuilds the list on the shared TanStack foundation (client load-all). Slice 3 reskins the form. All plumbing (`lib/posts/{data,schema,actions}`) keeps its field names and signatures.

**Tech Stack:** NestJS 11 + Prisma (api) · Next.js 16 App Router (admin) · `@tourism/ui` (Base UI) · TanStack Table · `react-markdown` + `remark-gfm` · zod · jest.

## Global Constraints

- **Design consistency is STRICT** (memory `admin-ui-design-consistency`): reuse the exact shared components — `AdminListHeader`, `RowActions`, `ColumnsMenu`, `AdminTableShell`, `ClientTablePagination`, `@tourism/ui` `Select`. **Never a native `<select>`.**
- Base UI uses the `render` prop (NOT Radix `asChild`); `Button` link form = `nativeButton={false} render={<Link …/>}`. `Select` popup needs `align="start" alignItemWithTrigger={false}` + a hidden `<input>` to post the controlled value.
- Never `render` a native `<button>` into a Menu.Item (memory `baseui-menu-item-footguns`).
- No hex colors — theme tokens only. App-internal imports are **relative** (no `@/`).
- Single-resource admin fetches unwrap the `{data}` envelope (memory `admin-api-envelope-unwrap`) — `getPost` already does; keep it.
- Markdown rendering: NO `rehype-raw` (no raw-HTML injection), scoped `components` map only.
- Conventional Commits, no AI attribution. Field names `title/slug/excerpt/content/status` must not change.
- Each slice ends with `/gate` green (lint + typecheck + test + build). **Ask the user before any push/merge** — they review on the Vercel deploy.

---

# Slice 1 — BE author enrichment + detail page

Branch off `main`: `git checkout -b feat/admin-posts-detail`

### Task 1: BE — `findDetailForAdmin` + `AdminPostDetailDto` (TDD)

**Files:**
- Create: `apps/api/src/modules/posts/dto/admin-post-detail.dto.ts`
- Modify: `apps/api/src/modules/posts/posts.service.ts` (add type + method after `findBySlug`, ~line 61)
- Modify: `apps/api/src/modules/posts/admin-posts.controller.ts` (the `detail` route, lines 52–58)
- Test: `apps/api/src/modules/posts/posts.service.spec.ts`

**Interfaces:**
- Consumes: existing `PostsService` internals (`notFound`), `PostDto`.
- Produces: `PostsService.findDetailForAdmin(slug: string): Promise<AdminPostDetail>` where `AdminPostDetail = Post & { author: { fullName: string | null; email: string } }`; Swagger type `AdminPostDetailDto extends PostDto` with `author: PostAuthorDto`. Task 2 regenerates the FE types from this.

- [ ] **Step 1: Write the failing tests** — append inside `describe('PostsService', …)` in `posts.service.spec.ts`:

```ts
  it('findDetailForAdmin returns the post with its author', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: '1',
      slug: 'x',
      author: { fullName: 'Ana Admin', email: 'ana@nexora.travel' },
    });
    const svc = new PostsService(makePrisma({ findUnique }));

    const res = await svc.findDetailForAdmin('x');

    expect(findUnique).toHaveBeenCalledWith({
      where: { slug: 'x' },
      include: { author: { select: { fullName: true, email: true } } },
    });
    expect(res.author).toEqual({ fullName: 'Ana Admin', email: 'ana@nexora.travel' });
  });

  it('findDetailForAdmin throws 404 when the post is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const svc = new PostsService(makePrisma({ findUnique }));
    await expect(svc.findDetailForAdmin('nope')).rejects.toThrow(NotFoundException);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm nx test @tourism/api`
Expected: the 2 new tests FAIL with `svc.findDetailForAdmin is not a function`; everything else passes.

- [ ] **Step 3: Create the DTO** — `apps/api/src/modules/posts/dto/admin-post-detail.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { PostDto } from './post.dto';

/** The post's author — admin detail only (display name + contact, not the bare UUID). */
export class PostAuthorDto {
  @ApiProperty({ nullable: true, type: String, example: 'Ana Admin' })
  fullName!: string | null;

  @ApiProperty({ example: 'ana@nexora.travel' })
  email!: string;
}

/**
 * Admin-only post detail (`GET /admin/posts/:slug`). Extends the shared `PostDto` with the author
 * — surfaced only on the admin read (public reads use `findPublicBySlug`, untouched). Mirrors
 * `AdminDestinationDetailDto` / `AdminBookingDetailDto`.
 */
export class AdminPostDetailDto extends PostDto {
  @ApiProperty({ type: PostAuthorDto })
  author!: PostAuthorDto;
}
```

- [ ] **Step 4: Add the service type + method** — in `posts.service.ts`, extend the type exports (below the `PaginatedPosts` interface) and add the method directly after `findBySlug`:

```ts
/** `Post` + the author's display fields — the admin detail read (`AdminPostDetailDto`). */
export type AdminPostDetail = Post & {
  author: { fullName: string | null; email: string };
};
```

```ts
  /** Admin detail: the post plus its author's name/email. Public reads stay author-free. */
  async findDetailForAdmin(slug: string): Promise<AdminPostDetail> {
    const post = await this.prisma.post.findUnique({
      where: { slug },
      include: { author: { select: { fullName: true, email: true } } },
    });
    if (!post) throw this.notFound(slug);
    return post;
  }
```

- [ ] **Step 5: Wire the controller** — in `admin-posts.controller.ts` replace the `detail` route:

```ts
  @Get(':slug')
  @ApiOperation({ summary: 'Admin: get one post by slug (with its author)' })
  @ApiOkResponse({ type: AdminPostDetailDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  detail(@Param('slug') slug: string): Promise<AdminPostDetail> {
    return this.postsService.findDetailForAdmin(slug);
  }
```

Update imports: add `import { AdminPostDetailDto } from './dto/admin-post-detail.dto';` and pull `AdminPostDetail` from `./posts.service` (`import { AdminPostDetail, PaginatedPosts, PostsService } from './posts.service';`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm nx test @tourism/api`
Expected: PASS (232 tests — 230 prior + 2 new).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/posts
git commit -m "feat(api): admin post detail returns the author (AdminPostDetailDto)"
```

### Task 2: Regenerate `@tourism/core` types

**Files:**
- Modify (generated): `libs/shared/core/src/lib/api/schema.ts`

**Interfaces:**
- Produces: `components['schemas']['AdminPostDetailDto']` for the admin FE (Task 3).

- [ ] **Step 1: Boot the API locally** (needs `apps/api/.env`, which is present):

Run: `pnpm nx serve @tourism/api` (leave running; in a separate shell continue)
Verify: `http://localhost:3000/api/docs-json` responds.

- [ ] **Step 2: Regenerate**

Run: `pnpm nx run @tourism/core:api-types`
Expected: rewrites `libs/shared/core/src/lib/api/schema.ts`.

- [ ] **Step 3: Verify + kill the server**

Run: `git diff --stat libs/shared/core/src/lib/api/schema.ts` and grep the file for `AdminPostDetailDto` (must contain `author` with `fullName`/`email`). Review the diff — unrelated drift is acceptable only if typecheck stays green. Stop the API server.

- [ ] **Step 4: Typecheck all consumers**

Run: `pnpm nx run-many -t typecheck -p @tourism/core @tourism/admin @tourism/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/core/src/lib/api/schema.ts
git commit -m "chore(core): regen API types (AdminPostDetailDto)"
```

### Task 3: Admin deps + `PostContent` Markdown renderer + `PostDetail` type

**Files:**
- Modify: `apps/admin/package.json` (dependencies)
- Create: `apps/admin/src/components/posts/post-content.tsx`
- Modify: `apps/admin/src/lib/posts/data.ts` (`getPost` typing)

**Interfaces:**
- Consumes: `components['schemas']['AdminPostDetailDto']` from Task 2.
- Produces: `PostContent({ markdown }: { markdown: string })` (server component) and `export type PostDetail` + `getPost(slug): Promise<PostDetail>` for Task 4.

- [ ] **Step 1: Add the deps** (same versions `apps/web` already uses):

Run: `pnpm add react-markdown@^10.1.0 remark-gfm@^4.0.1 --filter @tourism/admin`
Expected: `apps/admin/package.json` gains both deps; lockfile updates.

- [ ] **Step 2: Create the renderer** — `apps/admin/src/components/posts/post-content.tsx` (server component — react-markdown is hook-free, no `'use client'` needed):

```tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown → styled elements for a post body (admin detail preview). Mirrors the web itinerary
 * renderer: scoped classes (no typography plugin), raw HTML NOT enabled (no `rehype-raw`) so
 * authored content can't inject scripts. `h1` renders as an h2 — the page owns the real h1.
 */
const MD_COMPONENTS: Components = {
  p: (props) => <p className="text-muted-foreground mb-3 leading-relaxed text-pretty last:mb-0" {...props} />,
  strong: (props) => <strong className="text-foreground font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0" {...props} />,
  li: (props) => <li className="text-muted-foreground marker:text-primary/60 leading-relaxed text-pretty" {...props} />,
  h1: ({ children }) => <h2 className="font-heading text-foreground mt-5 mb-2 text-xl font-semibold first:mt-0">{children}</h2>,
  h2: (props) => <h2 className="font-heading text-foreground mt-5 mb-2 text-xl font-semibold first:mt-0" {...props} />,
  h3: (props) => <h3 className="font-heading text-foreground mt-4 mb-1.5 text-lg font-semibold first:mt-0" {...props} />,
  h4: (props) => <h4 className="text-foreground mt-3 mb-1 font-semibold first:mt-0" {...props} />,
  a: (props) => <a className="text-primary font-medium hover:underline" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-primary/30 text-muted-foreground mb-3 border-l-2 pl-4 italic" {...props} />
  ),
  code: (props) => <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs" {...props} />,
  hr: () => <hr className="border-border/60 my-4" />,
};

/** Renders a post's Markdown body for the admin detail page. */
export function PostContent({ markdown }: { markdown: string }) {
  return (
    <div className="min-w-0 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

export default PostContent;
```

- [ ] **Step 3: Type `getPost` to the detail DTO** — in `apps/admin/src/lib/posts/data.ts`:

Add below the `Post` type:

```ts
export type PostDetail = components['schemas']['AdminPostDetailDto'];
```

Change `getPost`'s signature + unwrap cast (body stays the envelope-unwrap):

```ts
export async function getPost(slug: string): Promise<PostDetail> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/posts/{slug}', {
    params: { path: { slug } },
  });
  return (data as unknown as { data: PostDetail }).data;
}
```

(`PostDetail` extends `Post`, so the edit page and `PostForm`'s `post?: Post` prop keep compiling unchanged.)

- [ ] **Step 4: Typecheck**

Run: `pnpm nx run @tourism/admin:typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/package.json pnpm-lock.yaml apps/admin/src/components/posts/post-content.tsx apps/admin/src/lib/posts/data.ts
git commit -m "feat(admin): post Markdown renderer + typed admin post detail"
```

### Task 4: Detail page `/posts/[slug]` + list title link

**Files:**
- Create: `apps/admin/src/app/(admin)/posts/[slug]/page.tsx`
- Modify: `apps/admin/src/components/posts/posts-table.tsx` (title cell only, lines 21–28)

**Interfaces:**
- Consumes: `getPost`/`PostDetail`, `PostContent`, `deletePost(slug): Promise<{ error?: string }>`, `RowActions` (props: `editHref, deleteAction, deleteId, deleteTitle, deleteDescription, redirectTo`), `formatRelativeTime(iso)`.

- [ ] **Step 1: Create the page** — `apps/admin/src/app/(admin)/posts/[slug]/page.tsx` (mirrors the Categories detail):

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@tourism/ui';

import { RowActions } from '../../../../components/crud/row-actions';
import { PostContent } from '../../../../components/posts/post-content';
import { deletePost } from '../../../../lib/posts/actions';
import { getPost, type PostDetail } from '../../../../lib/posts/data';
import { formatRelativeTime } from '../../../../lib/relative-time';

interface PostDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Label/value row for the details rail. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Absolute date + relative-time suffix for the rail. */
function When({ iso }: { iso: string }) {
  return (
    <span className="font-normal">
      {formatDate(iso)}
      <span className="text-muted-foreground ml-1.5 text-xs">{formatRelativeTime(iso)}</span>
    </span>
  );
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { slug } = await params;

  let post: PostDetail;
  try {
    post = await getPost(slug);
  } catch {
    notFound();
  }

  const isPublished = post.status === 'PUBLISHED';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href="/posts"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to posts
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{post.title}</h1>
            <Badge variant={isPublished ? 'default' : 'secondary'} className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
              {isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          {post.excerpt ? <p className="text-muted-foreground text-sm">{post.excerpt}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/posts/${post.slug}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/posts/${post.slug}/edit`}
            deleteAction={deletePost}
            deleteId={post.slug}
            deleteTitle={`Delete “${post.title}”?`}
            deleteDescription="This permanently deletes the post and can’t be undone."
            redirectTo="/posts"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent>
              <PostContent markdown={post.content} />
            </CardContent>
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row label="Status" value={isPublished ? 'Published' : 'Draft'} />
                <Row label="Slug" value={<code className="text-xs">{post.slug}</code>} />
                <Row
                  label="Author"
                  value={
                    <span className="font-normal">
                      {post.author.fullName ?? '—'}
                      <span className="text-muted-foreground block text-xs">{post.author.email}</span>
                    </span>
                  }
                />
                <Row
                  label="Published"
                  value={post.publishedAt ? <When iso={post.publishedAt} /> : '—'}
                />
                <Row label="Created" value={<When iso={post.createdAt} />} />
                <Row label="Updated" value={<When iso={post.updatedAt} />} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Link the list title to the detail** — in `posts-table.tsx`, replace the `title` column's `cell`:

```tsx
    cell: ({ row }) => (
      <Link
        href={`/posts/${row.original.slug}`}
        title={row.original.title}
        className="hover:text-primary block max-w-104 truncate font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
```

(`Link` is already imported in this file.)

- [ ] **Step 3: Build + verify in dev**

Run: `pnpm nx run @tourism/admin:typecheck && pnpm nx build @tourism/admin`
Expected: PASS; the build route list includes `/posts/[slug]`.
Then `pnpm nx dev @tourism/admin` → open `http://localhost:3002/posts`, click a title → detail renders Markdown + author (memory `next16-rsc-icon-prop-gotcha`: dynamic routes must be loaded in dev, the build alone won't catch RSC prop crashes).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/\(admin\)/posts/\[slug\]/page.tsx apps/admin/src/components/posts/posts-table.tsx
git commit -m "feat(admin): posts detail page — Markdown content + author + facts rail"
```

### Task 5: Slice-1 gate + review + handoff

- [ ] **Step 1:** Run the `/gate` skill (lint + typecheck + test + build across affected). Expected: all green.
- [ ] **Step 2:** Dispatch `ecc:code-reviewer` on the slice diff (`git diff main...HEAD`) — BE surface changed. Address CRITICAL/HIGH before proceeding.
- [ ] **Step 3:** STOP — ask the user to review; push the branch only after their OK (they verify on the Vercel/Render deploys, then decide the merge).

---

# Slice 2 — list reskin

Branch off `main` (after slice 1 merges): `git checkout -b feat/admin-posts-list-reskin`

### Task 6: Rebuild `PostsTable` on the shared foundation

**Files:**
- Rewrite: `apps/admin/src/components/posts/posts-table.tsx`
- Delete: `apps/admin/src/components/posts/delete-post.tsx` (only importer is this table — verified)

**Interfaces:**
- Consumes: `Post` from `../../lib/posts/data`, `deletePost` from `../../lib/posts/actions`, shared `crud/{row-actions,columns-menu,admin-table-shell,client-table-pagination,data-table-pagination}` (`DEFAULT_PAGE_SIZE`), `formatRelativeTime`.
- Produces: `PostsTable({ rows }: { rows: Post[] })` for Task 7 (no `meta`/pagination props any more).

- [ ] **Step 1: Rewrite the table** — full replacement of `posts-table.tsx` (mirrors `ToursTable`, minus the category facet; adds a true zero-state):

```tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  cn,
} from '@tourism/ui';

import { RowActions } from '../crud/row-actions';
import { deletePost } from '../../lib/posts/actions';
import type { Post } from '../../lib/posts/data';
import { formatRelativeTime } from '../../lib/relative-time';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';

type Tab = 'all' | 'published' | 'draft';

const postColumns: ColumnDef<Post>[] = [
  {
    id: 'title',
    header: 'Title',
    enableHiding: false,
    meta: { label: 'Title' },
    cell: ({ row }) => (
      <Link
        href={`/posts/${row.original.slug}`}
        title={row.original.title}
        className="hover:text-primary block max-w-104 truncate font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'PUBLISHED' ? 'default' : 'secondary'}
        className="gap-1.5"
      >
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {row.original.status === 'PUBLISHED' ? 'Published' : 'Draft'}
      </Badge>
    ),
  },
  {
    id: 'published',
    header: 'Published',
    meta: { label: 'Published' },
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.publishedAt ? row.original.publishedAt.slice(0, 10) : '—'}
      </span>
    ),
  },
  {
    id: 'updated',
    header: 'Updated',
    meta: { label: 'Updated' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.updatedAt)}</span>
    ),
  },
  {
    id: 'actions',
    header: 'Actions',
    enableHiding: false,
    meta: { align: 'right' },
    cell: ({ row }) => (
      <RowActions
        editHref={`/posts/${row.original.slug}/edit`}
        deleteAction={deletePost}
        deleteId={row.original.slug}
        deleteTitle={`Delete “${row.original.title}”?`}
        deleteDescription="This permanently deletes the post and can’t be undone."
      />
    ),
  },
];

/**
 * Client-side Posts table on TanStack: tab (status) + search filtering happens in memory (instant —
 * the whole catalog is loaded once) and feeds the already-filtered rows into the table. TanStack owns
 * only the column model, visibility (the "Columns" button), and in-memory paging.
 */
export function PostsTable({ rows }: { rows: Post[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((r) => r.status === 'PUBLISHED').length,
      draft: rows.filter((r) => r.status !== 'PUBLISHED').length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'published' && r.status !== 'PUBLISHED') return false;
      if (tab === 'draft' && r.status === 'PUBLISHED') return false;
      if (needle && !r.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, tab, query]);

  const table = useReactTable({
    data: filtered,
    columns: postColumns,
    state: { columnVisibility },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'published', label: 'Published', count: counts.published },
    { value: 'draft', label: 'Draft', count: counts.draft },
  ];

  // True zero-state (no posts at all) — before any toolbar, mirroring the old page's empty block.
  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>Write your first post to start the journal.</EmptyDescription>
        </EmptyHeader>
        <Button nativeButton={false} render={<Link href="/posts/new" />}>
          <Plus data-icon="inline-start" />
          New post
        </Button>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                onClick={() => setTab(t.value)}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title…"
              aria-label="Search posts"
              className="bg-background pl-8"
            />
          </div>
          <ColumnsMenu table={table} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No posts match your filters</EmptyTitle>
            <EmptyDescription>Try different filters or clear them to see them all.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <AdminTableShell table={table} />
          <ClientTablePagination table={table} />
        </>
      )}
    </div>
  );
}

export default PostsTable;
```

- [ ] **Step 2: Delete the bespoke delete component**

```bash
git rm apps/admin/src/components/posts/delete-post.tsx
```

- [ ] **Step 3: Typecheck** (the page still passes `meta` props — fixed in Task 7, so run after both if preferred; if running now, expect the page error only in `app/(admin)/posts/page.tsx`).

### Task 7: Rewrite the list page

**Files:**
- Rewrite: `apps/admin/src/app/(admin)/posts/page.tsx`

**Interfaces:**
- Consumes: `PostsTable({ rows })` from Task 6, `listPosts` (`pageSize: 100` — the API cap; the blog catalog is far smaller), `AdminListHeader`, `ErrorAlert`.

- [ ] **Step 1: Full replacement** of `page.tsx`:

```tsx
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { PostsTable } from '../../../components/posts/posts-table';
import { listPosts, type PostList } from '../../../lib/posts/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function PostsPage() {
  let result: PostList | undefined;
  let error: string | null = null;
  try {
    result = await listPosts({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }

  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Posts"
        description="Editorial blog posts. Drafts are shown here too; only published posts appear on the site."
        action={
          <Button nativeButton={false} render={<Link href="/posts/new" />}>
            <Plus data-icon="inline-start" />
            New post
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>
          Couldn&apos;t load posts: {error}. Check that the API is running and your admin session is
          valid.
        </ErrorAlert>
      ) : (
        <PostsTable rows={rows} />
      )}
    </div>
  );
}
```

Note: `ServerTablePagination` + `parsePageSize` remain in use by Bookings/Enquiries — do NOT delete those shared files.

- [ ] **Step 2: Verify in dev** — tabs + counts, instant search, Columns, pagination, ⋮ delete (toast "Deleted."), title → detail.

Run: `pnpm nx run @tourism/admin:typecheck && pnpm nx build @tourism/admin`, then `pnpm nx dev @tourism/admin` → `http://localhost:3002/posts`.
Expected: typecheck/build PASS; behaviors as listed.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/app/\(admin\)/posts/page.tsx apps/admin/src/components/posts/posts-table.tsx
git commit -m "feat(admin): reskin Posts list to the shared table template"
```

### Task 8: Slice-2 gate + handoff

- [ ] **Step 1:** Run `/gate`. Expected: green (admin tests unchanged — 106).
- [ ] **Step 2:** Self-certify (UI reskin mirroring the reviewed Tours pattern — per the spec, no agent review).
- [ ] **Step 3:** STOP — ask the user to review/push/merge.

---

# Slice 3 — form reskin

Branch off `main` (after slice 2 merges): `git checkout -b feat/admin-posts-form-reskin`

### Task 9: Rebuild `PostForm` (Form Layout 2 + auto-slug + Select)

**Files:**
- Rewrite: `apps/admin/src/components/posts/post-form.tsx`

**Interfaces:**
- Consumes: `PostFormState`, `POST_STATUSES`, `Post`, `slugify` from `../../lib/slugify`, `ErrorAlert`.
- Produces: same component signature `PostForm({ action, post, submitLabel })` — the new/edit pages don't change their invocation. Field names posted are unchanged: `title, slug, excerpt, content, status`.

- [ ] **Step 1: Full replacement** of `post-form.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from '@tourism/ui';

import type { PostFormState } from '../../lib/posts/actions';
import { POST_STATUSES } from '../../lib/posts/schema';
import type { Post } from '../../lib/posts/data';
import { slugify } from '../../lib/slugify';
import { ErrorAlert } from '../crud/error-alert';

interface PostFormProps {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  post?: Post;
  submitLabel: string;
}

/** `PUBLISHED` → `Published`. */
const labelize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * Create/edit form for a post — shadcn "Form Layout 2" (sectioned: a left title/description column
 * beside the fields), matching the other admin forms. Field names are unchanged, so the zod schema
 * + server actions stay as-is.
 */
export function PostForm({ action, post, submitLabel }: PostFormProps) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(action, {});
  const errors = state.fieldErrors ?? {};

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  // On edit the slug is pre-set → treat as user-owned so editing the title doesn't clobber the URL.
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug));
  const [status, setStatus] = useState<string>(post?.status ?? 'DRAFT');

  return (
    <form action={formAction}>
      {/* Basics */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Basics</FieldLegend>
          <FieldDescription>The public title, its URL slug, and the card teaser.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              required
              maxLength={160}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="Three perfect days in Hội An"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input
              id="slug"
              name="slug"
              maxLength={80}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="three-perfect-days-in-hoi-an"
              aria-invalid={Boolean(errors.slug)}
            />
            <FieldDescription>
              Auto-generated from the title. Edit it only for a custom URL — lowercase, words
              separated by hyphens.
            </FieldDescription>
            {errors.slug ? <FieldError>{errors.slug}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.excerpt)}>
            <FieldLabel htmlFor="excerpt">Excerpt</FieldLabel>
            <Textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              maxLength={300}
              defaultValue={post?.excerpt ?? ''}
              placeholder="A short teaser shown on the blog card."
              aria-invalid={Boolean(errors.excerpt)}
            />
            {errors.excerpt ? <FieldError>{errors.excerpt}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Content */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Content</FieldLegend>
          <FieldDescription>The post body in Markdown — headings, bold, lists, links.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.content)}>
            <FieldLabel htmlFor="content">Body</FieldLabel>
            <Textarea
              id="content"
              name="content"
              rows={16}
              maxLength={50000}
              required
              defaultValue={post?.content ?? ''}
              placeholder={'## A heading\n\nWrite the post in Markdown…'}
              className="font-mono text-[0.8rem] leading-relaxed"
              aria-invalid={Boolean(errors.content)}
            />
            <FieldDescription>Markdown — rendered (sanitized) on the public site.</FieldDescription>
            {errors.content ? <FieldError>{errors.content}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Publishing */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Publishing</FieldLegend>
          <FieldDescription>Only published posts appear on the site.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select value={status} onValueChange={(v) => setStatus(v ?? 'DRAFT')}>
              <SelectTrigger id="status" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {POST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labelize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
            <FieldDescription>
              Publishing stamps the publish date; only published posts are public.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <div className="mt-6">
          <ErrorAlert>{state.error}</ErrorAlert>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/posts" />}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default PostForm;
```

- [ ] **Step 2: Run the existing schema spec** (must stay green — field names unchanged):

Run: `pnpm nx test @tourism/admin`
Expected: PASS (all admin tests, incl. `lib/posts/schema.spec.ts`).

### Task 10: Widen the form page containers

**Files:**
- Modify: `apps/admin/src/app/(admin)/posts/new/page.tsx` (container div)
- Modify: `apps/admin/src/app/(admin)/posts/[slug]/edit/page.tsx` (container div, line 28)

- [ ] **Step 1:** In both pages, change the outer container class from `mx-auto max-w-2xl space-y-6 p-6` to the form-template width (matches the Destinations form pages):

```tsx
<div className="mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6">
```

- [ ] **Step 2: Verify in dev** — `/posts/new`: type a Title and watch the slug auto-fill; edit the slug then the title (slug must stay); Status opens a themed Select popup; submit still works end-to-end (create + edit).

Run: `pnpm nx run @tourism/admin:typecheck && pnpm nx build @tourism/admin`, then dev-check as above.
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/posts/post-form.tsx apps/admin/src/app/\(admin\)/posts/new/page.tsx apps/admin/src/app/\(admin\)/posts/\[slug\]/edit/page.tsx
git commit -m "feat(admin): reskin post form to Form Layout 2 + Select + auto-slug"
```

### Task 11: Slice-3 gate + wrap-up

- [ ] **Step 1:** Run `/gate`. Expected: green.
- [ ] **Step 2:** Self-certify (mirrors the reviewed tour/destination form patterns).
- [ ] **Step 3:** Sweep: `grep -rn "<select" apps/admin/src` → must return nothing (success criterion: no native `<select>` left in admin).
- [ ] **Step 4:** STOP — ask the user to review/push/merge. After the final merge: update `docs` status lines + memory (`tourism-platform-state`) per the standing workflow, and mark this plan complete.
