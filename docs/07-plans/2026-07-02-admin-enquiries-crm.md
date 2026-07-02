# Admin Enquiries CRM upgrade (Wave 3) — implementation plan

**STATUS: COMPLETE (2026-07-02)** — both slices executed via subagent-driven development and
ff-merged to `main`: slice 1 `71127da` (EnquiryDto +7 fields, tour join + flat mapper, server-side
`search` OR name/email/phone/message; `ecc:code-reviewer` APPROVE — PII admin-only, parameterized
search, mapper strips the raw join) · slice 2 `063fb41` (URL-driven `?q=` search, drawer "Trip
details" block, tour title link, lead age). Gate green per slice; api tests 248, admin tests 122.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the five captured-but-hidden lead-qualification fields + the tour title/link in the Enquiries drawer, make search server-side (name/email/phone/message), and show lead age — per spec `docs/06-specs/2026-07-02-admin-enquiries-crm-design.md` (Wave 3).

**Architecture:** 2 slices. Slice 1 is additive BE: `EnquiryDto` grows 7 fields (5 qualification + `tourSlug`/`tourTitle`), the admin list gains a tour join + flat mapper and an OR `search` filter; regen. Slice 2 upgrades `enquiries-view.tsx` in place (URL-driven `?q=`, drawer "Trip details" block, tour link, lead age) — the frame (tabs/pagination/drawer/status Select) stays.

**Tech Stack:** NestJS 11 + Prisma (api) · Next.js 16 admin · `@tourism/ui` · jest.

## Global Constraints

- **Public surface untouched:** `EnquiryService.create` + the public enquiry controller must not change; only `findAllForAdmin` grows the mapper/search.
- **Deploy-lag guards** (Render lags Vercel): FE reads `selected.tourTitle ?? …` fallback chain, `selected.interests?.length ?? 0`, conditional rows for every new field.
- **URL state discipline:** `?q=` changes reset `?page=` (same as status changes already do).
- Prisma `contains` + `mode: 'insensitive'` — parameterized, no raw SQL.
- No hex colors; relative imports; Base UI conventions; Conventional Commits, no AI attribution.
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. Slice 1 → `ecc:code-reviewer`. Merging after a green slice is pre-authorized; pause only on CRITICAL/HIGH findings. Do NOT stage unrelated dirty files (docs/*.md, playground.md).

---

# Slice 1 — BE: DTO + tour join + server search

Branch off `main`: `git checkout -b feat/admin-enquiries-crm-be`

### Task 1: `EnquiryDto` fields + service mapper/search (TDD)

**Files:**
- Modify: `apps/api/src/modules/enquiry/dto/enquiry.dto.ts` (after `tourId`, ~line 29)
- Modify: `apps/api/src/modules/enquiry/dto/list-enquiries-query.dto.ts`
- Modify: `apps/api/src/modules/enquiry/enquiry.service.ts` (`PaginatedEnquiries` type ~line 7, `findAllForAdmin` ~lines 74-101)
- Test: `apps/api/src/modules/enquiry/enquiry.service.spec.ts`

**Interfaces:**
- Produces: `EnquiryDto` += `nationality/travelDate/groupSize/budgetTier/interests/tourSlug/tourTitle`; `ListEnquiriesQueryDto.search?: string`; service `AdminEnquiryItem = Enquiry & { tourSlug: string | null; tourTitle: string | null }` with `PaginatedEnquiries.items: AdminEnquiryItem[]`. Task 2 regenerates FE types.

- [ ] **Step 1: Write the failing tests** — append inside the existing `describe` in `enquiry.service.spec.ts` (the file's `makePrisma({ findMany, count })` helper + `as never` cast is already there; add `EnquiryStatus` to the `@prisma/client` import if missing):

```ts
  it('findAllForAdmin joins the tour and maps qualification fields through', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'e-1',
        name: 'Jane',
        email: 'jane@example.com',
        phone: null,
        message: 'Sapa trek?',
        tourId: 't-1',
        nationality: 'United Kingdom',
        travelDate: new Date('2026-08-01'),
        groupSize: 4,
        budgetTier: '$1000–$2000',
        interests: ['culture'],
        status: EnquiryStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        tour: { slug: 'sapa-trek', title: 'Sapa Trek 3D2N' },
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const svc = new EnquiryService(makePrisma({ findMany, count }) as never);

    const res = await svc.findAllForAdmin({});

    expect(findMany.mock.calls[0][0].include).toEqual({
      tour: { select: { slug: true, title: true } },
    });
    const item = res.items[0];
    expect(item.tourSlug).toBe('sapa-trek');
    expect(item.tourTitle).toBe('Sapa Trek 3D2N');
    expect(item.nationality).toBe('United Kingdom');
    expect((item as unknown as { tour?: unknown }).tour).toBeUndefined();
  });

  it('findAllForAdmin builds a case-insensitive OR search across name/email/phone/message', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const svc = new EnquiryService(makePrisma({ findMany, count }) as never);

    await svc.findAllForAdmin({ status: EnquiryStatus.NEW, search: ' sapa ' });

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe(EnquiryStatus.NEW);
    expect(where.OR).toEqual([
      { name: { contains: 'sapa', mode: 'insensitive' } },
      { email: { contains: 'sapa', mode: 'insensitive' } },
      { phone: { contains: 'sapa', mode: 'insensitive' } },
      { message: { contains: 'sapa', mode: 'insensitive' } },
    ]);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm nx test @tourism/api`
Expected: both new tests FAIL (`search` not a known property / include undefined / `tourSlug` undefined); everything else passes.

- [ ] **Step 3: DTO fields** — in `enquiry.dto.ts`, after the `tourId` property add:

```ts
  @ApiProperty({ nullable: true, type: String, example: 'ha-long-bay-cruise' })
  tourSlug!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'Hạ Long Bay Cruise 2D1N' })
  tourTitle!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'United Kingdom' })
  nationality!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  travelDate!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 4 })
  groupSize!: number | null;

  @ApiProperty({ nullable: true, type: String, example: '$1000–$2000' })
  budgetTier!: string | null;

  @ApiProperty({ type: [String], example: ['culture', 'food'] })
  interests!: string[];
```

- [ ] **Step 4: Query DTO** — in `list-enquiries-query.dto.ts` extend the class-validator import with `IsString, MaxLength` and append:

```ts
  /** Free-text search across name, email, phone, and message (case-insensitive). */
  @ApiPropertyOptional({ example: 'sapa', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
```

- [ ] **Step 5: Service** — in `enquiry.service.ts` replace the `PaginatedEnquiries` interface with:

```ts
/** Admin CRM row — the enquiry plus its (optional) tour's display fields, flattened. */
export type AdminEnquiryItem = Enquiry & {
  tourSlug: string | null;
  tourTitle: string | null;
};

export interface PaginatedEnquiries {
  items: AdminEnquiryItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
```

and replace `findAllForAdmin`'s body with:

```ts
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where: Prisma.EnquiryWhereInput = {
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tour: { select: { slug: true, title: true } } },
      }),
      this.prisma.enquiry.count({ where }),
    ]);

    const items: AdminEnquiryItem[] = rows.map(({ tour, ...row }) => ({
      ...row,
      tourSlug: tour?.slug ?? null,
      tourTitle: tour?.title ?? null,
    }));

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
```

(Update the method's doc comment to mention the tour join + search. The admin controller's `Promise<PaginatedEnquiries>` return type flows through — no controller edit needed.)

- [ ] **Step 6: Run to verify green**

Run: `pnpm nx test @tourism/api`
Expected: PASS (248 = 246 prior + 2 new).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/enquiry
git commit -m "feat(api): admin enquiries expose qualification fields + tour join + search"
```

### Task 2: Regen types + slice-1 gate/review/merge

- [ ] **Step 1:** Boot the API (`pnpm nx serve @tourism/api` background; poll `http://localhost:3000/api/docs-json` to 200, up to 90s), `pnpm nx run @tourism/core:api-types`, kill the server tree (PID via port 3000; confirm port free).
- [ ] **Step 2:** Verify the schema diff: `EnquiryDto` gains the 7 fields; `search` appears on the list operation's query params. Nothing else.
- [ ] **Step 3:** `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` — PASS.
- [ ] **Step 4:** Commit: `git add libs/shared/core/src/lib/api/schema.ts && git commit -m "chore(core): regen API types (enquiry qualification + search)"`.
- [ ] **Step 5:** Gate → green; dispatch `ecc:code-reviewer` on the branch diff (angles: search where-building is parameterized + AND-composes with status; public create path untouched; no PII added to any public surface — EnquiryDto is admin-only, verify the public controller only returns `EnquiryAckDto`). Fix CRITICAL/HIGH.
- [ ] **Step 6:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-enquiries-crm-be && git push origin main && git branch -d feat/admin-enquiries-crm-be`.

---

# Slice 2 — Admin FE: server search + Trip details + tour link + lead age

Branch off `main`: `git checkout -b feat/admin-enquiries-crm-fe`

### Task 3: Wire `?q=` + upgrade the drawer + lead age

**Files:**
- Modify: `apps/admin/src/lib/enquiries/data.ts`
- Modify: `apps/admin/src/app/(admin)/enquiries/page.tsx`
- Modify: `apps/admin/src/components/enquiries/enquiries-view.tsx`

**Interfaces:**
- Consumes: regenerated `EnquiryDto` (7 new fields), `listEnquiries` gains `search?: string`.
- Produces: `EnquiriesView({ rows, status, meta, query })` — new `query: string` prop (the active server-side search).

- [ ] **Step 1:** `lib/enquiries/data.ts` — add `search?: string;` to `EnquiryListParams`, pass `search: params.search,` in the query object, and update the function doc comment (search is now server-side; drop the "no server `search`" sentence).

- [ ] **Step 2:** `app/(admin)/enquiries/page.tsx` — extend `searchParams` with `q?: string`:

```ts
  searchParams: Promise<{ status?: string; page?: string; pageSize?: string; q?: string }>;
```

read + pass it:

```ts
  const q = (sp.q ?? '').trim();
  // …
    result = await listEnquiries({ page, pageSize, status, search: q || undefined });
```

and pass the prop: `<EnquiriesView rows={result.data} status={status ?? 'all'} meta={result.meta} query={q} />`.

- [ ] **Step 3:** `enquiries-view.tsx` — apply these targeted edits:

(a) Imports: add `Link` from `next/link`; add `formatRelativeTime` from `../../lib/relative-time`; drop `useMemo` from the react import (it becomes unused after (d)).

(b) Props — replace the component signature's props block:

```ts
export function EnquiriesView({
  rows,
  status,
  meta,
  query,
}: {
  rows: Enquiry[];
  status: TabValue;
  meta: PageMeta;
  query: string;
}) {
```

(c) State — replace `const [query, setQuery] = useState('');` with a draft synced from the URL:

```ts
  const [draft, setDraft] = useState(query);

  // Keep the box in step with back/forward navigation.
  useEffect(() => {
    setDraft(query);
  }, [query]);
```

(d) Delete the `filtered` `useMemo` block entirely; every later `filtered` reference becomes `rows` (the table `data: rows`, the empty-state condition `rows.length === 0`).

(e) `pushParams` — extend the changes type and handling:

```ts
  const pushParams = (changes: { status?: TabValue; page?: number; q?: string }) => {
    const next = new URLSearchParams(params.toString());
    if (changes.status !== undefined) {
      if (changes.status === 'all') next.delete('status');
      else next.set('status', changes.status);
      next.delete('page');
    }
    if (changes.q !== undefined) {
      const q = changes.q.trim();
      if (q === '') next.delete('q');
      else next.set('q', q);
      next.delete('page');
    }
    if (changes.page !== undefined) {
      if (changes.page <= 1) next.delete('page');
      else next.set('page', String(changes.page));
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
```

(f) Search box — wrap in a submit form (replace the current `<div className="relative w-full sm:max-w-xs">…</div>` around the search input):

```tsx
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pushParams({ q: draft });
            }}
            className="relative w-full sm:max-w-xs"
          >
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search name, email, phone, message…"
              aria-label="Search enquiries"
              className="bg-background pl-8"
            />
          </form>
```

(g) Count line — append the active-query indicator with a Clear affordance:

```tsx
      <p className="text-muted-foreground text-sm">
        {meta.total} {meta.total === 1 ? 'enquiry' : 'enquiries'}
        {status !== 'all' ? ` · ${enquiryStatusMeta(status).label.toLowerCase()}` : ''}
        {query ? (
          <>
            {' · matching “'}
            {query}
            {'” — '}
            <button
              type="button"
              onClick={() => pushParams({ q: '' })}
              className="text-primary cursor-pointer hover:underline"
            >
              clear
            </button>
          </>
        ) : null}
      </p>
```

(h) Empty state copy — the `query`-conditional description becomes server-wide:

```tsx
              {query
                ? 'Nothing matches your search.'
                : 'Leads from the contact, plan-trip, and private-departure forms will appear here.'}
```

(i) Received column — add the lead-age line under the timestamp:

```tsx
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums whitespace-nowrap">
        {receivedAt(row.original.createdAt)}
        <span className="block text-xs">{formatRelativeTime(row.original.createdAt)}</span>
      </span>
    ),
```

(j) Drawer SheetDescription — add the relative suffix:

```tsx
                <SheetDescription>
                  Received {receivedAt(selected.createdAt)} ·{' '}
                  {formatRelativeTime(selected.createdAt)}
                </SheetDescription>
```

(k) Contact block "About a tour" row — replace the `<dd>` with the tour link + deploy-lag fallback:

```tsx
                      <dd className="text-right">
                        {selected.tourSlug ? (
                          <Link
                            href={`/tours/${selected.tourSlug}`}
                            className="hover:text-primary hover:underline"
                          >
                            {selected.tourTitle ?? selected.tourSlug}
                          </Link>
                        ) : selected.tourId ? (
                          'Yes'
                        ) : (
                          'General enquiry'
                        )}
                      </dd>
```

(l) Trip details block — insert between the Contact block's closing `</div>` and the `<Separator />` above the Message block:

```tsx
                {selected.nationality ||
                selected.travelDate ||
                selected.groupSize ||
                selected.budgetTier ||
                (selected.interests?.length ?? 0) > 0 ? (
                  <>
                    <Separator />

                    {/* Trip details (lead qualification — only rows that were sent) */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Trip details</p>
                      <dl className="space-y-2 text-sm">
                        {selected.nationality ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Nationality</dt>
                            <dd>{selected.nationality}</dd>
                          </div>
                        ) : null}
                        {selected.travelDate ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Travel date</dt>
                            <dd>
                              {new Date(selected.travelDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </dd>
                          </div>
                        ) : null}
                        {selected.groupSize ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Group size</dt>
                            <dd>
                              {selected.groupSize}{' '}
                              {selected.groupSize === 1 ? 'traveller' : 'travellers'}
                            </dd>
                          </div>
                        ) : null}
                        {selected.budgetTier ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Budget</dt>
                            <dd>{selected.budgetTier}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {(selected.interests?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selected.interests.map((interest) => (
                            <Badge key={interest} variant="outline">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
```

(m) Component doc comment — update: search is server-side via `?q=` now.

- [ ] **Step 4:** `pnpm nx test @tourism/admin && pnpm nx build @tourism/admin` — PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/enquiries/data.ts "apps/admin/src/app/(admin)/enquiries/page.tsx" apps/admin/src/components/enquiries/enquiries-view.tsx
git commit -m "feat(admin): enquiries server search + trip details drawer + lead age"
```

### Task 4: Slice-2 gate + merge + wrap-up

- [ ] **Step 1:** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` → green.
- [ ] **Step 2:** Self-certify (in-frame upgrade of the reviewed Enquiries pattern; per-task review carries quality).
- [ ] **Step 3:** Merge (pre-authorized): `git checkout main && git merge --ff-only feat/admin-enquiries-crm-fe && git push origin main && git branch -d feat/admin-enquiries-crm-fe`.
- [ ] **Step 4:** Wrap-up: STATUS line on this plan, tick Wave 3 in the roadmap, update memory, tell the user what to check (search whole dataset from any page · drawer Trip details on a private-departure lead · tour title link · lead age).
