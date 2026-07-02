# Admin Tours + Departures ops visibility (Wave 5) — implementation plan

**STATUS: COMPLETE (2026-07-02)** — all 3 slices executed via subagent-driven development and
ff-merged to `main`: slice A `5a8f13e` (toursCount BE + list columns sweep; incl. detail-DTO
inheritance drift fix `08648fe`) · slice B `bdaf411` (bookings tourId/departureId filters + the
departure detail page; `ecc:code-reviewer` APPROVE — 2 MEDIUMs fixed pre-merge: real tour currency
+ bookings load-error state) · slice C `6b566a4` (AdminTourDetailDto.ops aggregates + Performance/
Departures-summary/Reviews cards; APPROVE-WITH-NOTES). Gate green per slice; api tests 254, admin
tests 124. **FOLLOW-UP (from the slice-C review):** `Booking` + `Enquiry` lack `@@index([tourId])`
— the ops aggregates + the new `?tourId=` bookings filter seq-scan as data grows; add a small
index migration in a later slice (Wishlist already has one; departureId is indexed).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** List columns sweep (tours thumbnail/rating/next-departure · destinations thumbnail · tours-count on destinations/categories) + a departure detail page with its bookings and utilization + commercial ops cards on the tour detail — per spec `docs/06-specs/2026-07-02-admin-tours-departures-ops-design.md` (Wave 5).

**Architecture:** 3 slices, one branch each. A: tiny BE (`toursCount` via `_count` on two list reads) + pure-FE columns (the tours-list data already ships in `TourSummaryDto`). B: two optional uuid filters on `GET /admin/bookings` + a new read-only `/tours/[slug]/departures/[id]` page. C: `AdminTourDetailDto` with an admin-only `ops` aggregate block + Performance/Departures-summary/Reviews cards on the tour detail.

**Tech Stack:** NestJS 11 + Prisma (api) · Next.js 16 admin · TanStack Table · jest.

## Global Constraints

- **Deploy-lag guards** on every new FE consumer: `toursCount ?? null` → "—"; `ops` optional (cards hidden when absent); bookings-filter page tolerates empty results.
- **Public surface:** public tours/destinations/categories/bookings behavior unchanged; the `toursCount` field is harmless-additive on shared list DTOs; `ops` exists ONLY on the admin tour detail route.
- **AND-composition:** the new bookings `tourId`/`departureId` filters compose with the existing status/search filters (assert in a test).
- Follow the established templates verbatim: detail pages mirror `apps/admin/src/app/(admin)/categories/[slug]/page.tsx`; thumbnail columns mirror the Posts cover column (`apps/admin/src/components/posts/posts-table.tsx:39-57`); utilization bars mirror `components/dashboard/bookings-pipeline.tsx`.
- No hex colors; relative imports; Base UI conventions; Conventional Commits, no AI attribution; do NOT stage unrelated dirty files (docs/*.md, playground.md).
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. Slices B + C → `ecc:code-reviewer`; slice A self-certified if its task reviews are clean. Merging after a green slice is pre-authorized; pause only on CRITICAL/HIGH findings.
- Regen routine (controller runs it inline): boot `pnpm nx serve @tourism/api` in the background → poll `http://localhost:3000/api/docs-json` to 200 → `pnpm nx run @tourism/core:api-types` → verify the diff → kill the server tree via the port-3000 PID → `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` → commit the schema file alone.

---

# Slice A — list columns sweep

Branch off `main`: `git checkout -b feat/admin-ops-columns`

### Task 1: `toursCount` on destinations + categories lists (TDD)

**Files:**
- Modify: `apps/api/src/modules/destinations/destinations.service.ts` (`private list` ~lines 223-256; the `PaginatedDestinations`/items type)
- Modify: `apps/api/src/modules/destinations/dto/destination.dto.ts` (+1 field)
- Modify: `apps/api/src/modules/tour-categories/tour-categories.service.ts` (`private list` ~lines 173-195; items type)
- Modify: `apps/api/src/modules/tour-categories/dto/*.ts` (the category response DTO, +1 field)
- Tests: `apps/api/src/modules/destinations/destinations.service.spec.ts`, `apps/api/src/modules/tour-categories/tour-categories.service.spec.ts`

**Interfaces:**
- Produces: `DestinationDto.toursCount: number` + the category DTO `toursCount: number` — mapped from Prisma `_count` in BOTH shared `list()` internals (public + admin lists both gain it; harmless). Task 2 regenerates and renders.

- [ ] **Step 1: Write the failing tests.** In `destinations.service.spec.ts` append (adapt the service construction to the file's existing `makePrisma`/`makeMedia` helpers — the file already has both):

```ts
  it('list maps the tours count onto each row', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'd1', slug: 'hoi-an', _count: { tours: 4 } },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new DestinationsService(
      makePrisma({ findMany, count }) as never,
      makeMedia() as never,
    );

    const res = await svc.findAll({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      _count: { select: { tours: true } },
    });
    expect(res.items[0].toursCount).toBe(4);
    expect((res.items[0] as unknown as { _count?: unknown })._count).toBeUndefined();
  });
```

In `tour-categories.service.spec.ts` append the analogous test (no media service — match that file's construction pattern):

```ts
  it('list maps the tours count onto each row', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'c1', slug: 'day-trips', _count: { tours: 7 } },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new TourCategoriesService(makePrisma({ findMany, count }) as never);

    const res = await svc.findAll({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      _count: { select: { tours: true } },
    });
    expect(res.items[0].toursCount).toBe(7);
  });
```

(If either spec's `makePrisma` doesn't accept `findMany`/`count` overrides for the right model, extend the helper the way the file already extends it for other tests — zero-default so old tests stay green.)

- [ ] **Step 2:** `pnpm nx test @tourism/api` — the 2 new tests FAIL (include undefined / `toursCount` undefined); everything else passes.

- [ ] **Step 3: Destinations service.** In `list()` add the include to `findMany`:

```ts
        include: { _count: { select: { tours: true } } },
```

and map + strip after the media attach (replace the current `items:` line):

```ts
    const withMedia = await this.media.attachToOwners(MediaOwnerType.DESTINATION, items);
    return {
      items: withMedia.map(({ _count, ...row }) => ({ ...row, toursCount: _count.tours })),
```

Extend the items/`PaginatedDestinations` typing the way the file already types media-attached rows (add `& { toursCount: number }` at the type alias for list items — search `PaginatedDestinations`).

- [ ] **Step 4: Categories service.** Same treatment in its `list()`: add the include, map `({ _count, ...row }) => ({ ...row, toursCount: _count.tours })` over the rows, extend the items type with `toursCount: number`.

- [ ] **Step 5: DTOs.** `destination.dto.ts` — add to `DestinationDto`:

```ts
  @ApiProperty({ example: 4, description: 'Number of tours using this destination' })
  toursCount!: number;
```

Category response DTO (find the class the list `@ApiOkResponse` references, e.g. `TourCategoryDto`) — add:

```ts
  @ApiProperty({ example: 7, description: 'Number of tours in this category' })
  toursCount!: number;
```

- [ ] **Step 6:** `pnpm nx test @tourism/api` — PASS (251 = 249 prior + 2 new).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/destinations apps/api/src/modules/tour-categories
git commit -m "feat(api): toursCount on destination + category lists"
```

### Task 2: Regen + FE columns (tours/destinations/categories)

**Files:**
- Modify (generated): `libs/shared/core/src/lib/api/schema.ts` (regen — controller inline routine)
- Modify: `apps/admin/src/components/tours/tours-table.tsx`
- Modify: `apps/admin/src/components/destinations/destinations-table.tsx`
- Modify: the categories client table (`apps/admin/src/components/categories/categories-table.tsx` — confirm the exact filename with a Glob before editing)

**Interfaces:**
- Consumes: `TourSummaryDto.media/averageRating/reviewsCount/nextDepartureDate/nextDepartureSeatsLeft` (already generated), `toursCount` from Task 1's regen.

- [ ] **Step 1 (controller):** run the regen routine (Global Constraints); verify the diff = `toursCount` on the two DTOs only; commit `chore(core): regen API types (toursCount)`.

- [ ] **Step 2: Tours table** — in `tours-table.tsx` add three hideable columns:

(a) A leading `cover` column BEFORE `title` (mirror `posts-table.tsx:39-57` exactly, with `Compass` as the placeholder icon — already imported):

```tsx
  {
    id: 'cover',
    header: 'Cover',
    meta: { label: 'Cover' },
    cell: ({ row }) => {
      const hero = (row.original.media ?? []).find((m) => m.role === 'hero');
      return hero?.url ? (
        <img
          src={hero.url}
          alt=""
          className="bg-muted aspect-16/10 w-16 rounded-md border object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground grid aspect-16/10 w-16 place-items-center rounded-md border">
          <Compass className="size-4" aria-hidden />
        </div>
      );
    },
  },
```

(b) A `rating` column after `days` (add `Star` to the lucide import):

```tsx
  {
    id: 'rating',
    header: 'Rating',
    meta: { label: 'Rating' },
    cell: ({ row }) =>
      row.original.reviewsCount > 0 ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Star className="size-3.5 fill-current text-amber-500" aria-hidden />
          {row.original.averageRating.toFixed(1)}
          <span className="text-muted-foreground">({row.original.reviewsCount})</span>
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
```

(c) A `nextDeparture` column after `rating`:

```tsx
  {
    id: 'nextDeparture',
    header: 'Next departure',
    meta: { label: 'Next departure' },
    cell: ({ row }) => {
      const d = row.original.nextDepartureDate;
      if (!d) return <span className="text-muted-foreground">—</span>;
      const seats = row.original.nextDepartureSeatsLeft;
      return (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {d}
          {seats !== null && seats !== undefined ? (
            <span className="block text-xs">{seats} seats left</span>
          ) : null}
        </span>
      );
    },
  },
```

- [ ] **Step 3: Destinations table** — add a leading `cover` column (same pattern; use the file's existing empty-state icon import, e.g. `MapPin`/`Globe` — whatever lucide icon the file already imports for its Empty state) + a `tours` column near `status`:

```tsx
  {
    id: 'tours',
    header: 'Tours',
    meta: { label: 'Tours', align: 'right' },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {(row.original as { toursCount?: number }).toursCount ?? '—'}
      </span>
    ),
  },
```

(The cast covers the pre-regen type on a stale checkout; after regen the field is typed — drop the cast if TS accepts the direct access.)

- [ ] **Step 4: Categories table** — add the same `tours` count column (no thumbnail — categories have no media).

- [ ] **Step 5:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin && pnpm nx lint @tourism/admin` — PASS / 0 lint errors.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/components/tours/tours-table.tsx apps/admin/src/components/destinations/destinations-table.tsx apps/admin/src/components/categories
git commit -m "feat(admin): list columns sweep — thumbnails, rating, next departure, tours count"
```

### Task 3: Slice-A gate + merge

- [ ] `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green; self-certify; merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-ops-columns && git push origin main && git branch -d feat/admin-ops-columns`.

---

# Slice B — departure detail page

Branch off `main`: `git checkout -b feat/admin-departure-detail`

### Task 4: Bookings `tourId`/`departureId` filters (TDD)

**Files:**
- Modify: `apps/api/src/modules/bookings/dto/list-admin-bookings-query.dto.ts`
- Modify: `apps/api/src/modules/bookings/bookings.service.ts` (`findAllForAdmin` where-building, lines ~570-585)
- Test: `apps/api/src/modules/bookings/bookings.service.spec.ts`

**Interfaces:**
- Produces: optional `tourId` + `departureId` uuid query params on `GET /admin/bookings`, AND-composed with status/search. Task 5 consumes `departureId` from the FE.

- [ ] **Step 1: Failing test** — append in `bookings.service.spec.ts` (match the file's existing service-construction helpers):

```ts
  it('findAllForAdmin AND-composes departure/tour filters with status', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const svc = makeServiceWithBookingMocks({ findMany, count }); // adapt to the file's helper

    await svc.findAllForAdmin({
      status: BookingStatus.PAID,
      departureId: 'dep-1',
      tourId: 'tour-1',
    } as never);

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe(BookingStatus.PAID);
    expect(where.departureId).toBe('dep-1');
    expect(where.tourId).toBe('tour-1');
  });
```

(If no reusable helper exists in that spec for list mocks, construct the service the way its other `findAllForAdmin` tests do — mirror them.)

- [ ] **Step 2:** red run (`pnpm nx test @tourism/api`).

- [ ] **Step 3: Query DTO** — add `IsUUID` to the class-validator import and append:

```ts
  /** Filter to one tour's bookings. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  /** Filter to one departure's bookings. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departureId?: string;
```

- [ ] **Step 4: Service** — extend the where in `findAllForAdmin`:

```ts
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tourId ? { tourId: query.tourId } : {}),
      ...(query.departureId ? { departureId: query.departureId } : {}),
      ...(search
```

- [ ] **Step 5:** green run; commit `feat(api): tourId/departureId filters on admin bookings list`.

### Task 5: Regen + departure detail page + list link

**Files:**
- Modify (generated): `libs/shared/core/src/lib/api/schema.ts` (regen — controller routine; commit `chore(core): regen API types (bookings tour/departure filters)`)
- Modify: `apps/admin/src/lib/bookings/data.ts` (`BookingListParams` += `tourId?: string; departureId?: string;`, passed through in `listBookings`'s query object)
- Create: `apps/admin/src/app/(admin)/tours/[slug]/departures/[id]/page.tsx`
- Modify: `apps/admin/src/components/departures/departures-table.tsx` (Start cell → link)

**Interfaces:**
- Consumes: `findDeparture(slug, id)` (`lib/departures/data.ts:30`), `listBookings({ departureId, pageSize: 100 })`, `bookingStatusMeta`/`formatMoney`/`formatGuests` (`lib/bookings/format.ts`), `isDeparturePast` (`lib/departures/format.ts`), `deleteDeparture` (`lib/departures/actions.ts` — single-arg-bound like the list does), `formatRelativeTime`.

- [ ] **Step 1:** regen routine + `data.ts` params (two added lines in the interface + two in the query object).

- [ ] **Step 2: Create the page** — read-only detail mirroring the Categories detail structure (`categories/[slug]/page.tsx`) with the per-tour nested context the departures pages keep:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tourism/ui';

import { RowActions } from '../../../../../../components/crud/row-actions';
import { deleteDeparture } from '../../../../../../lib/departures/actions';
import { findDeparture } from '../../../../../../lib/departures/data';
import { isDeparturePast } from '../../../../../../lib/departures/format';
import { listBookings } from '../../../../../../lib/bookings/data';
import { bookingStatusMeta, formatGuests, formatMoney } from '../../../../../../lib/bookings/format';

interface DepartureDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
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

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

export default async function DepartureDetailPage({ params }: DepartureDetailPageProps) {
  const { slug, id } = await params;

  const departure = await findDeparture(slug, id).catch(() => undefined);
  if (!departure) notFound();

  // Bookings on this departure (server-side filter; the set is small — one departure's seats).
  const bookings = await listBookings({ departureId: id, pageSize: 100 }).catch(() => null);
  const rows = bookings?.data ?? [];

  const past = isDeparturePast(departure.startDate);
  const pct =
    departure.seatsTotal > 0 ? Math.round((departure.seatsBooked / departure.seatsTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-6">
      <Link
        href={`/tours/${slug}/departures`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to departures
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Departure — {formatDate(departure.startDate)}
            </h1>
            <Badge variant={STATUS_VARIANT[departure.status] ?? 'secondary'} className="gap-1.5">
              <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
              {departure.status}
            </Badge>
            {past ? <Badge variant="outline">Departed</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {formatDate(departure.startDate)} → {formatDate(departure.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/tours/${slug}/departures/${departure.id}/edit`} />}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          <RowActions
            editHref={`/tours/${slug}/departures/${departure.id}/edit`}
            deleteAction={(depId) => deleteDeparture(slug, depId)}
            deleteId={departure.id}
            deleteTitle="Delete this departure?"
            deleteDescription="This permanently deletes the departure and can’t be undone. You can only delete one with no bookings."
            redirectTo={`/tours/${slug}/departures`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main — bookings on this departure */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                  No bookings on this departure yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((b) => {
                        const meta = bookingStatusMeta(b.status);
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              <Link
                                href={`/bookings/${b.code}`}
                                className="hover:text-primary font-medium hover:underline"
                              >
                                {b.code}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <span className="block">{b.contactName}</span>
                              <span className="text-muted-foreground text-xs">{b.contactEmail}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatGuests(b.numAdults, b.numChildren)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(b.totalAmount, b.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={meta.variant} className="gap-1.5">
                                <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                                {meta.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold tabular-nums">
                {departure.seatsBooked}
                <span className="text-muted-foreground text-base font-normal">
                  {' '}
                  / {departure.seatsTotal} seats
                </span>
              </p>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-muted-foreground text-xs">{pct}% booked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Row label="Start" value={formatDate(departure.startDate)} />
                <Row label="End" value={formatDate(departure.endDate)} />
                <Row label="Status" value={departure.status} />
                <Row
                  label="Price"
                  value={
                    departure.priceOverride
                      ? formatMoney(departure.priceOverride, 'USD')
                      : 'Tour base price'
                  }
                />
                <Row
                  label="Compare-at"
                  value={
                    departure.compareAtPrice ? formatMoney(departure.compareAtPrice, 'USD') : '—'
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

(Verify `bookingStatusMeta`'s return shape in `lib/bookings/format.ts` before use — adapt the badge render to its actual `{ label, variant }` fields; if the departure DTO carries `createdAt/updatedAt`, add Created/Updated `Row`s with `formatRelativeTime` — check the generated type and include them when present.)

- [ ] **Step 3: List link** — in `departures-table.tsx`, wrap the Start-date cell content in a `Link` to `/tours/${slug}/departures/${row.original.id}` (`hover:text-primary font-medium hover:underline`, keep the dimmed-past styling; the component already receives `slug`).

- [ ] **Step 4:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin` — PASS; route list includes `/tours/[slug]/departures/[id]`.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/bookings/data.ts "apps/admin/src/app/(admin)/tours/[slug]/departures/[id]/page.tsx" apps/admin/src/components/departures/departures-table.tsx
git commit -m "feat(admin): departure detail page — bookings, utilization, facts"
```

### Task 6: Slice-B gate + review + merge

- [ ] Gate → green; `ecc:code-reviewer` on the branch diff (filters AND-compose; admin gating; page fetch fan-out acceptable). Fix CRITICAL/HIGH. Merge (pre-authorized).

---

# Slice C — tour detail ops cards

Branch off `main`: `git checkout -b feat/admin-tour-ops`

### Task 7: `AdminTourDetailDto.ops` aggregates (TDD)

**Files:**
- Create: `apps/api/src/modules/tours/dto/admin-tour-detail.dto.ts`
- Modify: `apps/api/src/modules/tours/tours.service.ts` (new `findDetailForAdmin` beside `findBySlug`)
- Modify: `apps/api/src/modules/tours/admin-tours.controller.ts` (`detail` route, lines 54-60)
- Test: `apps/api/src/modules/tours/tours.service.spec.ts`

**Interfaces:**
- Produces: `AdminTourDetail = <findBySlug's return type> & { ops: TourOps }` where `TourOps = { bookingsTotal: number; bookingsPaid: number; revenue: string; wishlistCount: number; enquiriesCount: number }`; Swagger `AdminTourDetailDto extends TourDetailDto` with `ops!: TourOpsDto`. Task 8 renders it.

- [ ] **Step 1: DTO** — `admin-tour-detail.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { TourDetailDto } from './tour-detail.dto';

/** Commercial signals for one tour — admin detail only. */
export class TourOpsDto {
  @ApiProperty({ example: 30, description: 'All bookings ever, any status' })
  bookingsTotal!: number;

  @ApiProperty({ example: 24 })
  bookingsPaid!: number;

  @ApiProperty({ example: '4500.00', description: 'Sum of PAID totals (string Decimal)' })
  revenue!: string;

  @ApiProperty({ example: 42 })
  wishlistCount!: number;

  @ApiProperty({ example: 7 })
  enquiriesCount!: number;
}

/**
 * Admin-only tour detail (`GET /admin/tours/:slug`) — the enriched `TourDetailDto` plus
 * commercial ops aggregates. Public tour reads stay ops-free. Mirrors `AdminPostDetailDto`.
 */
export class AdminTourDetailDto extends TourDetailDto {
  @ApiProperty({ type: TourOpsDto })
  ops!: TourOpsDto;
}
```

(Confirm the base DTO's import path — the tours dto folder holds `TourDetailDto`; adapt the import if the filename differs.)

- [ ] **Step 2: Failing tests** — append in `tours.service.spec.ts` (match its construction helpers; the service takes prisma + media and possibly more — mirror an existing admin-read test):

```ts
  it('findDetailForAdmin attaches ops aggregates', async () => {
    // Arrange: reuse the file's existing findBySlug-style mocks for the base tour read, then:
    // booking.count → 30 (all) and 24 (PAID), booking.aggregate → { _sum: { totalAmount: 4500 } },
    // wishlist.count → 42, enquiry.count → 7.
    // Assert:
    // expect(res.ops).toEqual({
    //   bookingsTotal: 30, bookingsPaid: 24, revenue: '4500', wishlistCount: 42, enquiriesCount: 7,
    // });
  });

  it('findDetailForAdmin ops are zero-safe (no bookings)', async () => {
    // counts 0, aggregate _sum.totalAmount null → revenue '0'
  });
```

Write these as REAL tests against the file's actual helpers (the comments above are the contract; the implementer fills the arrange/act with the spec file's existing mock idioms — every existing test in that file shows the pattern). The assertions must be exactly the two `expect`s described.

- [ ] **Step 3:** red run.

- [ ] **Step 4: Service** — add beside `findBySlug`:

```ts
  /** Admin detail: the enriched tour + commercial ops aggregates. Public reads stay ops-free. */
  async findDetailForAdmin(slug: string): Promise<AdminTourDetail> {
    const tour = await this.findBySlug(slug);
    const [bookingsTotal, bookingsPaid, revenueAgg, wishlistCount, enquiriesCount] =
      await Promise.all([
        this.prisma.booking.count({ where: { tourId: tour.id } }),
        this.prisma.booking.count({ where: { tourId: tour.id, status: BookingStatus.PAID } }),
        this.prisma.booking.aggregate({
          where: { tourId: tour.id, status: BookingStatus.PAID },
          _sum: { totalAmount: true },
        }),
        this.prisma.wishlist.count({ where: { tourId: tour.id } }),
        this.prisma.enquiry.count({ where: { tourId: tour.id } }),
      ]);
    return {
      ...tour,
      ops: {
        bookingsTotal,
        bookingsPaid,
        revenue: (revenueAgg._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
        wishlistCount,
        enquiriesCount,
      },
    };
  }
```

with the matching exported type (`AdminTourDetail = Awaited<ReturnType<ToursService['findBySlug']>> & { ops: {...} }` or the file's explicit-type idiom) and imports (`BookingStatus`, `Prisma` likely already imported).

- [ ] **Step 5: Controller** — `detail()` → `findDetailForAdmin`, `@ApiOkResponse({ type: AdminTourDetailDto })`, summary "Admin: get one tour by slug (enriched + ops)". Public `tours.controller.ts` untouched.

- [ ] **Step 6:** green run; commit `feat(api): admin tour detail ops aggregates`.

### Task 8: Regen + tour detail cards

**Files:**
- Modify (generated): `libs/shared/core/src/lib/api/schema.ts` (regen — controller routine; commit `chore(core): regen API types (tour ops)`)
- Modify: `apps/admin/src/lib/tours/data.ts` (detail fetch type → `AdminTourDetailDto`-shaped; envelope-unwrap stays; loose-guard `ops` optional)
- Modify: `apps/admin/src/app/(admin)/tours/[slug]/page.tsx` (add the cards)

**Interfaces:**
- Consumes: `tour.ops` (optional — deploy-lag), `listDepartures(slug)` (existing), `formatMoney` from `../../lib/bookings/format` (verify signature) or `lib/dashboard/transforms` — use whichever the file already imports for money; `isDeparturePast`.

- [ ] **Step 1:** regen routine; update `lib/tours/data.ts`'s detail type (`export type TourDetail = components['schemas']['AdminTourDetailDto'];` if the file uses the generated type — if it declares a local interface, add `ops?: TourOps` optional).

- [ ] **Step 2: Cards on `/tours/[slug]`** — targeted edits:

(a) Page fetch: alongside the existing detail fetch, fetch `listDepartures(slug).catch(() => [])` server-side (Promise.all).

(b) **Performance card** — insert at the TOP of the rail (before the pricing card):

```tsx
          {tour.ops ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <Row
                    label="Bookings"
                    value={
                      <span className="tabular-nums">
                        {tour.ops.bookingsPaid}
                        <span className="text-muted-foreground"> paid / {tour.ops.bookingsTotal}</span>
                      </span>
                    }
                  />
                  <Row label="Revenue" value={formatMoney(tour.ops.revenue, tour.currency)} />
                  <Row label="Wishlist saves" value={tour.ops.wishlistCount} />
                  <Row label="Enquiries" value={tour.ops.enquiriesCount} />
                </dl>
              </CardContent>
            </Card>
          ) : null}
```

(Reuse the page's existing `Row` helper — the detail page already defines one; if its name differs, match it.)

(c) **Departures summary card** — after the Performance card:

```tsx
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Departures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No upcoming departures — travellers see Private request only.
                </p>
              ) : (
                upcoming.slice(0, 3).map((d) => {
                  const pct =
                    d.seatsTotal > 0 ? Math.round((d.seatsBooked / d.seatsTotal) * 100) : 0;
                  return (
                    <Link
                      key={d.id}
                      href={`/tours/${tour.slug}/departures/${d.id}`}
                      className="hover:bg-muted/60 block space-y-1.5 rounded-lg border p-2.5 transition-colors"
                    >
                      <span className="flex items-center justify-between text-sm">
                        <span className="font-medium">{d.startDate}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {d.seatsBooked}/{d.seatsTotal} seats
                        </span>
                      </span>
                      <span className="bg-muted block h-1 overflow-hidden rounded-full">
                        <span className="bg-primary block h-full rounded-full" style={{ width: `${pct}%` }} />
                      </span>
                    </Link>
                  );
                })
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                nativeButton={false}
                render={<Link href={`/tours/${tour.slug}/departures`} />}
              >
                View all departures
              </Button>
            </CardContent>
          </Card>
```

where `upcoming` is computed above the return: `const upcoming = departures.filter((d) => d.status === 'OPEN' && !isDeparturePast(d.startDate));`.

(d) **Reviews row** — in the existing rating/details rail card add a `Row` (or extend the existing rating display) linking to `/reviews`:

```tsx
                <Row
                  label="Reviews"
                  value={
                    <Link href="/reviews" className="hover:text-primary hover:underline">
                      ★ {tour.averageRating.toFixed(1)} ({tour.reviewsCount})
                    </Link>
                  }
                />
```

(Adapt to the page's actual rating-field names — the enriched detail carries the same `averageRating`/`reviewsCount` as the summary; if the page already renders a rating card, add ONLY the link affordance rather than duplicating.)

- [ ] **Step 3:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin` — PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/tours/data.ts "apps/admin/src/app/(admin)/tours/[slug]/page.tsx"
git commit -m "feat(admin): tour detail ops cards — performance, departures summary, reviews link"
```

### Task 9: Slice-C gate + review + merge + wrap-up

- [ ] Gate → green; `ecc:code-reviewer` on the branch diff (aggregate correctness/zero-safety; public tours untouched; fan-out cost acceptable on a detail page). Fix CRITICAL/HIGH. Merge (pre-authorized).
- [ ] Wrap-up: STATUS line on this plan, tick Wave 5 in the roadmap, update memory, tell the user what to check on the deploy (list columns · departure detail via the Start-date link · tour detail Performance/Departures cards).
