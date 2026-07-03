# Admin Media library (Wave 7) — implementation plan

**STATUS: COMPLETE (2026-07-02)** — both slices executed via subagent-driven development and
ff-merged to `main`: slice 1 `2fc8a61` (AdminMediaModule: list w/ owner resolution + owner-aware
search · delete w/ USER-block + atomic garbage queue · garbage list · reconcile-now + regen;
`ecc:code-reviewer` APPROVE-WITH-NOTES) · slice 2 `909ca08` (`/media` page: grid + facets +
search + drawer + delete · Garbage tab + Run-cleanup-now · sidebar unlocked). Gate green per
slice; api tests 266, admin tests 131. **FOLLOW-UPS (from reviews, all non-blocking):**
reconcile double-run → cosmetic P2025 `failed`/`attempts` noise (self-healing; FE disables the
button while running) · search owner-lookups have no `take` cap (perf cliff only at large
catalogs) · no HTTP-layer 403 test for the new routes (class-level RolesGuard verified by
inspection). Deviation on record: plain `<img>` instead of `next/image` (no Cloudinary
remotePatterns in admin next.config; matches `DestinationMediaView`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New admin surface `/media` — browse/search/delete every `MediaAsset` (grid + detail drawer, owner resolved to a real title/link) plus a Garbage tab exposing the deferred-Cloudinary-destroy queue with an on-demand "Run cleanup now". Per spec `docs/06-specs/2026-07-02-admin-media-library-design.md` (Wave 7, final wave of the enrichment roadmap).

**Architecture:** 2 slices. Slice 1: new `AdminMediaModule` (controller + `AdminMediaService`) beside the existing `MediaModule` — list with polymorphic owner resolution, single-asset detach (atomic batch `$transaction`, garbage rows mirroring `recordGarbage` semantics), garbage list, and a reconcile passthrough to `MaintenanceService` (imported via `JobsModule` — AdminMedia→Jobs→Media is acyclic; importing JobsModule from MediaModule would cycle). Slice 2: `/media` page — Library tab (grid + facets + search + drawer + delete) and Garbage tab (compact table + Run now), sidebar unlocked.

**Tech Stack:** NestJS 11 + Prisma 7 (api) · Next.js 16 admin · jest.

## Global Constraints

- **PII/payloads:** nothing beyond `MediaAsset`/`MediaGarbage` columns is exposed; USER-owned assets (customer avatars) are NOT deletable (`409 MEDIA_USER_OWNED`).
- **Public surface unchanged:** no change to `MediaService`, public reads, or owner forms.
- **Pooler:** batch `$transaction([...])` only (array form), `Promise.all` for parallel reads — never an interactive `$transaction(async tx => ...)` in the new code.
- **Reuse, don't fork:** delivery URLs via the existing `buildCloudinaryUrl` (`apps/api/src/lib/cloudinary-url.ts`); reconcile via the existing `MaintenanceService.reconcileMedia()` (exported by `JobsModule`); no new Cloudinary code.
- Straight quotes in code; do NOT change quote style of existing copy (recurring implementer gotcha); JSX apostrophes follow each file's conventions; no hex colors; relative imports; Base UI `render` prop (no asChild).
- Conventional Commits, no AI attribution; never stage unrelated dirty files (`docs/07-plans/*.md` linter-touched, `playground.md`).
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile` (build is the admin TS gate). Baselines: api 257 tests, admin 127.
- SDD routing: haiku = transcription, sonnet = reasoning + ALL task reviewers; `ecc:code-reviewer` on slice 1. Merging a green slice to `main` is pre-authorized; pause on CRITICAL/HIGH only.
- Regen routine (controller runs inline, slice 1): background `pnpm nx serve @tourism/api` → poll `http://localhost:3000/api/docs-json` to 200 → verify the new paths/DTOs appear in the JSON → `pnpm nx run @tourism/core:api-types` → eyeball diff → kill the port-3000 process tree → `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` → commit `libs/shared/core/src/lib/api/schema.ts` alone (`chore(core): regen API types (admin media library)`).

---

# Slice 1 — BE: admin media endpoints

Branch off `main`: `git checkout -b feat/admin-media-library-be`

### Task 1: `AdminMediaService.list` — filters, search, owner resolution (TDD)

**Files:**

- Create: `apps/api/src/modules/media/admin-media.service.ts`
- Create: `apps/api/src/modules/media/dto/list-admin-media-query.dto.ts`
- Test: `apps/api/src/modules/media/admin-media.service.spec.ts` (new file)

**Interfaces:**

- Consumes: `buildCloudinaryUrl(cloudName, { type, publicId, posterId })` from `../../lib/cloudinary-url` · global `PrismaService` · `ConfigService` (`cloudinary.cloudName`) · `MaintenanceService` from `../jobs/maintenance.service` (constructor-injected now, used in Task 2).
- Produces (Tasks 2–3 build on these exact names):
  - `export interface AdminMediaAsset { id: string; publicId: string; url: string; posterUrl: string | null; type: MediaType; role: MediaRole; format: string | null; width: number | null; height: number | null; bytes: number | null; durationSec: number | null; sortOrder: number; createdAt: string; ownerType: MediaOwnerType; ownerId: string; ownerTitle: string | null; ownerSlug: string | null }`
  - `export interface PaginatedAdminMedia { items: AdminMediaAsset[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }`
  - `list(query: ListAdminMediaQueryDto): Promise<PaginatedAdminMedia>`

- [ ] **Step 1: Query DTO.** Create `apps/api/src/modules/media/dto/list-admin-media-query.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query string for `GET /admin/media` (admin media library). Pagination plus
 * optional owner-type / role / media-type filters and a free-text `search`
 * (matched against the Cloudinary publicId and the owning record's title/name).
 * Newest first.
 */
export class ListAdminMediaQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** Filter by owning record kind; omit for all. */
  @ApiPropertyOptional({ enum: MediaOwnerType })
  @IsOptional()
  @IsEnum(MediaOwnerType)
  ownerType?: MediaOwnerType;

  /** Filter by slot (hero / gallery / avatar); omit for all. */
  @ApiPropertyOptional({ enum: MediaRole })
  @IsOptional()
  @IsEnum(MediaRole)
  role?: MediaRole;

  /** Filter by media kind (image / video); omit for all. */
  @ApiPropertyOptional({ enum: MediaType })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  /** Case-insensitive match on publicId OR owner title/name; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'hoi an', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
```

- [ ] **Step 2: Write the failing tests.** Create `apps/api/src/modules/media/admin-media.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MaintenanceService } from '../jobs/maintenance.service';
import { AdminMediaService } from './admin-media.service';

interface Mocks {
  mediaAsset?: Record<string, unknown>;
  mediaGarbage?: Record<string, unknown>;
  tour?: Record<string, unknown>;
  destination?: Record<string, unknown>;
  post?: Record<string, unknown>;
  user?: Record<string, unknown>;
  $transaction?: jest.Mock;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    mediaAsset: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn(),
      ...m.mediaAsset,
    },
    mediaGarbage: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createMany: jest.fn(),
      ...m.mediaGarbage,
    },
    tour: { findMany: jest.fn().mockResolvedValue([]), ...m.tour },
    destination: { findMany: jest.fn().mockResolvedValue([]), ...m.destination },
    post: { findMany: jest.fn().mockResolvedValue([]), ...m.post },
    user: { findMany: jest.fn().mockResolvedValue([]), ...m.user },
    $transaction: m.$transaction ?? jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
}

function makeConfig() {
  return {
    getOrThrow: jest.fn().mockReturnValue('demo-cloud'),
  } as unknown as import('@nestjs/config').ConfigService;
}

function makeMaintenance(over: Record<string, unknown> = {}) {
  return {
    reconcileMedia: jest.fn().mockResolvedValue({ destroyed: 2, failed: 1 }),
    ...over,
  } as unknown as MaintenanceService;
}

function svcWith(prisma: PrismaService, maintenance = makeMaintenance()): AdminMediaService {
  return new AdminMediaService(prisma, makeConfig(), maintenance);
}

const IMAGE_ROW = {
  id: 'asset-1',
  publicId: 'tourism/tours/hero/123-hoi-an',
  type: MediaType.IMAGE,
  ownerType: MediaOwnerType.TOUR,
  ownerId: 'tour-1',
  role: MediaRole.hero,
  format: 'jpg',
  width: 1920,
  height: 1080,
  durationSec: null,
  posterId: null,
  bytes: 245000,
  sortOrder: 0,
  createdAt: new Date('2026-07-01T10:00:00Z'),
  updatedAt: new Date('2026-07-01T10:00:00Z'),
};

describe('AdminMediaService', () => {
  describe('list', () => {
    it('maps rows with built URLs and resolved owner title/slug', async () => {
      const findMany = jest.fn().mockResolvedValue([IMAGE_ROW]);
      const count = jest.fn().mockResolvedValue(1);
      const tourFindMany = jest
        .fn()
        .mockResolvedValue([{ id: 'tour-1', title: 'Hoi An Walking Tour', slug: 'hoi-an' }]);
      const prisma = makePrisma({
        mediaAsset: { findMany, count },
        tour: { findMany: tourFindMany },
      });

      const res = await svcWith(prisma).list({});

      expect(res.meta.total).toBe(1);
      expect(res.items[0]).toEqual({
        id: 'asset-1',
        publicId: 'tourism/tours/hero/123-hoi-an',
        url: 'https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto/tourism/tours/hero/123-hoi-an',
        posterUrl: null,
        type: MediaType.IMAGE,
        role: MediaRole.hero,
        format: 'jpg',
        width: 1920,
        height: 1080,
        bytes: 245000,
        durationSec: null,
        sortOrder: 0,
        createdAt: '2026-07-01T10:00:00.000Z',
        ownerType: MediaOwnerType.TOUR,
        ownerId: 'tour-1',
        ownerTitle: 'Hoi An Walking Tour',
        ownerSlug: 'hoi-an',
      });
      // Newest first + pagination applied.
      expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
      expect(findMany.mock.calls[0][0].take).toBe(20);
    });

    it('resolves USER owners to fullName/email with a null slug', async () => {
      const row = {
        ...IMAGE_ROW,
        id: 'asset-2',
        ownerType: MediaOwnerType.USER,
        ownerId: 'user-1',
        role: MediaRole.avatar,
      };
      const prisma = makePrisma({
        mediaAsset: { findMany: jest.fn().mockResolvedValue([row]), count: jest.fn().mockResolvedValue(1) },
        user: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'user-1', fullName: null, email: 'jane@example.com' }]),
        },
      });

      const res = await svcWith(prisma).list({});

      expect(res.items[0].ownerTitle).toBe('jane@example.com');
      expect(res.items[0].ownerSlug).toBeNull();
    });

    it('AND-composes ownerType/role/type filters', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({ mediaAsset: { findMany, count: jest.fn().mockResolvedValue(0) } });

      await svcWith(prisma).list({
        ownerType: MediaOwnerType.DESTINATION,
        role: MediaRole.gallery,
        type: MediaType.IMAGE,
      } as never);

      const where = findMany.mock.calls[0][0].where;
      expect(where.ownerType).toBe(MediaOwnerType.DESTINATION);
      expect(where.role).toBe(MediaRole.gallery);
      expect(where.type).toBe(MediaType.IMAGE);
    });

    it('search ORs publicId with owner-title matches resolved per type', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const tourFindMany = jest.fn().mockResolvedValue([{ id: 'tour-9' }]);
      const prisma = makePrisma({
        mediaAsset: { findMany, count: jest.fn().mockResolvedValue(0) },
        tour: { findMany: tourFindMany },
      });

      await svcWith(prisma).list({ search: 'hoi an' } as never);

      // Owner-id lookup queried tours by title.
      expect(tourFindMany.mock.calls[0][0].where.title).toEqual({
        contains: 'hoi an',
        mode: 'insensitive',
      });
      const or = findMany.mock.calls[0][0].where.OR;
      expect(or[0]).toEqual({ publicId: { contains: 'hoi an', mode: 'insensitive' } });
      expect(or).toContainEqual({
        ownerType: MediaOwnerType.TOUR,
        ownerId: { in: ['tour-9'] },
      });
      // Types with no matching owners contribute no clause (destination/post/user mocks return []).
      expect(or).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 3: Run to verify they fail.**

Run: `pnpm nx test @tourism/api`
Expected: the new suite FAILS (`AdminMediaService` module not found); existing 257 pass.

- [ ] **Step 4: Implement.** Create `apps/api/src/modules/media/admin-media.service.ts`:

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MediaOwnerType,
  MediaRole,
  MediaType,
  Prisma,
} from '@prisma/client';
import { buildCloudinaryUrl } from '../../lib/cloudinary-url';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MaintenanceService,
  ReconcileResult,
} from '../jobs/maintenance.service';
import { ListAdminMediaQueryDto } from './dto/list-admin-media-query.dto';

/** One library row — an owned asset with built URLs + its resolved owner. */
export interface AdminMediaAsset {
  id: string;
  publicId: string;
  url: string;
  posterUrl: string | null;
  type: MediaType;
  role: MediaRole;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  durationSec: number | null;
  sortOrder: number;
  createdAt: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  /** Owning record's title/name — null when the owner row no longer exists. */
  ownerTitle: string | null;
  /** Owner page slug (tour/destination/post); null for USER owners. */
  ownerSlug: string | null;
}

export interface PaginatedAdminMedia {
  items: AdminMediaAsset[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Ack for a library delete. */
export interface DeletedMediaAsset {
  id: string;
  publicId: string;
}

/** One `media_garbage` queue row (deferred Cloudinary destroy). */
export interface MediaGarbageRow {
  id: string;
  publicId: string;
  resourceType: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export interface PaginatedMediaGarbage {
  items: MediaGarbageRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Resolved owner display data, keyed `${ownerType}:${ownerId}`. */
type OwnerMap = Map<string, { title: string; slug: string | null }>;

/**
 * Admin media library reads + per-asset detach. Lives BESIDE `MediaService`
 * (which stays the owner-sync unit used by tour/destination/post forms):
 * this service is cross-owner — list/search over every asset, resolve the
 * polymorphic owner to a display title/slug, detach one asset into the
 * garbage queue, and surface/trigger the reconcile cron.
 */
@Injectable()
export class AdminMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly maintenance: MaintenanceService,
  ) {}

  async list(query: ListAdminMediaQueryDto): Promise<PaginatedAdminMedia> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const where: Prisma.MediaAssetWhereInput = {
      ...(query.ownerType ? { ownerType: query.ownerType } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(search ? { OR: await this.searchClauses(search) } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    const owners = await this.resolveOwners(rows);
    const cloudName = this.config.getOrThrow<string>('cloudinary.cloudName');

    return {
      items: rows.map((a) => {
        const urls = buildCloudinaryUrl(cloudName, {
          type: a.type,
          publicId: a.publicId,
          posterId: a.posterId,
        });
        const owner = owners.get(`${a.ownerType}:${a.ownerId}`);
        return {
          id: a.id,
          publicId: a.publicId,
          url: urls.url,
          posterUrl: urls.posterUrl ?? null,
          type: a.type,
          role: a.role,
          format: a.format,
          width: a.width,
          height: a.height,
          bytes: a.bytes,
          durationSec: a.durationSec,
          sortOrder: a.sortOrder,
          createdAt: a.createdAt.toISOString(),
          ownerType: a.ownerType,
          ownerId: a.ownerId,
          ownerTitle: owner?.title ?? null,
          ownerSlug: owner?.slug ?? null,
        };
      }),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * OR clauses for `search`: publicId contains, plus "belongs to an owner whose
   * title/name matches" — matching owner ids are resolved first with four
   * parallel indexed lookups (no polymorphic join exists).
   */
  private async searchClauses(
    search: string,
  ): Promise<Prisma.MediaAssetWhereInput[]> {
    const contains = { contains: search, mode: 'insensitive' as const };
    const [tours, destinations, posts, users] = await Promise.all([
      this.prisma.tour.findMany({ where: { title: contains }, select: { id: true } }),
      this.prisma.destination.findMany({ where: { name: contains }, select: { id: true } }),
      this.prisma.post.findMany({ where: { title: contains }, select: { id: true } }),
      this.prisma.user.findMany({
        where: { OR: [{ fullName: contains }, { email: contains }] },
        select: { id: true },
      }),
    ]);

    const clauses: Prisma.MediaAssetWhereInput[] = [{ publicId: contains }];
    const byType: Array<[MediaOwnerType, Array<{ id: string }>]> = [
      [MediaOwnerType.TOUR, tours],
      [MediaOwnerType.DESTINATION, destinations],
      [MediaOwnerType.POST, posts],
      [MediaOwnerType.USER, users],
    ];
    for (const [ownerType, matches] of byType) {
      if (matches.length) {
        clauses.push({ ownerType, ownerId: { in: matches.map((m) => m.id) } });
      }
    }
    return clauses;
  }

  /** Batch-resolves owner display data for the page's rows (≤4 queries). */
  private async resolveOwners(
    rows: Array<{ ownerType: MediaOwnerType; ownerId: string }>,
  ): Promise<OwnerMap> {
    const idsByType = new Map<MediaOwnerType, Set<string>>();
    for (const r of rows) {
      const set = idsByType.get(r.ownerType) ?? new Set<string>();
      set.add(r.ownerId);
      idsByType.set(r.ownerType, set);
    }

    const map: OwnerMap = new Map();
    const tasks: Array<Promise<void>> = [];

    const tourIds = idsByType.get(MediaOwnerType.TOUR);
    if (tourIds?.size) {
      tasks.push(
        this.prisma.tour
          .findMany({
            where: { id: { in: [...tourIds] } },
            select: { id: true, title: true, slug: true },
          })
          .then((rs) => {
            for (const r of rs) map.set(`TOUR:${r.id}`, { title: r.title, slug: r.slug });
          }),
      );
    }
    const destinationIds = idsByType.get(MediaOwnerType.DESTINATION);
    if (destinationIds?.size) {
      tasks.push(
        this.prisma.destination
          .findMany({
            where: { id: { in: [...destinationIds] } },
            select: { id: true, name: true, slug: true },
          })
          .then((rs) => {
            for (const r of rs) map.set(`DESTINATION:${r.id}`, { title: r.name, slug: r.slug });
          }),
      );
    }
    const postIds = idsByType.get(MediaOwnerType.POST);
    if (postIds?.size) {
      tasks.push(
        this.prisma.post
          .findMany({
            where: { id: { in: [...postIds] } },
            select: { id: true, title: true, slug: true },
          })
          .then((rs) => {
            for (const r of rs) map.set(`POST:${r.id}`, { title: r.title, slug: r.slug });
          }),
      );
    }
    const userIds = idsByType.get(MediaOwnerType.USER);
    if (userIds?.size) {
      tasks.push(
        this.prisma.user
          .findMany({
            where: { id: { in: [...userIds] } },
            select: { id: true, fullName: true, email: true },
          })
          .then((rs) => {
            for (const r of rs) {
              map.set(`USER:${r.id}`, { title: r.fullName ?? r.email, slug: null });
            }
          }),
      );
    }

    await Promise.all(tasks);
    return map;
  }
}
```

(`ConflictException`/`NotFoundException` are imported now and used by Task 2 — if the linter flags them as unused at this step, leave the import; Task 2 lands in the same slice before the gate.) Actually, to keep THIS task's gate clean: import only what Step 4 uses (`Injectable`, `ConfigService`, Prisma enums/types, `buildCloudinaryUrl`, `PrismaService`, `MaintenanceService`, `ReconcileResult`, DTO) and let Task 2 add `ConflictException`/`NotFoundException` — `ReconcileResult` is unused too, so ALSO defer that import to Task 2. Remove both from the Step-4 code before committing if the linter complains about unused imports.

- [ ] **Step 5: Run tests.**

Run: `pnpm nx test @tourism/api`
Expected: ALL pass (257 + 4 new = 261).

- [ ] **Step 6: Commit.**

```bash
git add apps/api/src/modules/media/admin-media.service.ts apps/api/src/modules/media/admin-media.service.spec.ts apps/api/src/modules/media/dto/list-admin-media-query.dto.ts
git commit -m "feat(api): admin media list — filters, owner-aware search, owner resolution"
```

### Task 2: `AdminMediaService` — delete, garbage list, reconcile passthrough (TDD)

**Files:**

- Modify: `apps/api/src/modules/media/admin-media.service.ts` (from Task 1)
- Create: `apps/api/src/modules/media/dto/list-media-garbage-query.dto.ts`
- Test: `apps/api/src/modules/media/admin-media.service.spec.ts` (append)

**Interfaces:**

- Consumes: Task 1's service + spec harness (`makePrisma`/`svcWith`/`IMAGE_ROW`).
- Produces: `deleteAsset(id: string): Promise<DeletedMediaAsset>` · `listGarbage(query: ListMediaGarbageQueryDto): Promise<PaginatedMediaGarbage>` · `runReconcile(): Promise<ReconcileResult>` (types already declared in Task 1).

- [ ] **Step 1: Garbage query DTO.** Create `apps/api/src/modules/media/dto/list-media-garbage-query.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Query string for `GET /admin/media/garbage` — pagination only, oldest first. */
export class ListMediaGarbageQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
```

- [ ] **Step 2: Write the failing tests.** Append to `admin-media.service.spec.ts` (inside the top-level `describe('AdminMediaService')`):

```ts
  describe('deleteAsset', () => {
    it('queues garbage (with video poster) and deletes atomically', async () => {
      const videoRow = {
        ...IMAGE_ROW,
        id: 'asset-3',
        publicId: 'tourism/tours/video/123-clip',
        type: MediaType.VIDEO,
        posterId: 'tourism/tours/video/123-poster',
      };
      const createMany = jest.fn();
      const del = jest.fn();
      const $transaction = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({
        mediaAsset: { findUnique: jest.fn().mockResolvedValue(videoRow), delete: del },
        mediaGarbage: { createMany },
        $transaction,
      });

      const res = await svcWith(prisma).deleteAsset('asset-3');

      expect(res).toEqual({ id: 'asset-3', publicId: 'tourism/tours/video/123-clip' });
      expect(createMany.mock.calls[0][0]).toEqual({
        data: [
          { publicId: 'tourism/tours/video/123-clip', resourceType: 'video' },
          { publicId: 'tourism/tours/video/123-poster', resourceType: 'image' },
        ],
        skipDuplicates: true,
      });
      expect(del.mock.calls[0][0]).toEqual({ where: { id: 'asset-3' } });
      // Batch transaction (array form) — garbage insert + delete together.
      expect($transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects USER-owned assets with 409', async () => {
      const avatar = { ...IMAGE_ROW, id: 'asset-4', ownerType: MediaOwnerType.USER };
      const prisma = makePrisma({
        mediaAsset: { findUnique: jest.fn().mockResolvedValue(avatar) },
      });
      await expect(svcWith(prisma).deleteAsset('asset-4')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('404s on an unknown id', async () => {
      const prisma = makePrisma();
      await expect(svcWith(prisma).deleteAsset('asset-nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('garbage', () => {
    it('lists the queue oldest first with ISO dates', async () => {
      const prisma = makePrisma({
        mediaGarbage: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'g-1',
              publicId: 'tourism/x',
              resourceType: 'image',
              attempts: 2,
              lastError: 'boom',
              createdAt: new Date('2026-07-02T12:00:00Z'),
            },
          ]),
          count: jest.fn().mockResolvedValue(1),
        },
      });

      const res = await svcWith(prisma).listGarbage({});

      expect(res.items[0]).toEqual({
        id: 'g-1',
        publicId: 'tourism/x',
        resourceType: 'image',
        attempts: 2,
        lastError: 'boom',
        createdAt: '2026-07-02T12:00:00.000Z',
      });
      const prismaGarbage = (prisma as unknown as { mediaGarbage: { findMany: jest.Mock } })
        .mediaGarbage;
      expect(prismaGarbage.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'asc' });
    });

    it('runReconcile passes through to MaintenanceService', async () => {
      const maintenance = makeMaintenance();
      const res = await svcWith(makePrisma(), maintenance).runReconcile();
      expect(res).toEqual({ destroyed: 2, failed: 1 });
      expect(
        (maintenance as unknown as { reconcileMedia: jest.Mock }).reconcileMedia,
      ).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 3: Run to verify the 5 new tests fail.** `pnpm nx test @tourism/api` — `deleteAsset`/`listGarbage`/`runReconcile` not functions.

- [ ] **Step 4: Implement.** In `admin-media.service.ts` add the imports deferred from Task 1 (`ConflictException`, `NotFoundException` from `@nestjs/common`; `ReconcileResult` in the `../jobs/maintenance.service` import) and append inside the class:

```ts
  /**
   * Detach ONE asset from its owner and queue its Cloudinary destruction —
   * atomic batch transaction (array form; pooler-safe). Mirrors
   * `MediaService.recordGarbage` semantics: the publicId with its resource
   * type, plus a video's dedicated poster image. USER-owned assets (customer
   * avatars) are not library content — 409.
   */
  async deleteAsset(id: string): Promise<DeletedMediaAsset> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: `Media asset "${id}" not found`,
      });
    }
    if (asset.ownerType === MediaOwnerType.USER) {
      throw new ConflictException({
        code: 'MEDIA_USER_OWNED',
        message:
          'User avatars are managed from the user account and cannot be deleted from the media library',
      });
    }

    const garbage: Array<{ publicId: string; resourceType: string }> = [
      {
        publicId: asset.publicId,
        resourceType: asset.type === MediaType.VIDEO ? 'video' : 'image',
      },
    ];
    if (asset.posterId) {
      garbage.push({ publicId: asset.posterId, resourceType: 'image' });
    }

    await this.prisma.$transaction([
      this.prisma.mediaGarbage.createMany({ data: garbage, skipDuplicates: true }),
      this.prisma.mediaAsset.delete({ where: { id } }),
    ]);

    return { id: asset.id, publicId: asset.publicId };
  }

  /** The deferred-destroy queue, oldest first (the cron's processing order). */
  async listGarbage(
    query: ListMediaGarbageQueryDto,
  ): Promise<PaginatedMediaGarbage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.mediaGarbage.findMany({
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mediaGarbage.count(),
    ]);

    return {
      items: rows.map((g) => ({
        id: g.id,
        publicId: g.publicId,
        resourceType: g.resourceType,
        attempts: g.attempts,
        lastError: g.lastError,
        createdAt: g.createdAt.toISOString(),
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Runs ONE reconcile batch immediately (same code path as the daily cron). */
  runReconcile(): Promise<ReconcileResult> {
    return this.maintenance.reconcileMedia();
  }
```

Also add the `ListMediaGarbageQueryDto` import at the top.

- [ ] **Step 5: Run tests.** `pnpm nx test @tourism/api` — all pass (261 + 5 = 266).

- [ ] **Step 6: Commit.**

```bash
git add apps/api/src/modules/media/admin-media.service.ts apps/api/src/modules/media/admin-media.service.spec.ts apps/api/src/modules/media/dto/list-media-garbage-query.dto.ts
git commit -m "feat(api): admin media delete + garbage queue + reconcile-now"
```

### Task 3: DTOs + `AdminMediaController` + `AdminMediaModule`

**Files:**

- Create: `apps/api/src/modules/media/dto/admin-media.dto.ts`
- Create: `apps/api/src/modules/media/admin-media.controller.ts`
- Create: `apps/api/src/modules/media/admin-media.module.ts`
- Modify: `apps/api/src/app/app.module.ts` (register `AdminMediaModule` in `imports` right after `JobsModule`)

**Interfaces:**

- Consumes: `AdminMediaService` methods from Tasks 1–2 (exact names/types above). `Roles` decorator from `../../common/decorators/roles.decorator`; `PageMetaDto` from `../../common/dto/page-meta.dto` (mirror `admin-bookings.controller.ts` + `paginated-bookings.dto.ts`).
- Produces: Swagger-visible routes `GET /admin/media` · `GET /admin/media/garbage` · `POST /admin/media/garbage/reconcile` · `DELETE /admin/media/:id`, and the DTO names the FE reads after regen: `AdminMediaAssetDto` · `PaginatedAdminMediaDto` · `MediaGarbageRowDto` · `PaginatedMediaGarbageDto` · `MediaReconcileResultDto` · `DeletedMediaAssetDto`.

- [ ] **Step 1: Response DTOs.** Create `apps/api/src/modules/media/dto/admin-media.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { MediaOwnerType, MediaRole, MediaType } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** One media-library row — an owned asset with delivery URLs + resolved owner. */
export class AdminMediaAssetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'tourism/tours/hero/1717000000000-hoi-an' })
  publicId!: string;

  @ApiProperty({ format: 'uri' })
  url!: string;

  @ApiProperty({ nullable: true, type: String, format: 'uri', description: 'Video poster URL.' })
  posterUrl!: string | null;

  @ApiProperty({ enum: MediaType })
  type!: MediaType;

  @ApiProperty({ enum: MediaRole })
  role!: MediaRole;

  @ApiProperty({ nullable: true, type: String, example: 'jpg' })
  format!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 1920 })
  width!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 1080 })
  height!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 245000 })
  bytes!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  durationSec!: number | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ enum: MediaOwnerType })
  ownerType!: MediaOwnerType;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Hoi An Walking Tour',
    description: 'Owning record title/name — null when the owner row no longer exists.',
  })
  ownerTitle!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'hoi-an-walking-tour',
    description: 'Owner page slug (tour/destination/post); null for USER owners.',
  })
  ownerSlug!: string | null;
}

/** Enveloped media-library list (`TransformInterceptor` hoists items→data + meta). */
export class PaginatedAdminMediaDto {
  @ApiProperty({ type: [AdminMediaAssetDto] })
  data!: AdminMediaAssetDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

/** One deferred-Cloudinary-destroy queue row. `attempts`>0 = destroy failing. */
export class MediaGarbageRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'tourism/destinations/gallery/1717000000000-old' })
  publicId!: string;

  @ApiProperty({ example: 'image', description: "Cloudinary resource_type ('image' | 'video')." })
  resourceType!: string;

  @ApiProperty({ example: 0 })
  attempts!: number;

  @ApiProperty({ nullable: true, type: String })
  lastError!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

/** Enveloped garbage-queue list. */
export class PaginatedMediaGarbageDto {
  @ApiProperty({ type: [MediaGarbageRowDto] })
  data!: MediaGarbageRowDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

/** Result of an on-demand reconcile batch. */
export class MediaReconcileResultDto {
  @ApiProperty({ example: 9 })
  destroyed!: number;

  @ApiProperty({ example: 0 })
  failed!: number;
}

/** Ack for a library delete. */
export class DeletedMediaAssetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'tourism/tours/hero/1717000000000-hoi-an' })
  publicId!: string;
}
```

- [ ] **Step 2: Controller.** Create `apps/api/src/modules/media/admin-media.controller.ts`:

```ts
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReconcileResult } from '../jobs/maintenance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminMediaService,
  DeletedMediaAsset,
  PaginatedAdminMedia,
  PaginatedMediaGarbage,
} from './admin-media.service';
import {
  DeletedMediaAssetDto,
  MediaReconcileResultDto,
  PaginatedAdminMediaDto,
  PaginatedMediaGarbageDto,
} from './dto/admin-media.dto';
import { ListAdminMediaQueryDto } from './dto/list-admin-media-query.dto';
import { ListMediaGarbageQueryDto } from './dto/list-media-garbage-query.dto';

/**
 * Admin media library at `/admin/media` — cross-owner browse/search, per-asset
 * detach (into the deferred Cloudinary-destroy queue), and garbage-queue
 * visibility with an on-demand reconcile. Gated by `@Roles(ADMIN)`.
 */
@ApiTags('Media (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly adminMedia: AdminMediaService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list media assets (paginated, filter/search, owner resolved)' })
  @ApiOkResponse({ type: PaginatedAdminMediaDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(@Query() query: ListAdminMediaQueryDto): Promise<PaginatedAdminMedia> {
    return this.adminMedia.list(query);
  }

  @Get('garbage')
  @ApiOperation({ summary: 'Admin: list the deferred Cloudinary-destroy queue (oldest first)' })
  @ApiOkResponse({ type: PaginatedMediaGarbageDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  listGarbage(
    @Query() query: ListMediaGarbageQueryDto,
  ): Promise<PaginatedMediaGarbage> {
    return this.adminMedia.listGarbage(query);
  }

  @Post('garbage/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: run one Cloudinary cleanup batch now (same as the daily cron)' })
  @ApiOkResponse({ type: MediaReconcileResultDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  reconcile(): Promise<ReconcileResult> {
    return this.adminMedia.runReconcile();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: detach one asset from its owner + queue Cloudinary destroy' })
  @ApiOkResponse({ type: DeletedMediaAssetDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 409, description: 'USER-owned asset (customer avatar)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<DeletedMediaAsset> {
    return this.adminMedia.deleteAsset(id);
  }
}
```

- [ ] **Step 3: Module + registration.** Create `apps/api/src/modules/media/admin-media.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

/**
 * Admin media library (Wave 7). Separate from `MediaModule` (the owner-sync
 * unit) so importing `JobsModule` for `MaintenanceService` stays acyclic
 * (JobsModule already imports MediaModule). Prisma/Config are global.
 */
@Module({
  imports: [JobsModule],
  controllers: [AdminMediaController],
  providers: [AdminMediaService],
})
export class AdminMediaModule {}
```

In `apps/api/src/app/app.module.ts`: add `import { AdminMediaModule } from '../modules/media/admin-media.module';` (alphabetical with its neighbors) and add `AdminMediaModule,` to the `imports` array right after `JobsModule,`.

- [ ] **Step 4: Verify.**

Run: `pnpm nx run @tourism/api:typecheck && pnpm nx test @tourism/api`
Expected: typecheck clean; 266 tests pass (no new tests — DTO/wiring layer; the service logic is already covered).

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/media/dto/admin-media.dto.ts apps/api/src/modules/media/admin-media.controller.ts apps/api/src/modules/media/admin-media.module.ts apps/api/src/app/app.module.ts
git commit -m "feat(api): admin media library endpoints (list/delete/garbage/reconcile)"
```

### Task 4 (controller, inline): slice gate + review + regen + merge

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green.
- [ ] **Step 2: `ecc:code-reviewer`** on `git diff main...HEAD` (delete + Cloudinary + admin-guard surface). Fix cheap MEDIUMs; STOP on CRITICAL/HIGH.
- [ ] **Step 3: Regen types** per Global Constraints (verify `/admin/media` paths + the 6 DTO names appear in `docs-json` before regenerating). Commit `schema.ts` alone.
- [ ] **Step 4: Re-gate consumers.** `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` — green.
- [ ] **Step 5: Merge.**

```bash
git checkout main && git merge --ff-only feat/admin-media-library-be && git branch -d feat/admin-media-library-be && git push
```

---

# Slice 2 — Admin FE: `/media` page

Branch off `main`: `git checkout -b feat/admin-media-library-ui`

### Task 5: FE lib — helpers (TDD) + data fetchers + server actions

**Files:**

- Create: `apps/admin/src/lib/media-library/format.ts`
- Create: `apps/admin/src/lib/media-library/format.spec.ts`
- Create: `apps/admin/src/lib/media-library/data.ts`
- Create: `apps/admin/src/lib/media-library/actions.ts`

**Interfaces:**

- Consumes: regenerated `components['schemas']['AdminMediaAssetDto' | 'MediaGarbageRowDto' | 'PageMetaDto']` from `@tourism/core` · `getApiClient`/`apiWrite` from `../api/client` · `apiErrorMessage` from `../api/error`.
- Produces (Tasks 6–7 import these): `formatBytes(bytes: number | null | undefined): string | null` · `ownerHref(ownerType: string, ownerSlug: string | null): string | null` · `listMedia(params: MediaListParams): Promise<MediaList>` · `listGarbage(params: GarbageListParams): Promise<GarbageList>` · `deleteMediaAsset(id: string): Promise<{ ok: boolean; error?: string }>` · `runMediaCleanup(): Promise<{ ok: boolean; destroyed?: number; failed?: number; error?: string }>`.

- [ ] **Step 1: Write the failing tests.** Create `format.spec.ts`:

```ts
import { formatBytes, ownerHref } from './format';

describe('formatBytes', () => {
  it('formats byte counts human-readably', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(245000)).toBe('239.3 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('returns null when bytes is missing', () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(undefined)).toBeNull();
  });
});

describe('ownerHref', () => {
  it('maps content owners to their admin detail routes', () => {
    expect(ownerHref('TOUR', 'hoi-an')).toBe('/tours/hoi-an');
    expect(ownerHref('DESTINATION', 'da-nang')).toBe('/destinations/da-nang');
    expect(ownerHref('POST', 'travel-tips')).toBe('/posts/travel-tips');
  });

  it('returns null for USER owners and missing slugs', () => {
    expect(ownerHref('USER', null)).toBeNull();
    expect(ownerHref('TOUR', null)).toBeNull();
    expect(ownerHref('UNKNOWN', 'x')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure.** `pnpm nx test @tourism/admin` — FAIL (module not found). Baseline 127 others pass.

- [ ] **Step 3: Implement `format.ts`:**

```ts
/** Human-readable byte count — "512 B" / "2.0 KB" / "5.0 MB"; null when unknown. */
export function formatBytes(bytes: number | null | undefined): string | null {
  if (typeof bytes !== 'number') return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Admin route for a media owner; null when there is no page to link (USER / missing). */
export function ownerHref(ownerType: string, ownerSlug: string | null): string | null {
  if (!ownerSlug) return null;
  switch (ownerType) {
    case 'TOUR':
      return `/tours/${ownerSlug}`;
    case 'DESTINATION':
      return `/destinations/${ownerSlug}`;
    case 'POST':
      return `/posts/${ownerSlug}`;
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run tests.** `pnpm nx test @tourism/admin` — pass (127 + 4 = 131).

- [ ] **Step 5: Data fetchers.** Create `data.ts`:

```ts
import type { components } from '@tourism/core';

import { getApiClient } from '../api/client';

export type AdminMediaAsset = components['schemas']['AdminMediaAssetDto'];
export type MediaGarbageRow = components['schemas']['MediaGarbageRowDto'];
export type PageMeta = components['schemas']['PageMetaDto'];

export interface MediaListParams {
  page?: number;
  pageSize?: number;
  ownerType?: string;
  role?: string;
  type?: string;
  search?: string;
}

export interface MediaList {
  data: AdminMediaAsset[];
  meta: PageMeta;
}

export interface GarbageListParams {
  page?: number;
  pageSize?: number;
}

export interface GarbageList {
  data: MediaGarbageRow[];
  meta: PageMeta;
}

/** Lists media assets (`GET /admin/media`) — server-side filters + pagination. */
export async function listMedia(params: MediaListParams = {}): Promise<MediaList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/media', {
    params: {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        ownerType: params.ownerType as never,
        role: params.role as never,
        type: params.type as never,
        search: params.search,
      },
    },
  });
  return data as unknown as MediaList;
}

/** Lists the deferred Cloudinary-destroy queue (`GET /admin/media/garbage`). */
export async function listGarbage(params: GarbageListParams = {}): Promise<GarbageList> {
  const api = await getApiClient();
  const { data } = await api.GET('/api/v1/admin/media/garbage', {
    params: { query: { page: params.page, pageSize: params.pageSize } },
  });
  return data as unknown as GarbageList;
}
```

(If the generated query types accept the enum strings directly, drop the `as never` casts — they exist only in case the generated types demand the exact enum literal union; prefer the typed form.)

- [ ] **Step 6: Server actions.** Create `actions.ts` (mirror the state-shape of `lib/reviews/actions.ts` deletes):

```ts
'use server';

import { revalidatePath } from 'next/cache';

import { apiWrite, getApiClient } from '../api/client';
import { apiErrorMessage } from '../api/error';

/** Detaches one asset + queues its Cloudinary destruction. */
export async function deleteMediaAsset(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const api = await getApiClient();
    const { error } = await api.DELETE('/api/v1/admin/media/{id}', {
      params: { path: { id } },
    });
    if (error) return { ok: false, error: apiErrorMessage(error) };
    revalidatePath('/media');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}

/** Runs one Cloudinary cleanup batch immediately. */
export async function runMediaCleanup(): Promise<{
  ok: boolean;
  destroyed?: number;
  failed?: number;
  error?: string;
}> {
  try {
    const res = await apiWrite<{ data?: { destroyed: number; failed: number } }>(
      'POST',
      '/api/v1/admin/media/garbage/reconcile',
    );
    revalidatePath('/media');
    const result = res?.data ?? (res as unknown as { destroyed: number; failed: number });
    return { ok: true, destroyed: result.destroyed, failed: result.failed };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
}
```

(Envelope note: single-resource responses come back `{ data, error }` at runtime — the `res?.data ??` fallback covers either shape; verify against the actual `apiWrite` return once wired, and match how `lib/bookings/actions.ts` reads its response.)

- [ ] **Step 7: Build + commit.**

Run: `pnpm nx build @tourism/admin` — green.

```bash
git add apps/admin/src/lib/media-library
git commit -m "feat(admin): media-library lib — formatters, fetchers, delete/cleanup actions"
```

### Task 6: Library tab — page, grid, facets, drawer, delete

**Files:**

- Create: `apps/admin/src/app/(admin)/media/page.tsx`
- Create: `apps/admin/src/components/media/media-library-view.tsx`

**Interfaces:**

- Consumes: Task 5's `listMedia`/`AdminMediaAsset`/`formatBytes`/`ownerHref`/`deleteMediaAsset` · `AdminListHeader` (`components/crud/list-header`) · `ErrorAlert` (`components/crud/error-alert`) · `ServerTablePagination` (`components/crud/server-table-pagination`) · `parsePageSize` (`lib/pagination`) · `@tourism/ui` (Sheet/DropdownMenu/AlertDialog/Badge/Button/Input/Empty/Separator/cn) · `toast` from `@tourism/ui` sonner re-export (grep how `refund-booking.tsx` imports it and match).
- Produces: the `/media` route with `?tab=library|garbage` — Task 7 adds the garbage half; this task renders a "Garbage" tab link whose content is filled by Task 7 (render a placeholder `<div />` for the garbage branch until Task 7 replaces it).

- [ ] **Step 1: Page (Server Component).** Create `apps/admin/src/app/(admin)/media/page.tsx`:

```tsx
import { AdminListHeader } from '../../../components/crud/list-header';
import { ErrorAlert } from '../../../components/crud/error-alert';
import { MediaLibraryView } from '../../../components/media/media-library-view';
import { apiErrorMessage } from '../../../lib/api/error';
import { listMedia, type MediaList } from '../../../lib/media-library/data';
import { parsePageSize } from '../../../lib/pagination';

const OWNER_TYPES = ['TOUR', 'DESTINATION', 'POST', 'USER'] as const;
const ROLES = ['hero', 'gallery', 'avatar'] as const;
const TYPES = ['IMAGE', 'VIDEO'] as const;

function parseChoice<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((v) => v === raw);
}

function parsePage(raw?: string): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface MediaPageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    ownerType?: string;
    role?: string;
    type?: string;
    q?: string;
  }>;
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const sp = await searchParams;
  const tab = sp.tab === 'garbage' ? 'garbage' : 'library';
  const page = parsePage(sp.page);
  const pageSize = parsePageSize(sp.pageSize);
  const ownerType = parseChoice(sp.ownerType, OWNER_TYPES);
  const role = parseChoice(sp.role, ROLES);
  const type = parseChoice(sp.type, TYPES);
  const search = sp.q?.trim() ?? '';

  let result: MediaList | undefined;
  let error: string | null = null;
  if (tab === 'library') {
    try {
      result = await listMedia({
        page,
        pageSize,
        ownerType,
        role,
        type,
        search: search || undefined,
      });
    } catch (e) {
      error = apiErrorMessage(e);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <AdminListHeader
        title="Media"
        description="Every image and video across tours, destinations and posts. Search, inspect, and remove media; the Garbage tab shows the deferred Cloudinary cleanup queue."
      />

      {tab === 'library' && error ? (
        <ErrorAlert>
          Couldn&apos;t load media: {error}. Check that the API is running and your admin session is
          valid.
        </ErrorAlert>
      ) : tab === 'library' ? (
        <MediaLibraryView
          rows={result?.data ?? []}
          meta={result?.meta}
          ownerType={ownerType}
          role={role}
          type={type}
          search={search}
        />
      ) : (
        <div /> /* Garbage tab content lands in the next task. */
      )}
    </div>
  );
}
```

- [ ] **Step 2: Library view (client).** Create `apps/admin/src/components/media/media-library-view.tsx` — one client component owning tabs bar, facet filters, search, grid, drawer, delete. Complete code:

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChevronDown, Film, ImageIcon, ListFilter, Search } from 'lucide-react';

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

import { ServerTablePagination } from '../crud/server-table-pagination';
import { deleteMediaAsset } from '../../lib/media-library/actions';
import type { AdminMediaAsset, PageMeta } from '../../lib/media-library/data';
import { formatBytes, ownerHref } from '../../lib/media-library/format';

const OWNER_OPTIONS = [
  { value: 'TOUR', label: 'Tours' },
  { value: 'DESTINATION', label: 'Destinations' },
  { value: 'POST', label: 'Posts' },
  { value: 'USER', label: 'Users' },
] as const;
const ROLE_OPTIONS = [
  { value: 'hero', label: 'Hero' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'avatar', label: 'Avatar' },
] as const;
const TYPE_OPTIONS = [
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
] as const;

interface MediaLibraryViewProps {
  rows: AdminMediaAsset[];
  meta?: PageMeta;
  ownerType?: string;
  role?: string;
  type?: string;
  search: string;
}

/** One single-choice URL-param facet (checkbox visuals, radio semantics). */
function FacetFilter({
  label,
  param,
  value,
  options,
  onSelect,
}: {
  label: string;
  param: string;
  value?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onSelect: (param: string, value: string | null) => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal sm:w-44"
            aria-label={`Filter by ${label.toLowerCase()}`}
          />
        }
      >
        <span className="inline-flex items-center gap-2">
          <ListFilter className="size-4 shrink-0" />
          <span className="truncate">{active ? active.label : label}</span>
        </span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by {label.toLowerCase()}</DropdownMenuLabel>
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={value === o.value}
              onCheckedChange={(checked) => onSelect(param, checked === true ? o.value : null)}
              closeOnClick={false}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {value ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelect(param, null)}>Clear filter</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MediaLibraryView({
  rows,
  meta,
  ownerType,
  role,
  type,
  search,
}: MediaLibraryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selected, setSelected] = useState<AdminMediaAsset | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const pushParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    next.delete('page'); // any filter change resets pagination
    router.push(`${pathname}?${next.toString()}`);
  };

  const onDelete = () => {
    if (!selected) return;
    startDelete(async () => {
      const res = await deleteMediaAsset(selected.id);
      setConfirmOpen(false);
      if (res.ok) {
        setSelected(null);
        toast('Media deleted. Cloudinary cleanup is queued — see the Garbage tab.');
        router.refresh();
      } else {
        toast.error(res.error ?? 'Delete failed.');
      }
    });
  };

  const selectedHref = selected ? ownerHref(selected.ownerType, selected.ownerSlug) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters + search */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <FacetFilter label="Owner" param="ownerType" value={ownerType} options={OWNER_OPTIONS} onSelect={(p, v) => pushParams({ [p]: v })} />
        <FacetFilter label="Role" param="role" value={role} options={ROLE_OPTIONS} onSelect={(p, v) => pushParams({ [p]: v })} />
        <FacetFilter label="Type" param="type" value={type} options={TYPE_OPTIONS} onSelect={(p, v) => pushParams({ [p]: v })} />
        <form
          className="relative w-full lg:ml-auto lg:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get('q');
            pushParams({ q: typeof q === 'string' ? q.trim() : '' });
          }}
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search publicId or owner…"
            className="pl-8"
            aria-label="Search media"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>No media found</EmptyTitle>
            <EmptyDescription>
              {ownerType || role || type || search
                ? 'Try different filters or clear the search.'
                : 'Images upload from the Tours, Destinations and Posts forms.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rows.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => setSelected(asset)}
                  className={cn(
                    'group border-border relative block w-full overflow-hidden rounded-lg border',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  )}
                  aria-label={`View ${asset.publicId}`}
                >
                  <span className="bg-muted relative block aspect-square">
                    <Image
                      src={asset.type === 'VIDEO' ? (asset.posterUrl ?? asset.url) : asset.url}
                      alt={asset.ownerTitle ?? asset.publicId}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {asset.type === 'VIDEO' ? (
                      <span className="bg-background/80 absolute top-1.5 right-1.5 rounded-full p-1">
                        <Film className="size-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-muted-foreground truncate text-xs">
                      {asset.ownerTitle ?? 'Unknown owner'}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {asset.role}
                    </Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
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

      {/* Detail drawer */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="truncate">
                  {selected.ownerTitle ?? 'Unknown owner'}
                </SheetTitle>
                <SheetDescription className="capitalize">
                  {selected.role} · {selected.type.toLowerCase()}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6">
                <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
                  <Image
                    src={selected.type === 'VIDEO' ? (selected.posterUrl ?? selected.url) : selected.url}
                    alt={selected.ownerTitle ?? selected.publicId}
                    fill
                    sizes="28rem"
                    className="object-contain"
                  />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Dimensions</dt>
                    <dd className="text-sm font-medium">
                      {selected.width && selected.height
                        ? `${selected.width} × ${selected.height}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Size</dt>
                    <dd className="text-sm font-medium">{formatBytes(selected.bytes) ?? '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Format</dt>
                    <dd className="text-sm font-medium uppercase">{selected.format ?? '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">Uploaded</dt>
                    <dd className="text-sm font-medium">
                      {new Date(selected.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>
                <Separator />
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Public ID</p>
                  <p className="font-mono text-xs break-all">{selected.publicId}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Used in</p>
                  {selectedHref ? (
                    <Link href={selectedHref} className="text-primary text-sm hover:underline">
                      {selected.ownerTitle}
                    </Link>
                  ) : (
                    <p className="text-sm">{selected.ownerTitle ?? 'Unknown owner'}</p>
                  )}
                </div>
                {selected.ownerType !== 'USER' ? (
                  <>
                    <Separator />
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmOpen(true)}
                      disabled={deleting}
                    >
                      Delete media
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete confirm — controlled, outside the drawer per Base UI footguns */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this media?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes it from {selected?.ownerTitle ?? 'its owner'} and permanently deletes it from
              Cloudinary within the day — or run cleanup now from the Garbage tab. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

Adapt against reality while implementing (do NOT guess): (a) confirm each `@tourism/ui` export name exists in the barrel (`Sheet*`, `AlertDialog*`, `toast`, `Empty*`) — mirror the imports in `components/reviews/reviews-view.tsx` and `components/bookings/refund-booking.tsx`; (b) `next/image` remote host — check `apps/admin/next.config.*` allows `res.cloudinary.com` (the admin already renders Cloudinary images in `DestinationMediaView`; reuse whatever it does — if it uses plain `<img>`, use plain `<img>` here too for consistency); (c) `AlertDialogAction`/`AlertDialogCancel` render-prop conventions per `components/crud/row-actions.tsx`.

- [ ] **Step 3: Tabs bar.** In `page.tsx` add a small tabs row between the header and the content (Library | Garbage as URL links, active = current `tab`). Mirror the segmented-tab styling used by the admin status tabs (check `components/crud/` for the existing tab-link classes and copy them):

```tsx
      <div className="flex items-center gap-1">
        {[
          { key: 'library', label: 'Library', href: '/media' },
          { key: 'garbage', label: 'Garbage', href: '/media?tab=garbage' },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
```

(`Link` from `next/link`, `cn` from `@tourism/ui` — add both imports.)

- [ ] **Step 4: Verify.** `pnpm nx build @tourism/admin` — green; `pnpm nx test @tourism/admin` — 131 pass. If the API is running locally, load `/media` in dev for an eyeball (optional).

- [ ] **Step 5: Commit.**

```bash
git add "apps/admin/src/app/(admin)/media/page.tsx" apps/admin/src/components/media/media-library-view.tsx
git commit -m "feat(admin): media library — grid, facets, search, detail drawer, delete"
```

### Task 7: Garbage tab + sidebar unlock

**Files:**

- Create: `apps/admin/src/components/media/garbage-view.tsx`
- Modify: `apps/admin/src/app/(admin)/media/page.tsx` (fill the garbage branch)
- Modify: `apps/admin/src/components/shell/app-shell.tsx:40` (drop `soon: true` from the Media nav item)

**Interfaces:**

- Consumes: Task 5's `listGarbage`/`MediaGarbageRow`/`runMediaCleanup` · `ServerTablePagination` · `@tourism/ui` Table primitives + `Badge`/`Button`/`Empty*`/`toast`.
- Produces: the completed `/media?tab=garbage` view.

- [ ] **Step 1: Garbage view (client).** Create `apps/admin/src/components/media/garbage-view.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Recycle } from 'lucide-react';

import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@tourism/ui';

import { ServerTablePagination } from '../crud/server-table-pagination';
import { runMediaCleanup } from '../../lib/media-library/actions';
import type { MediaGarbageRow, PageMeta } from '../../lib/media-library/data';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GarbageView({ rows, meta }: { rows: MediaGarbageRow[]; meta?: PageMeta }) {
  const router = useRouter();
  const [running, startRun] = useTransition();

  const onRunNow = () => {
    startRun(async () => {
      const res = await runMediaCleanup();
      if (res.ok) {
        toast(`Cleanup ran: ${res.destroyed ?? 0} destroyed, ${res.failed ?? 0} failed.`);
        router.refresh();
      } else {
        toast.error(res.error ?? 'Cleanup failed.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {meta?.total ?? rows.length} asset(s) queued for Cloudinary deletion. The daily cron
          clears this automatically; run it now to purge immediately.
        </p>
        <Button onClick={onRunNow} disabled={running || rows.length === 0}>
          {running ? (
            <>
              <Spinner className="size-4" /> Running…
            </>
          ) : (
            'Run cleanup now'
          )}
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Recycle />
            </EmptyMedia>
            <EmptyTitle>Queue is clean</EmptyTitle>
            <EmptyDescription>
              Deleted media has already been purged from Cloudinary.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last error</TableHead>
                  <TableHead>Queued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="max-w-md">
                      <span className="block truncate font-mono text-xs">{g.publicId}</span>
                    </TableCell>
                    <TableCell className="capitalize">{g.resourceType}</TableCell>
                    <TableCell>
                      {g.attempts > 0 ? (
                        <Badge variant="destructive">{g.attempts}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="text-muted-foreground block truncate text-xs">
                        {g.lastError ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(g.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
```

(Confirm `Spinner` + Table primitives exist in the `@tourism/ui` barrel — mirror imports used elsewhere in admin; if `Spinner` isn't used inline in buttons anywhere, drop it and keep the text-only "Running…" state.)

- [ ] **Step 2: Wire into the page.** In `page.tsx`: import `GarbageView` + `listGarbage` + `GarbageList`; when `tab === 'garbage'`, fetch `listGarbage({ page, pageSize })` in the same try/catch style, and replace the placeholder `<div />` with `<GarbageView rows={garbage?.data ?? []} meta={garbage?.meta} />` (plus its own `ErrorAlert` branch mirroring the library one).

- [ ] **Step 3: Sidebar unlock.** In `apps/admin/src/components/shell/app-shell.tsx` line ~40 change:

```tsx
      { title: 'Media', href: '/media', icon: ImageIcon, soon: true },
```

to:

```tsx
      { title: 'Media', href: '/media', icon: ImageIcon },
```

- [ ] **Step 4: Verify.** `pnpm nx build @tourism/admin` — green; `pnpm nx test @tourism/admin` — 131 pass.

- [ ] **Step 5: Commit.**

```bash
git add apps/admin/src/components/media/garbage-view.tsx "apps/admin/src/app/(admin)/media/page.tsx" apps/admin/src/components/shell/app-shell.tsx
git commit -m "feat(admin): media garbage tab — queue table + run-cleanup-now; unlock sidebar"
```

### Task 8 (controller, inline): slice gate + merge + docs/memory

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green (admin 131).
- [ ] **Step 2: Merge.**

```bash
git checkout main && git merge --ff-only feat/admin-media-library-ui && git branch -d feat/admin-media-library-ui && git push
```

- [ ] **Step 3: Docs + memory.** Roadmap `docs/07-plans/2026-07-02-admin-enrichment-roadmap.md`: Wave 7 → ✅ DONE + shas + **the roadmap itself is complete** (all 7 waves). Prepend STATUS to this plan. Update `tourism-platform-state` memory + `MEMORY.md` index (Waves 1-7 done; enrichment roadmap COMPLETE; next big items = P6 web blog reader / P5 mobile). Commit docs alone: `docs: mark Wave 7 (Media library) complete — enrichment roadmap done`.
- [ ] **Step 4: Tell the user** Wave 7 is deployed (Render redeploys the API first-class this time — the page errors until Render finishes, then works) and suggest the live validation: open `/media?tab=garbage` and press "Run cleanup now" — the 9 rows queued on 2026-07-02 should destroy and vanish from Cloudinary.

## Self-review notes (plan ↔ spec)

- Spec coverage: list+filters+owner-search → Task 1 · delete/USER-block/garbage/reconcile → Task 2 · DTOs/controller/module (acyclic via JobsModule) → Task 3 · regen/review → Task 4 · lib helpers/actions → Task 5 · grid/facets/drawer/delete → Task 6 · garbage tab/run-now/sidebar → Task 7 · docs/roadmap-complete → Task 8. No gaps.
- Type consistency: `AdminMediaAsset`/`PaginatedAdminMedia`/`DeletedMediaAsset`/`MediaGarbageRow` names match across Tasks 1-3; FE reads `AdminMediaAssetDto`/`MediaGarbageRowDto` (Task 3 DTO names) via regen; `formatBytes`/`ownerHref`/`deleteMediaAsset`/`runMediaCleanup` consistent across Tasks 5-7.
- Known adapt-points are called out explicitly (UI barrel names, next/image vs img, apiWrite envelope) rather than guessed — implementers verify against the named reference files.
