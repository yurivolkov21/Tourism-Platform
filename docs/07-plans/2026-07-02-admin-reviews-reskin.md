# Admin Reviews reskin + surfacing (Wave 2) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the last pre-template admin surface (Reviews) onto the shared template with a full-text drawer, surface the hidden data (`tripLabel`, `title`, tour title/link), and add curated-only delete — per spec `docs/06-specs/2026-07-02-admin-reviews-reskin-design.md` (Wave 2 of the enrichment roadmap).

**Architecture:** 2 slices, one branch each. Slice 1 is additive BE (2 DTO fields + mapper + `DELETE /admin/reviews/:id` guarded to CURATED) + regen. Slice 2 rebuilds the FE: `ReviewsView` client component (9th table on the TanStack foundation + Enquiries-style drawer + ⋮ actions menu), page rewrite, curated-form → Form Layout 2.

**Tech Stack:** NestJS 11 + Prisma (api) · Next.js 16 admin · `@tourism/ui` (Base UI) · TanStack Table · jest.

## Global Constraints

- **Design consistency is STRICT** (memory `admin-ui-design-consistency`): reuse `AdminListHeader`, `AdminTableShell`, `ColumnsMenu`, `ClientTablePagination`, the Base UI `DropdownMenu`+`DropdownMenuCheckboxItem` facet pattern, `Sheet` drawer (Enquiries), Form Layout 2 `Field*` components. No native `<select>`, no bespoke one-offs.
- **Base UI footguns** (memory `baseui-menu-item-footguns`): mutation menu items use `onClick` — never `render` a native `<button>` into a Menu.Item; delete confirm is a CONTROLLED `AlertDialog` outside the menu; `Button` link form = `nativeButton={false} render={<Link/>}`.
- **Curated-only delete is a BE guard** (`source !== CURATED` → 409 `REVIEW_NOT_CURATED`) asserted by a test — the FE hiding the item is convenience, not the protection.
- **Deploy-lag guards** (Render lags Vercel): FE reads `r.tripLabel ?? null`, `r.tourTitle ?? r.tourSlug ?? '—'` — never assume the new fields exist.
- All actions toast success/failure (feedback-layer standard). No hex colors; relative imports; Conventional Commits, no AI attribution.
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile` (admin/web have NO `typecheck` target — build is the TS gate). Slice 1 → `ecc:code-reviewer` (destructive endpoint). Merging to `main` after a green slice is pre-authorized; pause only on CRITICAL/HIGH findings.

---

# Slice 1 — BE: surfacing + curated-only delete

Branch off `main`: `git checkout -b feat/admin-reviews-surface-be`

### Task 1: DTO fields + mapper + `deleteCuratedById` (TDD)

**Files:**
- Modify: `apps/api/src/modules/reviews/dto/admin-review.dto.ts` (add 2 fields)
- Modify: `apps/api/src/modules/reviews/reviews.service.ts` (`AdminReviewItem` type, `findAllForAdmin` include+mapper ~lines 268-316, new `deleteCuratedById`)
- Modify: `apps/api/src/modules/reviews/admin-reviews.controller.ts` (new DELETE route)
- Modify: `apps/admin/src/lib/api/error.ts` (`FRIENDLY_BY_CODE` + 1 entry, ~line 47)
- Test: `apps/api/src/modules/reviews/reviews.service.spec.ts`

**Interfaces:**
- Produces: `AdminReviewDto.tripLabel: string | null` + `AdminReviewDto.tourTitle: string | null`; `ReviewsService.deleteCuratedById(id: string): Promise<Review>` (404 `REVIEW_NOT_FOUND` / 409 `REVIEW_NOT_CURATED`); route `DELETE /admin/reviews/:id` (echo `ReviewDto`). Task 2 regenerates FE types; Task 3 consumes the route.

- [ ] **Step 1: Write the failing tests** — append a new `describe` at the end of `reviews.service.spec.ts` (self-contained mocks, `as never` casts like the file's existing tests; extend the file's imports with `ConflictException` from `@nestjs/common` and `ReviewSource` from `@prisma/client` if not already there):

```ts
describe('ReviewsService — admin surfacing + curated delete', () => {
  it('findAllForAdmin maps tripLabel and the tour title', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'r1',
        tourId: 't1',
        userId: null,
        bookingId: null,
        authorName: 'Ana',
        authorLocation: null,
        source: ReviewSource.CURATED,
        isFeatured: true,
        rating: 5,
        title: 'Great',
        body: 'Lovely trip',
        isApproved: true,
        tripLabel: 'Hạ Long Bay Cruise',
        createdAt: new Date(),
        updatedAt: new Date(),
        tour: { slug: 'ha-long', title: 'Hạ Long Bay Cruise 2D1N' },
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new ReviewsService({ review: { findMany, count } } as never);

    const res = await svc.findAllForAdmin({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      tour: { select: { slug: true, title: true } },
    });
    expect(res.items[0].tripLabel).toBe('Hạ Long Bay Cruise');
    expect(res.items[0].tourTitle).toBe('Hạ Long Bay Cruise 2D1N');
  });

  it('deleteCuratedById deletes a curated review', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'r1', source: ReviewSource.CURATED });
    const del = jest.fn().mockResolvedValue({ id: 'r1' });
    const svc = new ReviewsService({ review: { findUnique, delete: del } } as never);

    await svc.deleteCuratedById('r1');

    expect(del).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('deleteCuratedById 404s when the review is missing', async () => {
    const svc = new ReviewsService(
      { review: { findUnique: jest.fn().mockResolvedValue(null) } } as never,
    );
    await expect(svc.deleteCuratedById('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deleteCuratedById 409s for a verified review (audit trail protected)', async () => {
    const del = jest.fn();
    const svc = new ReviewsService(
      {
        review: {
          findUnique: jest.fn().mockResolvedValue({ id: 'r1', source: ReviewSource.VERIFIED }),
          delete: del,
        },
      } as never,
    );
    await expect(svc.deleteCuratedById('r1')).rejects.toBeInstanceOf(ConflictException);
    expect(del).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm nx test @tourism/api`
Expected: the mapper test fails (include mismatch / `tripLabel` undefined) and the 3 delete tests fail (`deleteCuratedById is not a function`); everything else passes.

- [ ] **Step 3: DTO** — in `admin-review.dto.ts`, after the `tourSlug` property add:

```ts
  @ApiProperty({ nullable: true, type: String, example: 'Hoi An Ancient Town Walking Tour' })
  tourTitle!: string | null;
```

and after the `title` property add:

```ts
  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Hạ Long Bay Cruise',
    description: 'Trip label shown on curated testimonials.',
  })
  tripLabel!: string | null;
```

- [ ] **Step 4: Service** — in `reviews.service.ts`:

(a) Find the `AdminReviewItem` interface/type the mapper feeds (search `AdminReviewItem`) and add the two fields in the matching positions: `tourTitle: string | null;` (after `tourSlug`) and `tripLabel: string | null;` (after `title`).

(b) In `findAllForAdmin` (~line 282) change the include to:

```ts
        include: {
          tour: { select: { slug: true, title: true } },
        },
```

and extend the mapper object with:

```ts
      tourTitle: row.tour?.title ?? null,
      tripLabel: row.tripLabel,
```

(c) Add the delete method after `moderateById`/`setFeatured` (imports: add `ConflictException` to the `@nestjs/common` import; `ReviewSource` is already imported). If the service has a `private readonly logger = new Logger(ReviewsService.name);` use it; if not, add that line (the `Logger` import already exists):

```ts
  /**
   * Hard-delete a curated testimonial (admin). VERIFIED reviews are protected — deleting one
   * would erase a real customer's audit trail; unapprove it to hide it instead (409).
   */
  async deleteCuratedById(reviewId: string): Promise<Review> {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, source: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'REVIEW_NOT_FOUND',
        message: `Review "${reviewId}" not found`,
      });
    }
    if (existing.source !== ReviewSource.CURATED) {
      throw new ConflictException({
        code: 'REVIEW_NOT_CURATED',
        message: 'Only curated testimonials can be deleted — unapprove a verified review to hide it.',
      });
    }
    const deleted = await this.prisma.review.delete({ where: { id: reviewId } });
    this.logger.log(`Deleted curated review ${reviewId}`);
    return deleted;
  }
```

- [ ] **Step 5: Controller** — in `admin-reviews.controller.ts` add `Delete` to the `@nestjs/common` import and the route after `feature`:

```ts
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a curated testimonial (verified reviews are protected)' })
  @ApiOkResponse({ type: ReviewDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({ status: 409, description: 'Not a curated review' })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<Review> {
    return this.reviewsService.deleteCuratedById(id);
  }
```

- [ ] **Step 6: Friendly error** — in `apps/admin/src/lib/api/error.ts` add to `FRIENDLY_BY_CODE`:

```ts
  REVIEW_NOT_CURATED:
    'Only curated testimonials can be deleted. To hide a verified traveller review, unapprove it instead.',
```

- [ ] **Step 7: Run to verify green**

Run: `pnpm nx test @tourism/api`
Expected: PASS (246 = 242 prior + 4 new).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/reviews apps/admin/src/lib/api/error.ts
git commit -m "feat(api): admin review tripLabel/tourTitle + curated-only delete"
```

### Task 2: Regen types + slice-1 gate/review/merge

- [ ] **Step 1:** Boot the API (`pnpm nx serve @tourism/api` in the background; poll `http://localhost:3000/api/docs-json` until 200 — up to 90s), run `pnpm nx run @tourism/core:api-types`, kill the server process tree (resolve the PID via port 3000; confirm the port is free).
- [ ] **Step 2:** Verify the schema diff contains ONLY: `tripLabel` + `tourTitle` on `AdminReviewDto`, and the new `AdminReviewsController_remove` DELETE operation. `git diff --stat libs/shared/core/src/lib/api/schema.ts`.
- [ ] **Step 3:** `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` — PASS.
- [ ] **Step 4:** Commit: `git add libs/shared/core/src/lib/api/schema.ts && git commit -m "chore(core): regen API types (review tripLabel/tourTitle + delete)"`.
- [ ] **Step 5:** Gate: `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green. Dispatch `ecc:code-reviewer` on the branch diff (destructive endpoint — verify the CURATED guard, ADMIN role gating, no public-surface change). Fix CRITICAL/HIGH.
- [ ] **Step 6:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-reviews-surface-be && git push origin main && git branch -d feat/admin-reviews-surface-be`.

---

# Slice 2 — Admin FE: list reskin + drawer + form reskin

Branch off `main`: `git checkout -b feat/admin-reviews-reskin-fe`

### Task 3: Typed data + `deleteReview` action

**Files:**
- Modify: `apps/admin/src/lib/reviews/data.ts`
- Modify: `apps/admin/src/lib/reviews/actions.ts`

**Interfaces:**
- Consumes: regenerated `components['schemas']['AdminReviewDto']` (now incl. `tripLabel`/`tourTitle`), `DELETE /api/v1/admin/reviews/{id}` in the typed client.
- Produces: `AdminReview` = the generated DTO type (kills the hand-rolled drift-prone interface); `deleteReview(id: string): Promise<ReviewActionState>` for Task 4. Existing `setApproved`/`setFeatured`/`createCurated` unchanged.

- [ ] **Step 1:** `data.ts` — replace the hand-rolled `AdminReview` interface (lines 7-23) and its stale "generated client doesn't yet carry" comment with the generated type:

```ts
import type { components } from '@tourism/core';

/** Admin review row — the generated `AdminReviewDto` (incl. `tripLabel`/`tourTitle`). */
export type AdminReview = components['schemas']['AdminReviewDto'];
```

(Keep `ApiRequestError`, `authedGet`, `PageMeta`, `AdminReviewList`, `AdminReviewParams`, `listAdminReviews` exactly as they are — the plain authed GET stays; only the row type changes. Update the `authedGet` doc comment's parenthetical to note the generated types are now the source of the row shape.)

- [ ] **Step 2:** `actions.ts` — extend the client import to `import { apiWrite, getApiClient } from '../api/client';` and append (mirrors `deletePost` in `lib/posts/actions.ts:86-96`):

```ts
/** Delete a curated testimonial (`DELETE /admin/reviews/:id`); verified reviews 409 server-side. */
export async function deleteReview(id: string): Promise<ReviewActionState> {
  try {
    const api = await getApiClient();
    await api.DELETE('/api/v1/admin/reviews/{id}', { params: { path: { id } } });
  } catch (e) {
    return { error: apiErrorMessage(e) };
  }
  revalidatePath('/reviews');
  return {};
}
```

- [ ] **Step 3:** `pnpm nx build @tourism/admin` — PASS (the old reviews page still compiles against the generated type: field names match 1:1).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/reviews/data.ts apps/admin/src/lib/reviews/actions.ts
git commit -m "feat(admin): typed review rows + deleteReview action"
```

### Task 4: `ReviewsView` (table + facet + drawer + ⋮ actions) + page rewrite

**Files:**
- Create: `apps/admin/src/components/reviews/reviews-view.tsx`
- Rewrite: `apps/admin/src/app/(admin)/reviews/page.tsx`
- Delete: `apps/admin/src/components/reviews/review-actions.tsx` (verify no other importer first: `grep -rn "review-actions\|ReviewActions" apps/admin/src` must only hit the old page + the component itself)

**Interfaces:**
- Consumes: `AdminReview`/`listAdminReviews` (Task 3), `setApproved`/`setFeatured`/`deleteReview` actions, shared `crud/{admin-table-shell,columns-menu,client-table-pagination,list-header,error-alert,data-table-pagination}` (`DEFAULT_PAGE_SIZE`), `formatRelativeTime` from `../../lib/relative-time`.
- Produces: `ReviewsView({ rows, total }: { rows: AdminReview[]; total: number })`.

- [ ] **Step 1: Create `reviews-view.tsx`** (full file):

```tsx
'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import {
  Check,
  ChevronDown,
  ListFilter,
  MessageSquareQuote,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
  toast,
} from '@tourism/ui';

import { ColumnsMenu } from '../crud/columns-menu';
import { AdminTableShell } from '../crud/admin-table-shell';
import { ClientTablePagination } from '../crud/client-table-pagination';
import { DEFAULT_PAGE_SIZE } from '../crud/data-table-pagination';
import { deleteReview, setApproved, setFeatured } from '../../lib/reviews/actions';
import type { AdminReview } from '../../lib/reviews/data';
import { formatRelativeTime } from '../../lib/relative-time';

type Tab = 'all' | 'pending' | 'approved';
type SourceKey = 'VERIFIED' | 'CURATED';

const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'CURATED', label: 'Curated' },
];

function StatusBadges({ review }: { review: AdminReview }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={review.isApproved ? 'default' : 'secondary'} className="gap-1.5">
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {review.isApproved ? 'Approved' : 'Pending'}
      </Badge>
      {review.isFeatured ? <Badge variant="outline">Featured</Badge> : null}
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Star className="size-3.5 fill-current text-amber-500" aria-hidden />
      {value}
    </span>
  );
}

/**
 * Reviews moderation surface — client-side template table (tabs with counts, source facet,
 * instant search, Columns, pagination) + a right-hand drawer with the full text (the row already
 * carries everything — no detail endpoint). Actions live in a ⋮ menu (approve/feature/delete);
 * Delete only exists for CURATED testimonials (the API enforces it — 409 otherwise).
 */
export function ReviewsView({ rows, total }: { rows: AdminReview[]; total: number }) {
  const [tab, setTab] = useState<Tab>('all');
  const [sources, setSources] = useState<SourceKey[]>([]);
  const [query, setQuery] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selected, setSelected] = useState<AdminReview | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminReview | null>(null);
  const [busy, startAction] = useTransition();

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => !r.isApproved).length,
      approved: rows.filter((r) => r.isApproved).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'pending' && r.isApproved) return false;
      if (tab === 'approved' && !r.isApproved) return false;
      if (sources.length && !sources.includes(r.source as SourceKey)) return false;
      if (needle) {
        const haystack = `${r.authorName} ${r.title ?? ''} ${r.body}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, tab, sources, query]);

  /** Approve/unapprove or feature/unfeature with toast feedback; the page revalidates rows. */
  const act = (review: AdminReview, kind: 'approve' | 'feature') => {
    if (busy) return;
    startAction(async () => {
      const result =
        kind === 'approve'
          ? await setApproved(review.id, !review.isApproved)
          : await setFeatured(review.id, !review.isFeatured);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          kind === 'approve'
            ? review.isApproved
              ? 'Moved back to pending.'
              : 'Approved.'
            : review.isFeatured
              ? 'Removed from homepage.'
              : 'Pinned to homepage.',
        );
        // Keep the open drawer in step with the just-saved change.
        setSelected((cur) =>
          cur && cur.id === review.id
            ? kind === 'approve'
              ? { ...cur, isApproved: !review.isApproved }
              : { ...cur, isFeatured: !review.isFeatured }
            : cur,
        );
      }
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete || busy) return;
    const target = pendingDelete;
    startAction(async () => {
      const result = await deleteReview(target.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Deleted.');
        setPendingDelete(null);
        setSelected((cur) => (cur && cur.id === target.id ? null : cur));
      }
    });
  };

  const columns = useMemo<ColumnDef<AdminReview>[]>(
    () => [
      {
        id: 'author',
        header: 'Author',
        enableHiding: false,
        meta: { label: 'Author' },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelected(row.original)}
            className="block cursor-pointer text-left"
          >
            <span className="block font-medium">{row.original.authorName}</span>
            <span className="text-muted-foreground text-xs">
              {row.original.authorLocation ?? '—'}
            </span>
          </button>
        ),
      },
      {
        id: 'review',
        header: 'Review',
        enableHiding: false,
        meta: { label: 'Review' },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelected(row.original)}
            className="block max-w-md cursor-pointer text-left"
          >
            {row.original.title ? (
              <span className="block truncate font-medium">{row.original.title}</span>
            ) : null}
            <span className="text-muted-foreground line-clamp-2 text-sm">{row.original.body}</span>
          </button>
        ),
      },
      {
        id: 'rating',
        header: 'Rating',
        meta: { label: 'Rating', align: 'right' },
        cell: ({ row }) => <Rating value={row.original.rating} />,
      },
      {
        id: 'tour',
        header: 'Tour',
        meta: { label: 'Tour' },
        cell: ({ row }) => {
          const r = row.original;
          const label = r.tourTitle ?? r.tourSlug ?? null;
          if (!label) return <span className="text-muted-foreground">—</span>;
          return r.tourSlug ? (
            <Link
              href={`/tours/${r.tourSlug}`}
              title={label}
              className="hover:text-primary block max-w-48 truncate hover:underline"
            >
              {label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          );
        },
      },
      {
        id: 'source',
        header: 'Source',
        meta: { label: 'Source' },
        cell: ({ row }) => (
          <Badge variant={row.original.source === 'CURATED' ? 'outline' : 'secondary'}>
            {row.original.source === 'CURATED' ? 'Curated' : 'Verified'}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ row }) => <StatusBadges review={row.original} />,
      },
      {
        id: 'posted',
        header: 'Posted',
        meta: { label: 'Posted' },
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => {
          const r = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Review actions"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => act(r, 'approve')} disabled={busy}>
                  {r.isApproved ? <Undo2 className="size-4" /> : <Check className="size-4" />}
                  {r.isApproved ? 'Unapprove' : 'Approve'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => act(r, 'feature')} disabled={busy}>
                  {r.isFeatured ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  {r.isFeatured ? 'Unfeature' : 'Feature'}
                </DropdownMenuItem>
                {r.source === 'CURATED' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingDelete(r)}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { columnVisibility },
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const toggleSource = (key: SourceKey, checked: boolean) => {
    setSources((prev) => (checked ? [...prev, key] : prev.filter((s) => s !== key)));
  };

  const sourceLabel =
    sources.length === 0
      ? 'All sources'
      : sources.length === 1
        ? (SOURCE_OPTIONS.find((s) => s.key === sources[0])?.label ?? '1 source')
        : `${sources.length} sources`;

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'approved', label: 'Approved', count: counts.approved },
  ];

  if (rows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquareQuote />
          </EmptyMedia>
          <EmptyTitle>No reviews yet</EmptyTitle>
          <EmptyDescription>
            Reviews from travellers will appear here once they’re submitted.
          </EmptyDescription>
        </EmptyHeader>
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal sm:w-44"
                  aria-label="Filter by source"
                />
              }
            >
              <span className="inline-flex items-center gap-2">
                <ListFilter className="size-4 shrink-0" />
                <span className="truncate">{sourceLabel}</span>
              </span>
              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by source</DropdownMenuLabel>
                {SOURCE_OPTIONS.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s.key}
                    checked={sources.includes(s.key)}
                    onCheckedChange={(checked) => toggleSource(s.key, checked === true)}
                    closeOnClick={false}
                  >
                    {s.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {sources.length ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSources([])}>Clear filter</DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search author, title, text…"
              aria-label="Search reviews"
              className="bg-background pl-8"
            />
          </div>
          <ColumnsMenu table={table} />
        </div>
      </div>

      {total > rows.length ? (
        <p className="text-muted-foreground text-sm">
          Showing the {rows.length} most recent of {total} reviews.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareQuote />
            </EmptyMedia>
            <EmptyTitle>No reviews match your filters</EmptyTitle>
            <EmptyDescription>Try different filters or clear them to see them all.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <AdminTableShell table={table} />
          <ClientTablePagination table={table} />
        </>
      )}

      {/* Full-text drawer */}
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>{selected.authorName}</SheetTitle>
                  <Rating value={selected.rating} />
                </div>
                <SheetDescription>
                  {[selected.authorLocation, selected.tripLabel ?? null]
                    .filter(Boolean)
                    .join(' · ') || 'Traveller review'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={selected.source === 'CURATED' ? 'outline' : 'secondary'}>
                    {selected.source === 'CURATED' ? 'Curated' : 'Verified'}
                  </Badge>
                  <StatusBadges review={selected} />
                </div>

                <Separator />

                <div className="space-y-2">
                  {selected.title ? <p className="font-medium">{selected.title}</p> : null}
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {selected.body}
                  </p>
                </div>

                <Separator />

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Tour</dt>
                    <dd className="text-right">
                      {selected.tourSlug ? (
                        <Link
                          href={`/tours/${selected.tourSlug}`}
                          className="hover:text-primary hover:underline"
                        >
                          {selected.tourTitle ?? selected.tourSlug}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Posted</dt>
                    <dd>{formatRelativeTime(selected.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd>{formatRelativeTime(selected.updatedAt)}</dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => act(selected, 'approve')}
                    disabled={busy}
                    className="w-full"
                  >
                    {selected.isApproved ? <Undo2 className="size-4" /> : <Check className="size-4" />}
                    {selected.isApproved ? 'Unapprove' : 'Approve'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => act(selected, 'feature')}
                    disabled={busy}
                    className="w-full"
                  >
                    {selected.isFeatured ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    {selected.isFeatured ? 'Unfeature' : 'Feature'}
                  </Button>
                  {selected.source === 'CURATED' ? (
                    <Button
                      variant="destructive"
                      onClick={() => setPendingDelete(selected)}
                      disabled={busy}
                      className="w-full"
                    >
                      <Trash2 className="size-4" />
                      Delete testimonial
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete confirm (controlled, outside the menu — Base UI safe) */}
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{pendingDelete?.authorName}”’s testimonial?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the curated testimonial and can’t be undone. Verified
              traveller reviews can’t be deleted — unapprove those to hide them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ReviewsView;
```

- [ ] **Step 2: Rewrite the page** — `app/(admin)/reviews/page.tsx`:

```tsx
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@tourism/ui';

import { apiErrorMessage } from '../../../lib/api/error';
import { AdminListHeader } from '../../../components/crud/list-header';
import { ReviewsView } from '../../../components/reviews/reviews-view';
import { listAdminReviews, type AdminReviewList } from '../../../lib/reviews/data';
import { ErrorAlert } from '../../../components/crud/error-alert';

export default async function ReviewsPage() {
  let result: AdminReviewList | undefined;
  let error: string | null = null;
  try {
    result = await listAdminReviews({ pageSize: 100 });
  } catch (e) {
    error = apiErrorMessage(e);
  }
  const rows = result?.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Reviews"
        description="Approve traveller reviews and pin the best ones (or curated testimonials) to the homepage carousel."
        action={
          <Button nativeButton={false} render={<Link href="/reviews/new" />}>
            <Plus data-icon="inline-start" />
            New testimonial
          </Button>
        }
      />

      {error ? (
        <ErrorAlert>Couldn&apos;t load reviews: {error}.</ErrorAlert>
      ) : (
        <ReviewsView rows={rows} total={result?.meta.total ?? rows.length} />
      )}
    </div>
  );
}
```

- [ ] **Step 3:** Verify + delete the loose-buttons component:

```bash
grep -rn "review-actions\|ReviewActions" apps/admin/src
git rm apps/admin/src/components/reviews/review-actions.tsx
```

Expected: after the page rewrite the only hits were the component file itself.

- [ ] **Step 4:** `pnpm nx build @tourism/admin` — PASS (route list includes `/reviews` + `/reviews/new`).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/reviews apps/admin/src/app/\(admin\)/reviews/page.tsx
git commit -m "feat(admin): reskin Reviews to the shared template + full-text drawer"
```

### Task 5: Curated form → Form Layout 2

**Files:**
- Rewrite: `apps/admin/src/components/reviews/curated-form.tsx`
- Modify: `apps/admin/src/app/(admin)/reviews/new/page.tsx` (container class only)

**Interfaces:**
- Consumes: `createCurated` action (unchanged — field names `authorName/authorLocation/tripLabel/rating/body` must stay).

- [ ] **Step 1: Rewrite `curated-form.tsx`:**

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';

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
  Separator,
  Textarea,
} from '@tourism/ui';

import { createCurated, type CuratedFormState } from '../../lib/reviews/actions';
import { ErrorAlert } from '../crud/error-alert';

const INITIAL: CuratedFormState = {};

/**
 * Create-curated-testimonial form — shadcn "Form Layout 2" (sectioned), matching the other admin
 * forms. The API stores it approved + featured (it's for the homepage). Field names unchanged.
 */
export function CuratedForm() {
  const [state, action, pending] = useActionState(createCurated, INITIAL);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action}>
      {/* Traveller */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Traveller</FieldLegend>
          <FieldDescription>Who the testimonial is from and the trip it refers to.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.authorName)}>
            <FieldLabel htmlFor="authorName">Traveller name</FieldLabel>
            <Input
              id="authorName"
              name="authorName"
              required
              placeholder="Emily Carter"
              aria-invalid={Boolean(errors.authorName)}
            />
            {errors.authorName ? <FieldError>{errors.authorName}</FieldError> : null}
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="authorLocation">Location</FieldLabel>
              <Input id="authorLocation" name="authorLocation" placeholder="Sydney, Australia" />
              <FieldDescription>Optional.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="tripLabel">Trip</FieldLabel>
              <Input id="tripLabel" name="tripLabel" placeholder="Hạ Long Bay Cruise" />
              <FieldDescription>Optional — shown under the name.</FieldDescription>
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <Separator className="my-8" />

      {/* Testimonial */}
      <FieldSet className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <FieldLegend className="mb-1.5 font-semibold">Testimonial</FieldLegend>
          <FieldDescription>Published approved + featured on the homepage carousel.</FieldDescription>
        </div>
        <FieldGroup className="grid grid-cols-1 gap-6 md:col-span-2">
          <Field data-invalid={Boolean(errors.rating)}>
            <FieldLabel htmlFor="rating">Rating</FieldLabel>
            <Input
              id="rating"
              name="rating"
              type="number"
              min={1}
              max={5}
              defaultValue={5}
              className="w-24"
              aria-invalid={Boolean(errors.rating)}
            />
            <FieldDescription>1–5 stars.</FieldDescription>
            {errors.rating ? <FieldError>{errors.rating}</FieldError> : null}
          </Field>
          <Field data-invalid={Boolean(errors.body)}>
            <FieldLabel htmlFor="body">Testimonial</FieldLabel>
            <Textarea
              id="body"
              name="body"
              rows={4}
              required
              placeholder="What made the trip memorable…"
              aria-invalid={Boolean(errors.body)}
            />
            {errors.body ? <FieldError>{errors.body}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.error ? (
        <div className="mt-6">
          <ErrorAlert>{state.error}</ErrorAlert>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/reviews" />}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Create testimonial'}
        </Button>
      </div>
    </form>
  );
}

export default CuratedForm;
```

(If the original form's submit row had different labels, the above supersedes it — but do NOT change the posted field names.)

- [ ] **Step 2:** `app/(admin)/reviews/new/page.tsx` — change the outer container div's className to `mx-auto max-w-4xl space-y-6 px-4 py-6 lg:px-6` (the form-template width; keep the back link + heading structure as-is).

- [ ] **Step 3:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin` — PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/components/reviews/curated-form.tsx apps/admin/src/app/\(admin\)/reviews/new/page.tsx
git commit -m "feat(admin): reskin curated-testimonial form to Form Layout 2"
```

### Task 6: Slice-2 gate + merge + wrap-up

- [ ] **Step 1:** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green.
- [ ] **Step 2:** Self-certify (reskin of reviewed patterns; per-task reviews carry the quality gate).
- [ ] **Step 3:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-reviews-reskin-fe && git push origin main && git branch -d feat/admin-reviews-reskin-fe`.
- [ ] **Step 4:** Wrap-up per the standing workflow: STATUS line on this plan, tick Wave 2 in `docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`, update memory, tell the user what to check on the deploy (tabs/facet/search/drawer/⋮ actions, delete a curated testimonial, tripLabel + tour link visible, reskinned form).
