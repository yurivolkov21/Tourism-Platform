# Admin Users module + hardening (completeness wave) — implementation plan

**STATUS: COMPLETE (2026-07-03) — ADMIN DECLARED DONE.** Both slices executed via
subagent-driven development and ff-merged to `main`: slice 1 `6d9374f` (Users module: syncAdmin
env-OR-DB grant [+TOCTOU fix: DB-role path never writes role; delete-mid-race fails closed] ·
AdminUsersService list/detail/changeRole/deleteUser with all guards · deleteMe avatar-leak fix ·
controller/DTOs · FE list + detail + danger zone + `/users/me` + NavUser cleanup;
`ecc:code-reviewer` APPROVE-WITH-NOTES) · slice 2 `3f6d589` (Outbox email-queue list+retry +
`/outbox` page [+per-row retry Set fix] · dashboard DataTable de-fake (−218 lines of demo
affordances) · TopTours currency + tablist keyboard nav; ecc APPROVE). Gate green per slice;
**api 291, admin 134 tests**. **FOLLOW-UPS (non-blocking, from reviews):** last-admin demote
read-then-write race (serializable tx/`FOR UPDATE` if the admin team ever grows) · retry
check-then-update benign TOCTOU (`updateMany` conditional if it matters) · syncAdmin DB-path
doubled findUnique reads · tab ids literal not useId (single-instance OK).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users management (`/admin/users` list/detail/role/delete + DB-role-driven admin grant + `/users` FE) and admin hardening (Outbox email-queue visibility + retry · dashboard DataTable de-fake · TopTours currency + tablist a11y · NavUser stub cleanup) — per spec `docs/06-specs/2026-07-03-admin-users-hardening-design.md`. After this wave the admin is declared DONE.

**Architecture:** 2 slices, one branch each. Slice 1 (Users): `syncAdmin` gains an env-OR-DB-role grant path (env stays bootstrap) · `AdminUsersController`/`AdminUsersService` join the existing users module (the bookings-module precedent: customer + admin controllers side by side) · FE = 10th TanStack table + detail page with a Danger-zone card + `/users/me` + NavUser cleanup. Slice 2 (hardening): `AdminOutboxController`/`AdminOutboxService` in the jobs module (Garbage-tab twin, retry = FAILED→PENDING reset) · dashboard DataTable stripped of dashboard-01 demo affordances · two Wave-4 LOW fixes.

**Tech Stack:** NestJS 11 + Prisma 7 (api) · Next.js 16 admin · jest.

## Global Constraints

- **Security:** `syncAdmin` may ONLY grant from the env allowlist or the MIRRORED user row's `role` — never client input. Role/delete guards use the exact 409 codes in the spec. `Outbox.payload` is NEVER exposed (PII stance, same as payment events).
- **Public surface unchanged:** customer `/users/me*` and `/auth/sync` behavior untouched (except the internal avatar-cleanup fix on `deleteMe`, response unchanged).
- **Pooler:** parallel reads `Promise.all`; interactive `$transaction((tx) => …)` is allowed for owner+media writes (precedent: `UsersService.setAvatar`).
- **Per-commit typecheck-green** (Wave-7 lesson): no imports/types parked for a later task — every commit passes `pnpm nx run @tourism/api:typecheck`.
- Straight quotes in code; no quote-style changes to existing copy; no hex colors; relative imports; Base UI `render` prop; Conventional Commits, no AI attribution; never stage unrelated dirty files (`docs/07-plans/*.md` linter-touched, `playground.md`).
- Gate per slice = `pnpm nx affected -t lint test build --exclude=@tourism/mobile`. Baselines: api 266, admin 131. `ecc:code-reviewer` on BOTH slices (slice 1 with an explicit auth/security angle). Merge-to-main per green slice pre-authorized; stop on CRITICAL/HIGH.
- Regen routine (controller runs inline after the BE tasks of each slice): background `pnpm nx serve @tourism/api` → poll `http://localhost:3000/api/docs-json` to 200 → verify the new paths/DTOs appear → `pnpm nx run @tourism/core:api-types` → eyeball diff → kill the port-3000 tree → `pnpm nx run-many -t build -p @tourism/core @tourism/admin @tourism/web` → commit `libs/shared/core/src/lib/api/schema.ts` alone.

---

# Slice 1 — Users module

Branch off `main`: `git checkout -b feat/admin-users`

### Task 1: `syncAdmin` — env OR DB-role grant (TDD, security-critical)

**Files:**

- Modify: `apps/api/src/modules/auth/auth.service.ts:38-55` (`syncAdmin`)
- Test: `apps/api/src/modules/auth/auth.service.spec.ts` (harness `make(adminEmails, {bySub, byEmail})` already exists at lines 21-52 — reuse it)

**Interfaces:**

- Produces: unchanged signature `syncAdmin(identity, body): Promise<User>`; new behavior — grants when email ∈ allowlist OR the mirrored row is `role=ADMIN`.

- [ ] **Step 1: Write the failing tests.** Append to `auth.service.spec.ts` (the `make` helper seeds what `findUnique` returns per unique key; `Row` type is at line 15):

```ts
  it('syncAdmin grants a DB-promoted admin whose email is NOT on the env allowlist', async () => {
    const { svc, update } = make([], {
      bySub: { id: 'u9', role: UserRole.ADMIN, supabaseId: 'sub-1', email: 'dbadmin@x.com' },
    });
    const user = await svc.syncAdmin(identity('dbadmin@x.com'), {});
    expect(update).toHaveBeenCalled();
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it('syncAdmin grants via the email-relink row when no supabaseId row exists', async () => {
    const { svc } = make([], {
      byEmail: { id: 'u10', role: UserRole.ADMIN, supabaseId: 'old-sub', email: 'dbadmin@x.com' },
    });
    await expect(svc.syncAdmin(identity('dbadmin@x.com'), {})).resolves.toMatchObject({
      role: UserRole.ADMIN,
    });
  });

  it('syncAdmin still 403s a plain customer (row exists, role CUSTOMER)', async () => {
    const { svc } = make([], {
      bySub: { id: 'u11', role: UserRole.CUSTOMER, supabaseId: 'sub-1', email: 'c@x.com' },
    });
    await expect(svc.syncAdmin(identity('c@x.com'), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('syncAdmin 403s an unknown user not on the allowlist', async () => {
    const { svc } = make([]);
    await expect(svc.syncAdmin(identity('nobody@x.com'), {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
```

(The existing env-allowlist pass/403 tests stay untouched — they now cover the bootstrap path.)

- [ ] **Step 2: Run to verify the new tests fail.** `pnpm nx test @tourism/api` — DB-admin tests FAIL (403 thrown); others pass.

- [ ] **Step 3: Implement.** Replace `syncAdmin` (keep the JSDoc, update it) in `auth.service.ts`:

```ts
  /**
   * Upserts the JWT-bearing user as ADMIN. Two grant paths:
   * (1) BOOTSTRAP — email on the `ADMIN_EMAILS` env allowlist (always wins,
   *     survives any DB state);
   * (2) DB ROLE — the MIRRORED user row is already `role=ADMIN` (promoted via
   *     the admin Users module). Never derived from client input.
   * Neither → `ForbiddenException('NOT_ADMIN')` (no silent CUSTOMER fallback).
   */
  async syncAdmin(
    identity: SupabaseAuthIdentity,
    body: SyncUserDto,
  ): Promise<User> {
    const allowlist = this.config.get<string[]>('supabase.adminEmails') ?? [];
    if (allowlist.includes(identity.email.toLowerCase())) {
      return this.upsert(identity, body, UserRole.ADMIN);
    }

    // Same two-unique-key resolution the upsert itself uses (pooler-safe parallel reads).
    const emailLower = identity.email.toLowerCase();
    const [bySub, byEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { supabaseId: identity.sub } }),
      this.prisma.user.findUnique({ where: { email: emailLower } }),
    ]);
    const existing = bySub ?? byEmail;
    if (existing?.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'NOT_ADMIN',
        message: 'This email is not on the admin allowlist',
      });
    }
    return this.upsert(identity, body, UserRole.ADMIN);
  }
```

- [ ] **Step 4: Run tests + typecheck.** `pnpm nx test @tourism/api` (266 + 4 = 270 pass) and `pnpm nx run @tourism/api:typecheck` (exit 0).

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "feat(api): syncAdmin grants env allowlist OR DB-promoted admins"
```

### Task 2: `AdminUsersService` — list + detail (TDD)

**Files:**

- Create: `apps/api/src/modules/users/admin-users.service.ts`
- Create: `apps/api/src/modules/users/dto/list-admin-users-query.dto.ts`
- Test: `apps/api/src/modules/users/admin-users.service.spec.ts` (new)

**Interfaces:**

- Consumes: global `PrismaService` · `ConfigService` (`supabase.adminEmails`) · `MediaService.attachToOwner` (avatar) — all injectable inside the existing `UsersModule`.
- Produces (Tasks 3-4 rely on these exact names):
  - `export interface AdminUserListItem { id: string; email: string; fullName: string | null; phone: string | null; role: UserRole; createdAt: string; bookingsCount: number }`
  - `export interface PaginatedAdminUsers { items: AdminUserListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }`
  - `export interface AdminUserDetail extends AdminUserListItem { locale: string; updatedAt: string; avatarUrl: string | null; counts: { bookings: number; reviews: number; wishlist: number }; isEnvAdmin: boolean; isSelf: boolean }`
  - `list(query: ListAdminUsersQueryDto): Promise<PaginatedAdminUsers>` · `detail(id: string, callerId: string): Promise<AdminUserDetail>`

- [ ] **Step 1: Query DTO.** Create `list-admin-users-query.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
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
 * Query string for `GET /admin/users`. Pagination plus an optional `role`
 * filter and a free-text `search` (case-insensitive contains on full name and
 * email — email is citext). Newest first.
 */
export class ListAdminUsersQueryDto {
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

  /** Filter by role; omit for all. */
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Case-insensitive match on full name / email; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'jane', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
```

- [ ] **Step 2: Write the failing tests.** Create `admin-users.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MediaService } from '../media/media.service';
import type { UsersService } from './users.service';
import { AdminUsersService } from './admin-users.service';

interface Mocks {
  user?: Record<string, unknown>;
  booking?: Record<string, unknown>;
  review?: Record<string, unknown>;
  wishlist?: Record<string, unknown>;
  post?: Record<string, unknown>;
  $transaction?: jest.Mock;
}

function makePrisma(m: Mocks = {}): PrismaService {
  return {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({ ...USER_ROW, id: where.id, ...data }),
      ),
      delete: jest.fn(),
      ...m.user,
    },
    booking: { count: jest.fn().mockResolvedValue(0), ...m.booking },
    review: { count: jest.fn().mockResolvedValue(0), ...m.review },
    wishlist: { count: jest.fn().mockResolvedValue(0), ...m.wishlist },
    post: { count: jest.fn().mockResolvedValue(0), ...m.post },
    $transaction:
      m.$transaction ??
      jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn({})),
  } as unknown as PrismaService;
}

function makeConfig(adminEmails: string[] = []) {
  return {
    get: (k: string) => (k === 'supabase.adminEmails' ? adminEmails : undefined),
  } as unknown as import('@nestjs/config').ConfigService;
}

function makeMedia(over: Record<string, unknown> = {}) {
  return {
    attachToOwner: jest
      .fn()
      .mockImplementation((_t: unknown, owner: object) =>
        Promise.resolve({ ...owner, media: [] }),
      ),
    deleteForOwner: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as MediaService;
}

function makeUsers(over: Record<string, unknown> = {}) {
  return {
    deleteSupabaseUser: jest.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as UsersService;
}

function svcWith(
  prisma: PrismaService,
  adminEmails: string[] = [],
  media = makeMedia(),
  users = makeUsers(),
): AdminUsersService {
  return new AdminUsersService(prisma, makeConfig(adminEmails), media, users);
}

const USER_ROW = {
  id: 'u-1',
  supabaseId: 'sub-1',
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  phone: null,
  locale: 'en',
  role: UserRole.CUSTOMER,
  createdAt: new Date('2026-01-05T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
};

describe('AdminUsersService', () => {
  describe('list', () => {
    it('maps rows with bookingsCount, strips _count, newest first', async () => {
      const findMany = jest
        .fn()
        .mockResolvedValue([{ ...USER_ROW, _count: { bookings: 3 } }]);
      const prisma = makePrisma({
        user: { findMany, count: jest.fn().mockResolvedValue(1) },
      });

      const res = await svcWith(prisma).list({});

      expect(res.items[0]).toEqual({
        id: 'u-1',
        email: 'jane@example.com',
        fullName: 'Jane Doe',
        phone: null,
        role: UserRole.CUSTOMER,
        createdAt: '2026-01-05T00:00:00.000Z',
        bookingsCount: 3,
      });
      expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
      expect(findMany.mock.calls[0][0].include).toEqual({
        _count: { select: { bookings: true } },
      });
    });

    it('AND-composes role filter with search over name/email', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = makePrisma({ user: { findMany, count: jest.fn().mockResolvedValue(0) } });

      await svcWith(prisma).list({ role: UserRole.ADMIN, search: 'jane' } as never);

      const where = findMany.mock.calls[0][0].where;
      expect(where.role).toBe(UserRole.ADMIN);
      expect(where.OR).toEqual([
        { fullName: { contains: 'jane', mode: 'insensitive' } },
        { email: { contains: 'jane', mode: 'insensitive' } },
      ]);
    });
  });

  describe('detail', () => {
    it('returns counts, avatar, isEnvAdmin and isSelf', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ ...USER_ROW, role: UserRole.ADMIN }) },
        booking: { count: jest.fn().mockResolvedValue(4) },
        review: { count: jest.fn().mockResolvedValue(2) },
        wishlist: { count: jest.fn().mockResolvedValue(5) },
      });
      const media = makeMedia({
        attachToOwner: jest.fn().mockImplementation((_t: unknown, o: object) =>
          Promise.resolve({ ...o, media: [{ url: 'https://cdn/avatar.jpg' }] }),
        ),
      });

      const res = await svcWith(prisma, ['jane@example.com'], media).detail('u-1', 'caller-9');

      expect(res.avatarUrl).toBe('https://cdn/avatar.jpg');
      expect(res.counts).toEqual({ bookings: 4, reviews: 2, wishlist: 5 });
      expect(res.isEnvAdmin).toBe(true);
      expect(res.isSelf).toBe(false);
      expect(res.locale).toBe('en');
    });

    it('flags isSelf when the caller opens their own detail', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
      });
      const res = await svcWith(prisma).detail('u-1', 'u-1');
      expect(res.isSelf).toBe(true);
      expect(res.isEnvAdmin).toBe(false);
    });

    it('404s on an unknown id', async () => {
      await expect(svcWith(makePrisma()).detail('nope', 'c')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
```

- [ ] **Step 3: Run to verify failure.** `pnpm nx test @tourism/api` — new suite FAILS (module not found).

- [ ] **Step 4: Implement.** Create `admin-users.service.ts` (list/detail now; Task 3 appends the mutations — write the FULL constructor + all imports used by BOTH tasks is NOT allowed per the per-commit-typecheck rule, so import only what this task uses; Task 3 adds its own):

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaOwnerType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { UsersService } from './users.service';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';

/** One admin users-list row. */
export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  bookingsCount: number;
}

export interface PaginatedAdminUsers {
  items: AdminUserListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Full admin user detail — footprint counts + the flags the FE gates actions on. */
export interface AdminUserDetail extends AdminUserListItem {
  locale: string;
  updatedAt: string;
  avatarUrl: string | null;
  counts: { bookings: number; reviews: number; wishlist: number };
  /** Email is on the ADMIN_EMAILS bootstrap allowlist — cannot be demoted from the UI. */
  isEnvAdmin: boolean;
  /** Target is the caller — self-directed role/delete actions are blocked. */
  isSelf: boolean;
}

/**
 * Admin-on-other-users operations (`/admin/users`). Lives beside the
 * self-service `UsersService` (which stays caller-scoped); reuses its
 * Supabase-auth deletion helper and `MediaService` for avatar handling.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly media: MediaService,
    private readonly users: UsersService,
  ) {}

  async list(query: ListAdminUsersQueryDto): Promise<PaginatedAdminUsers> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { _count: { select: { bookings: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map(({ _count, ...u }) => this.toListItem(u, _count.bookings)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async detail(id: string, callerId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User "${id}" not found`,
      });
    }

    const [bookings, reviews, wishlist, withMedia] = await Promise.all([
      this.prisma.booking.count({ where: { userId: id } }),
      this.prisma.review.count({ where: { userId: id } }),
      this.prisma.wishlist.count({ where: { userId: id } }),
      this.media.attachToOwner(MediaOwnerType.USER, user),
    ]);

    return {
      ...this.toListItem(user, bookings),
      locale: user.locale,
      updatedAt: user.updatedAt.toISOString(),
      avatarUrl: withMedia.media[0]?.url ?? null,
      counts: { bookings, reviews, wishlist },
      isEnvAdmin: this.isEnvAdmin(user.email),
      isSelf: id === callerId,
    };
  }

  /** Email ∈ ADMIN_EMAILS — the env bootstrap that UI actions must not override. */
  private isEnvAdmin(email: string): boolean {
    const allowlist = this.config.get<string[]>('supabase.adminEmails') ?? [];
    return allowlist.includes(email.toLowerCase());
  }

  private toListItem(
    u: {
      id: string;
      email: string;
      fullName: string | null;
      phone: string | null;
      role: UserRole;
      createdAt: Date;
    },
    bookingsCount: number,
  ): AdminUserListItem {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      bookingsCount,
    };
  }
}
```

NOTE: the spec harness imports `ConflictException` and mocks `post.count`/`deleteForOwner`/`deleteSupabaseUser` — those are exercised by Task 3's tests. To keep THIS commit typecheck-green, in Step 2's spec file OMIT the `ConflictException` import and the `makeUsers`/`post` mock pieces for now — Task 3 adds them together with the tests that use them. (`$transaction`, `booking/review/wishlist` mocks are used by this task's detail tests — keep those.) `UsersService` IS imported (typed constructor param) — that's used, fine.

- [ ] **Step 5: Run tests + typecheck.** `pnpm nx test @tourism/api` (270 + 6 = 276) · `pnpm nx run @tourism/api:typecheck` exit 0.

- [ ] **Step 6: Commit.**

```bash
git add apps/api/src/modules/users/admin-users.service.ts apps/api/src/modules/users/admin-users.service.spec.ts apps/api/src/modules/users/dto/list-admin-users-query.dto.ts
git commit -m "feat(api): admin users list + detail (counts, avatar, isEnvAdmin/isSelf)"
```

### Task 3: role change + delete + `deleteMe` avatar-leak fix (TDD)

**Files:**

- Modify: `apps/api/src/modules/users/admin-users.service.ts` (append mutations)
- Modify: `apps/api/src/modules/users/users.service.ts:42-75` (`deleteMe` avatar cleanup + `deleteSupabaseUser` visibility)
- Test: `apps/api/src/modules/users/admin-users.service.spec.ts` (append) · `apps/api/src/modules/users/users.service.spec.ts` (extend deleteMe test)

**Interfaces:**

- Produces: `changeRole(id: string, callerId: string, role: UserRole): Promise<AdminUserListItem>` · `deleteUser(id: string, callerId: string): Promise<{ id: string; email: string }>` · `UsersService.deleteSupabaseUser` becomes `public` (JSDoc notes it is shared with `AdminUsersService`).

- [ ] **Step 1: Write the failing tests.** In `admin-users.service.spec.ts`: add `import { ConflictException } from '@nestjs/common';` to the existing import, add the `post` mock block + `makeUsers` helper + the 4th `users` param on `svcWith` (per the Task-2 spec listing — that listing is the FINAL shape), then append:

```ts
  describe('changeRole', () => {
    const admin = { ...USER_ROW, id: 'a-1', role: UserRole.ADMIN, email: 'boss@x.com' };

    it('promotes a customer to ADMIN', async () => {
      const update = jest.fn().mockResolvedValue({ ...USER_ROW, role: UserRole.ADMIN, _count: undefined });
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW), update },
        booking: { count: jest.fn().mockResolvedValue(0) },
      });
      const res = await svcWith(prisma).changeRole('u-1', 'caller-9', UserRole.ADMIN);
      expect(update.mock.calls[0][0]).toMatchObject({
        where: { id: 'u-1' },
        data: { role: UserRole.ADMIN },
      });
      expect(res.role).toBe(UserRole.ADMIN);
    });

    it('blocks changing your own role (ROLE_SELF_CHANGE)', async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) } });
      await expect(
        svcWith(prisma).changeRole('u-1', 'u-1', UserRole.ADMIN),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks demoting an env-admin (ROLE_ENV_ADMIN)', async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(admin) } });
      await expect(
        svcWith(prisma, ['boss@x.com']).changeRole('a-1', 'caller-9', UserRole.CUSTOMER),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('blocks demoting the last ADMIN (ROLE_LAST_ADMIN)', async () => {
      const prisma = makePrisma({
        user: {
          findUnique: jest.fn().mockResolvedValue(admin),
          count: jest.fn().mockResolvedValue(1),
        },
      });
      await expect(
        svcWith(prisma).changeRole('a-1', 'caller-9', UserRole.CUSTOMER),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows demoting a non-last, non-env admin', async () => {
      const update = jest.fn().mockResolvedValue({ ...admin, role: UserRole.CUSTOMER });
      const prisma = makePrisma({
        user: {
          findUnique: jest.fn().mockResolvedValue(admin),
          count: jest.fn().mockResolvedValue(2),
          update,
        },
        booking: { count: jest.fn().mockResolvedValue(0) },
      });
      const res = await svcWith(prisma).changeRole('a-1', 'caller-9', UserRole.CUSTOMER);
      expect(res.role).toBe(UserRole.CUSTOMER);
    });
  });

  describe('deleteUser', () => {
    it('deletes a bookings-free customer: media cleanup + row delete in a tx + Supabase auth delete', async () => {
      const del = jest.fn();
      const $transaction = jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
          fn({ user: { delete: del } }),
        );
      const media = makeMedia();
      const users = makeUsers();
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        $transaction,
      });

      const res = await svcWith(prisma, [], media, users).deleteUser('u-1', 'caller-9');

      expect(res).toEqual({ id: 'u-1', email: 'jane@example.com' });
      expect(
        (media as unknown as { deleteForOwner: jest.Mock }).deleteForOwner,
      ).toHaveBeenCalledWith(expect.anything(), MediaOwnerType.USER, 'u-1');
      expect(del).toHaveBeenCalledWith({ where: { id: 'u-1' } });
      expect(
        (users as unknown as { deleteSupabaseUser: jest.Mock }).deleteSupabaseUser,
      ).toHaveBeenCalledWith('sub-1');
    });

    it('blocks self-delete (USER_SELF_DELETE)', async () => {
      const prisma = makePrisma({ user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) } });
      await expect(svcWith(prisma).deleteUser('u-1', 'u-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('blocks deleting an ADMIN (USER_IS_ADMIN)', async () => {
      const prisma = makePrisma({
        user: {
          findUnique: jest.fn().mockResolvedValue({ ...USER_ROW, role: UserRole.ADMIN }),
        },
      });
      await expect(svcWith(prisma).deleteUser('u-1', 'c')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('blocks when the user has bookings (ACCOUNT_HAS_BOOKINGS)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        booking: { count: jest.fn().mockResolvedValue(2) },
      });
      await expect(svcWith(prisma).deleteUser('u-1', 'c')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('blocks a posts author (USER_HAS_POSTS)', async () => {
      const prisma = makePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(USER_ROW) },
        post: { count: jest.fn().mockResolvedValue(1) },
      });
      await expect(svcWith(prisma).deleteUser('u-1', 'c')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('404s on an unknown id', async () => {
      await expect(svcWith(makePrisma()).deleteUser('nope', 'c')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
```

In `users.service.spec.ts`, extend the existing deleteMe happy-path test's media mock so it asserts avatar cleanup (find the existing test; the service will now call `media.deleteForOwner` inside a `$transaction` — mirror however that spec file mocks `$transaction`/media, add `deleteForOwner: jest.fn()` to its media mock and assert it was called with `(expect.anything(), MediaOwnerType.USER, <user id>)`).

- [ ] **Step 2: Run to verify failure.** `pnpm nx test @tourism/api` — the new tests FAIL (methods missing).

- [ ] **Step 3: Implement.** In `admin-users.service.ts`: extend the `@nestjs/common` import with `ConflictException`, and append inside the class:

```ts
  /**
   * Change a user's role. Guards (409 each): self-change · demoting an
   * env-bootstrap admin (only an env edit can) · demoting the LAST admin.
   * Promote has no extra guard. Last-admin check is read-then-write — fine at
   * this scale (single-admin reality).
   */
  async changeRole(
    id: string,
    callerId: string,
    role: UserRole,
  ): Promise<AdminUserListItem> {
    if (id === callerId) {
      throw new ConflictException({
        code: 'ROLE_SELF_CHANGE',
        message: 'You cannot change your own role',
      });
    }
    const user = await this.findOrThrow(id);

    const demoting = user.role === UserRole.ADMIN && role === UserRole.CUSTOMER;
    if (demoting && this.isEnvAdmin(user.email)) {
      throw new ConflictException({
        code: 'ROLE_ENV_ADMIN',
        message: 'This admin is on the ADMIN_EMAILS bootstrap list — remove them from the env to demote',
      });
    }
    if (demoting) {
      const admins = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (admins <= 1) {
        throw new ConflictException({
          code: 'ROLE_LAST_ADMIN',
          message: 'Cannot demote the last remaining admin',
        });
      }
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { role } });
    const bookings = await this.prisma.booking.count({ where: { userId: id } });
    return this.toListItem(updated, bookings);
  }

  /**
   * Delete a customer account on their behalf. Guards (409): self-delete ·
   * target is an ADMIN (demote first) · has bookings (financial records,
   * unchanged policy) · authored posts (`Post.author` is onDelete: Restrict —
   * the guard turns the raw FK error into a friendly 409). Avatar media is
   * garbage-queued in the same tx as the row delete (the polymorphic relation
   * has no FK cascade); the Supabase auth identity is removed best-effort.
   */
  async deleteUser(
    id: string,
    callerId: string,
  ): Promise<{ id: string; email: string }> {
    if (id === callerId) {
      throw new ConflictException({
        code: 'USER_SELF_DELETE',
        message: 'You cannot delete your own account from the admin console',
      });
    }
    const user = await this.findOrThrow(id);
    if (user.role === UserRole.ADMIN) {
      throw new ConflictException({
        code: 'USER_IS_ADMIN',
        message: 'Demote this admin to customer before deleting the account',
      });
    }

    const [bookings, posts] = await Promise.all([
      this.prisma.booking.count({ where: { userId: id } }),
      this.prisma.post.count({ where: { authorId: id } }),
    ]);
    if (bookings > 0) {
      throw new ConflictException({
        code: 'ACCOUNT_HAS_BOOKINGS',
        message: 'This account has bookings on record and cannot be deleted',
      });
    }
    if (posts > 0) {
      throw new ConflictException({
        code: 'USER_HAS_POSTS',
        message: 'This user authored blog posts — reassign or delete those posts first',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.media.deleteForOwner(tx, MediaOwnerType.USER, id);
      await tx.user.delete({ where: { id } });
    });
    await this.users.deleteSupabaseUser(user.supabaseId);
    return { id: user.id, email: user.email };
  }

  private async findOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User "${id}" not found`,
      });
    }
    return user;
  }
```

In `users.service.ts`: (a) change `private async deleteSupabaseUser` → `async deleteSupabaseUser` and extend its JSDoc with "Shared with `AdminUsersService` (admin-initiated deletion)."; (b) fix the avatar leak in `deleteMe` — replace the bare `await this.prisma.user.delete(...)` line with:

```ts
    // Avatar media has no FK to users (polymorphic) — clean + garbage-queue it
    // in the same tx as the row delete, exactly like every other owner delete.
    await this.prisma.$transaction(async (tx) => {
      await this.media.deleteForOwner(tx, MediaOwnerType.USER, user.id);
      await tx.user.delete({ where: { id: user.id } });
    });
```

- [ ] **Step 4: Run tests + typecheck.** `pnpm nx test @tourism/api` (276 + 11 = 287, ± the adjusted deleteMe test) · typecheck exit 0.

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/users/admin-users.service.ts apps/api/src/modules/users/admin-users.service.spec.ts apps/api/src/modules/users/users.service.ts apps/api/src/modules/users/users.service.spec.ts
git commit -m "feat(api): admin user role change + delete with guards; fix deleteMe avatar leak"
```

### Task 4: DTOs + `AdminUsersController` + module wiring

**Files:**

- Create: `apps/api/src/modules/users/dto/admin-user.dto.ts`
- Create: `apps/api/src/modules/users/admin-users.controller.ts`
- Modify: `apps/api/src/modules/users/users.module.ts` (register controller + service)

**Interfaces:**

- Consumes: `AdminUsersService` (Tasks 2-3) · `Roles`/`CurrentUser` decorators (mirror `admin-bookings.controller.ts`) · `PageMetaDto`.
- Produces Swagger routes `GET /admin/users` · `GET /admin/users/me` (BEFORE `:id`) · `GET /admin/users/:id` · `PATCH /admin/users/:id/role` · `DELETE /admin/users/:id`; DTO names for the FE: `AdminUserListItemDto` · `PaginatedAdminUsersDto` · `AdminUserDetailDto` · `AdminUserCountsDto` · `ChangeUserRoleDto` · `DeletedUserDto`.

- [ ] **Step 1: DTO file.** Create `dto/admin-user.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** One admin users-list row. */
export class AdminUserListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Jane Doe' })
  fullName!: string | null;

  @ApiProperty({ nullable: true, type: String, example: '+84901234567' })
  phone!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: 3 })
  bookingsCount!: number;
}

/** Enveloped users list. */
export class PaginatedAdminUsersDto {
  @ApiProperty({ type: [AdminUserListItemDto] })
  data!: AdminUserListItemDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

/** Footprint counts on the user detail. */
export class AdminUserCountsDto {
  @ApiProperty({ example: 4 })
  bookings!: number;

  @ApiProperty({ example: 2 })
  reviews!: number;

  @ApiProperty({ example: 5 })
  wishlist!: number;
}

/** Full admin user detail — list fields + profile + flags the UI gates actions on. */
export class AdminUserDetailDto extends AdminUserListItemDto {
  @ApiProperty({ example: 'en' })
  locale!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ nullable: true, type: String, format: 'uri' })
  avatarUrl!: string | null;

  @ApiProperty({ type: AdminUserCountsDto })
  counts!: AdminUserCountsDto;

  @ApiProperty({
    description: 'Email is on the ADMIN_EMAILS bootstrap allowlist — demote is blocked in the UI.',
  })
  isEnvAdmin!: boolean;

  @ApiProperty({ description: 'Target is the caller — self-directed actions are blocked.' })
  isSelf!: boolean;
}

/** Body for `PATCH /admin/users/:id/role`. */
export class ChangeUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

/** Ack for an admin user deletion. */
export class DeletedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;
}
```

- [ ] **Step 2: Controller.** Create `admin-users.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersService,
  PaginatedAdminUsers,
} from './admin-users.service';
import {
  AdminUserDetailDto,
  AdminUserListItemDto,
  ChangeUserRoleDto,
  DeletedUserDto,
  PaginatedAdminUsersDto,
} from './dto/admin-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';

/** Resolves the synced caller row or 401s (mirrors the refund endpoint's guard). */
function requireCaller(user: User | null): User {
  if (!user) {
    throw new UnauthorizedException({
      code: 'USER_NOT_SYNCED',
      message: 'Run POST /auth/admin/sync before managing users',
    });
  }
  return user;
}

/**
 * Admin user management at `/admin/users` — list/detail, role change and
 * account deletion with self/env/last-admin guards. Gated by `@Roles(ADMIN)`.
 */
@ApiTags('Users (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list users (paginated, filter by role, search name/email)' })
  @ApiOkResponse({ type: PaginatedAdminUsersDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(@Query() query: ListAdminUsersQueryDto): Promise<PaginatedAdminUsers> {
    return this.adminUsers.list(query);
  }

  @Get('me')
  @ApiOperation({ summary: "Admin: the caller's own user detail" })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  me(@CurrentUser() user: User | null): Promise<AdminUserDetail> {
    const caller = requireCaller(user);
    return this.adminUsers.detail(caller.id, caller.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: one user with footprint counts + action flags' })
  @ApiOkResponse({ type: AdminUserDetailDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'User not found' })
  detail(
    @CurrentUser() user: User | null,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminUserDetail> {
    return this.adminUsers.detail(id, requireCaller(user).id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Admin: change a user's role (guards: self / env-admin / last admin)" })
  @ApiOkResponse({ type: AdminUserListItemDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Self-change, env-admin demote, or last-admin demote' })
  changeRole(
    @CurrentUser() user: User | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeUserRoleDto,
  ): Promise<AdminUserListItem> {
    return this.adminUsers.changeRole(id, requireCaller(user).id, body.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete a customer account (bookings/posts-free only)' })
  @ApiOkResponse({ type: DeletedUserDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Self, admin target, has bookings, or authored posts' })
  remove(
    @CurrentUser() user: User | null,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; email: string }> {
    return this.adminUsers.deleteUser(id, requireCaller(user).id);
  }
}
```

- [ ] **Step 3: Module.** In `users.module.ts`: add `AdminUsersController` to `controllers` and `AdminUsersService` to `providers` (imports already include `MediaModule`; `UsersService` is already a provider — nothing else changes).

- [ ] **Step 4: Verify.** `pnpm nx run @tourism/api:typecheck && pnpm nx test @tourism/api` — clean, 287 pass.

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/users/dto/admin-user.dto.ts apps/api/src/modules/users/admin-users.controller.ts apps/api/src/modules/users/users.module.ts
git commit -m "feat(api): admin users endpoints (list/me/detail/role/delete)"
```

### Task 5 (controller, inline): BE gate + regen

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green.
- [ ] **Step 2: Regen types** per Global Constraints (verify `/admin/users` paths + the 6 DTOs in docs-json). Commit `schema.ts` alone: `chore(core): regen API types (admin users)`.

### Task 6: FE lib — users data/actions (TDD where pure)

**Files:**

- Create: `apps/admin/src/lib/users/data.ts` · `apps/admin/src/lib/users/actions.ts` · `apps/admin/src/lib/users/format.ts` + `format.spec.ts`

**Interfaces:**

- Consumes: regenerated `components['schemas']['AdminUserListItemDto' | 'AdminUserDetailDto' | 'PageMetaDto']` · `getApiClient`/`apiWrite` · `apiErrorMessage`.
- Produces: `listUsers(params: { page?: number; pageSize?: number; role?: 'CUSTOMER' | 'ADMIN'; search?: string })` · `getUser(id: string)` · `getOwnUser()` (GET me) · `changeUserRole(id, role): Promise<{ok, error?}>` · `deleteUser(id): Promise<{ok, error?}>` · `roleActionDisabledReason(detail): string | null` (pure, TDD — returns the explanatory copy when `isSelf`/`isEnvAdmin` blocks the role control, else null).

- [ ] **Step 1: TDD `format.ts`.** Failing tests first (`format.spec.ts`):

```ts
import { roleActionDisabledReason } from './format';

describe('roleActionDisabledReason', () => {
  it('blocks self', () => {
    expect(roleActionDisabledReason({ isSelf: true, isEnvAdmin: false })).toMatch(/own role/);
  });
  it('blocks env admins', () => {
    expect(roleActionDisabledReason({ isSelf: false, isEnvAdmin: true })).toMatch(/ADMIN_EMAILS/);
  });
  it('allows everyone else', () => {
    expect(roleActionDisabledReason({ isSelf: false, isEnvAdmin: false })).toBeNull();
  });
});
```

Implementation:

```ts
/** Why the role control is disabled for this user — null when it is allowed. */
export function roleActionDisabledReason(detail: {
  isSelf: boolean;
  isEnvAdmin: boolean;
}): string | null {
  if (detail.isSelf) return 'You cannot change your own role.';
  if (detail.isEnvAdmin)
    return 'This admin is on the ADMIN_EMAILS bootstrap list — edit the env to change it.';
  return null;
}
```

- [ ] **Step 2: `data.ts`** — typed fetchers mirroring `lib/bookings/data.ts` (list maps 1:1 envelope; single resources unwrap `.data` — copy the `getBooking`/`getDestination` unwrap pattern EXACTLY, per the admin-api-envelope rule): `listUsers` → `GET /api/v1/admin/users`; `getUser(id)` → `GET /api/v1/admin/users/{id}` (unwrap); `getOwnUser()` → `GET /api/v1/admin/users/me` (unwrap). Param types use the generated literal unions (Wave-7 lesson — no `as` casts).

- [ ] **Step 3: `actions.ts`** (`'use server'`): `changeUserRole(id, role)` via `apiWrite('PATCH', \`/api/v1/admin/users/${encodeURIComponent(id)}/role\`, { role })`;`deleteUser(id)` via typed `api.DELETE('/api/v1/admin/users/{id}', …)`; both return`{ ok, error? }` with `apiErrorMessage`,`revalidatePath('/users')`. Add the new 409 codes to`FRIENDLY_BY_CODE` in `apps/admin/src/lib/api/error.ts`:`ROLE_SELF_CHANGE`,`ROLE_ENV_ADMIN`,`ROLE_LAST_ADMIN`,`USER_SELF_DELETE`,`USER_IS_ADMIN`,`USER_HAS_POSTS`,`ACCOUNT_HAS_BOOKINGS` (reuse the API's message tone; check which codes already exist — `ACCOUNT_HAS_BOOKINGS` may).

- [ ] **Step 4: Verify + commit.** `pnpm nx test @tourism/admin` (131 + 3 = 134) · `pnpm nx build @tourism/admin` green.

```bash
git add apps/admin/src/lib/users apps/admin/src/lib/api/error.ts
git commit -m "feat(admin): users lib — fetchers, role/delete actions, friendly errors"
```

### Task 7: users list page (10th TanStack table)

**Files:**

- Create: `apps/admin/src/app/(admin)/users/page.tsx` · `apps/admin/src/components/users/users-table.tsx`
- Modify: `apps/admin/src/components/shell/app-shell.tsx` (Operations group += `{ title: 'Users', href: '/users', icon: <pick a lucide icon used nowhere else in NAV, e.g. UsersRound> }`)

**Interfaces:**

- Consumes: `listUsers` (Task 6) · the server-driven list pattern of `apps/admin/src/app/(admin)/bookings/page.tsx` (URL params `?role=&q=&page=&pageSize=`, `AdminListHeader`, `ErrorAlert`, `Empty`, `ServerTablePagination`) · the TanStack shell pieces (`ColumnsMenu`, `AdminTableShell`) as used by `components/bookings/bookings-table.tsx`.

- [ ] **Step 1: Page.** Mirror `bookings/page.tsx` structure exactly: parse `role` (narrow to `'CUSTOMER' | 'ADMIN'`), `q`, `page`, `pageSize`; fetch `listUsers`; header title "Users", description "Customer and admin accounts. Search by name or email; open one to see their footprint, change their role, or delete the account."; role tabs (All/Admins/Customers) as URL links (the `BookingsFilters` status-tab treatment — copy that component's pattern into `components/users/users-filters.tsx` if it is not generic); table + `ServerTablePagination`; `Empty` state.
- [ ] **Step 2: Table.** `users-table.tsx` client component on the shared foundation (`AdminTableShell` + `ColumnsMenu`; manualPagination — mirror `bookings-table.tsx`): columns Name (link → `/users/[id]`, fallback em-dash + email under it) · Email · Role (Badge: ADMIN = default/emerald, CUSTOMER = outline) · Bookings (count, `enableHiding: true`) · Joined (date). Identity column `enableHiding: false`.
- [ ] **Step 3: Sidebar.** Add the Users item to the Operations group in `app-shell.tsx` (import the icon from lucide-react).
- [ ] **Step 4: Verify + commit.** `pnpm nx build @tourism/admin` green; tests unchanged (134).

```bash
git add "apps/admin/src/app/(admin)/users" apps/admin/src/components/users apps/admin/src/components/shell/app-shell.tsx
git commit -m "feat(admin): users list — role tabs, search, tanstack table; sidebar entry"
```

### Task 8: user detail page + `/users/me` + NavUser cleanup

**Files:**

- Create: `apps/admin/src/app/(admin)/users/[id]/page.tsx` · `apps/admin/src/app/(admin)/users/me/page.tsx` · `apps/admin/src/components/users/user-detail.tsx` · `apps/admin/src/components/users/danger-zone.tsx`
- Modify: `apps/admin/src/components/shell/nav-user.tsx:68-78`

**Interfaces:**

- Consumes: `getUser`/`getOwnUser` (unwrapped detail) · `changeUserRole`/`deleteUser` actions · `roleActionDisabledReason` · detail-page template (`bookings/[code]/page.tsx` layout: back link · header · cards grid) · `Avatar`/`Badge`/`Card`/`Select`/`AlertDialog`/`toast` from `@tourism/ui`.

- [ ] **Step 1: Shared detail component** `user-detail.tsx` (server-renderable presentation + client danger zone as a child): header (Avatar w/ `avatarUrl` + fallback initials · name/email · Role badge · "Env admin" outline chip when `isEnvAdmin` · "You" chip when `isSelf`) · Profile card (`Fact` rows: Phone / Locale / Joined / Updated — copy the local `Fact` helper pattern from the bookings detail page) · Footprint card: 3 rows — Bookings (link `/bookings?userId=${id}` when >0) · Reviews (link `/reviews`) · Wishlist (plain count).
- [ ] **Step 2: `danger-zone.tsx`** (client): Card "Danger zone" —
  - **Role control:** current role + `@tourism/ui` Select (Customer/Admin) + Apply button opening a confirm AlertDialog ("Change {email} from {old} to {new}?"; destructive styling only when demoting); whole control disabled with the `roleActionDisabledReason` text shown muted underneath when non-null; on confirm → `changeUserRole` → toast + `router.refresh()`.
  - **Delete:** destructive Button, hidden/disabled when `isSelf || role === 'ADMIN'` (muted explainer "Demote to customer first" for admins); AlertDialog copy: "Permanently deletes {email}'s account and sign-in. Bookings history blocks deletion. This cannot be undone."; on confirm → `deleteUser` → success: toast + `router.push('/users')`; failure: `toast.error` (friendly 409s from Task 6).
- [ ] **Step 3: Routes.** `[id]/page.tsx`: `getUser(id)` in try/catch → `notFound()`; render back-link "Back to users" + `UserDetail detail={…}`. `me/page.tsx`: `getOwnUser()` → same component (back link too; Next prefers the static `me` segment over `[id]` — no collision).
- [ ] **Step 4: NavUser.** In `nav-user.tsx`: delete the Notifications item; convert the Account item from `disabled` to a working link — mirror how `row-actions.tsx` renders its Edit item (`<DropdownMenuItem render={<Link href="/users/me" />}>` shape, keeping the icon + label); update the stale "Not wired yet" comment.
- [ ] **Step 5: Verify + commit.** `pnpm nx build @tourism/admin` green; 134 tests. Optional dev-mode eyeball if the API runs locally.

```bash
git add "apps/admin/src/app/(admin)/users" apps/admin/src/components/users apps/admin/src/components/shell/nav-user.tsx
git commit -m "feat(admin): user detail + danger zone (role change, delete) + /users/me + navuser link"
```

### Task 9 (controller, inline): slice-1 gate + ecc review + merge

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green (api 287 · admin 134).
- [ ] **Step 2: `ecc:code-reviewer`** on `git diff main...HEAD` with an explicit AUTH angle: syncAdmin OR-path trusts only the mirrored row (never client input) · role/delete guard completeness (self/env/last-admin/admin-target/bookings/posts) · Supabase Admin REST deletion scope · `/admin/users` fully behind `@Roles(ADMIN)` · no PII overexposure on list/detail. Fix cheap MEDIUMs; STOP on CRITICAL/HIGH.
- [ ] **Step 3: Merge.**

```bash
git checkout main && git merge --ff-only feat/admin-users && git branch -d feat/admin-users && git push
```

---

# Slice 2 — Hardening

Branch off `main`: `git checkout -b feat/admin-hardening`

### Task 10: Outbox admin endpoints (TDD)

**Files:**

- Create: `apps/api/src/modules/jobs/admin-outbox.service.ts` · `apps/api/src/modules/jobs/admin-outbox.controller.ts` · `apps/api/src/modules/jobs/dto/admin-outbox.dto.ts`
- Modify: `apps/api/src/modules/jobs/jobs.module.ts` (+controller/provider)
- Test: `apps/api/src/modules/jobs/admin-outbox.service.spec.ts` (new)

**Interfaces:**

- Produces: `GET /admin/outbox?page&pageSize&status?` (newest first; `payload` NEVER selected/exposed) rows `{ id, type, status, attempts, lastError, createdAt, processedAt }` · `POST /admin/outbox/:id/retry` — FAILED only (else 409 `OUTBOX_NOT_FAILED`; 404 `OUTBOX_NOT_FOUND`): sets `status=PENDING` (attempts PRESERVED — the drain's `attempts >= 5 → FAILED` rule then grants exactly ONE more attempt per retry click), returns the updated row. Service names: `AdminOutboxService.list(query)` / `retry(id)`.

- [ ] **Step 1: Failing tests.** `admin-outbox.service.spec.ts` — mirror the `AdminMediaService` spec harness style (makePrisma with `outbox: { findMany, count, findUnique, update }`); tests: (1) list maps rows (ISO dates, no payload key on items — assert `expect(res.items[0]).not.toHaveProperty('payload')`), `orderBy { createdAt: 'desc' }`, status filter AND-composed; (2) retry happy: FAILED row → `update({ where: { id }, data: { status: OutboxStatus.PENDING } })`, attempts untouched; (3) retry on a PENDING/SENT row → ConflictException; (4) retry unknown id → NotFoundException. Write the actual test code following the exact conventions of `apps/api/src/modules/media/admin-media.service.spec.ts` (same file layout: Mocks interface, makePrisma, svcWith).
- [ ] **Step 2: Run red.** `pnpm nx test @tourism/api`.
- [ ] **Step 3: Implement** `admin-outbox.service.ts`:

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailType, OutboxStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAdminOutboxQueryDto } from './dto/admin-outbox.dto';

/** One outbox row — metadata only (`payload` carries entity refs; never exposed). */
export interface AdminOutboxRow {
  id: string;
  type: EmailType;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PaginatedAdminOutbox {
  items: AdminOutboxRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/**
 * Admin visibility over the transactional-email outbox (ADR-0007). Retry does
 * NOT send inline — it resets a FAILED row to PENDING so the next drain tick
 * (1m cron) picks it up; `attempts` is preserved, so the drain's
 * `attempts >= MAX → FAILED` rule grants exactly one extra attempt per click.
 */
@Injectable()
export class AdminOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAdminOutboxQueryDto): Promise<PaginatedAdminOutbox> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.OutboxWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.outbox.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
          processedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.outbox.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        attempts: r.attempts,
        lastError: r.lastError,
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async retry(id: string): Promise<AdminOutboxRow> {
    const row = await this.prisma.outbox.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        code: 'OUTBOX_NOT_FOUND',
        message: `Outbox row "${id}" not found`,
      });
    }
    if (row.status !== OutboxStatus.FAILED) {
      throw new ConflictException({
        code: 'OUTBOX_NOT_FAILED',
        message: 'Only FAILED emails can be retried',
      });
    }
    const updated = await this.prisma.outbox.update({
      where: { id },
      data: { status: OutboxStatus.PENDING },
    });
    return {
      id: updated.id,
      type: updated.type,
      status: updated.status,
      attempts: updated.attempts,
      lastError: updated.lastError,
      createdAt: updated.createdAt.toISOString(),
      processedAt: updated.processedAt ? updated.processedAt.toISOString() : null,
    };
  }
}
```

`dto/admin-outbox.dto.ts`: `ListAdminOutboxQueryDto` (page/pageSize like the media garbage query + optional `@IsEnum(OutboxStatus) status?`) + `AdminOutboxRowDto` (mirror the interface with `@ApiProperty`, enums for type/status, nullables) + `PaginatedAdminOutboxDto { data, meta }`. Controller `admin-outbox.controller.ts`: `@ApiTags('Outbox (Admin)') @ApiBearerAuth('supabase-jwt') @Roles(UserRole.ADMIN) @Controller('admin/outbox')` — `GET /` (list) + `POST :id/retry` (`@HttpCode(OK)`, `ParseUUIDPipe`, 404/409 documented). Register both in `jobs.module.ts` (`controllers: [AdminOutboxController]`, provider added; JobsModule keeps exporting what it already does).

- [ ] **Step 4: Green + typecheck + commit.**

```bash
git add apps/api/src/modules/jobs
git commit -m "feat(api): admin outbox — email queue list + retry-failed"
```

### Task 11 (controller inline regen, then implementer): Outbox FE page

- Controller first runs the regen routine (`chore(core): regen API types (admin outbox)`).

**Files:**

- Create: `apps/admin/src/lib/outbox/data.ts` · `apps/admin/src/lib/outbox/actions.ts` · `apps/admin/src/app/(admin)/outbox/page.tsx` · `apps/admin/src/components/outbox/outbox-view.tsx`
- Modify: `apps/admin/src/components/shell/app-shell.tsx` (Operations += `{ title: 'Email queue', href: '/outbox', icon: MailWarning }` or a fitting lucide icon)

**Interfaces:**

- Consumes: generated `AdminOutboxRowDto` · the Garbage-tab twin (`components/media/garbage-view.tsx` — copy its table/count/empty/Spinner-button layout) · `ServerTablePagination` · status-tab URL pattern.
- Produces: `/outbox` — status tabs All/Pending/Sent/Failed (`?status=`) · compact table (Type · Status badge [FAILED destructive · PENDING outline · SENT muted] · Attempts · Last error truncate · Queued · Processed) · per-FAILED-row **Retry** button → `retryOutbox(id)` server action (`apiWrite('POST', …/retry)`) → toast "Queued for the next send pass." + refresh · empty state "No emails in the queue.". Server-driven pagination.
- Verify build/tests; commit `feat(admin): email queue page — outbox visibility + retry`.

### Task 12: dashboard DataTable de-fake

**Files:**

- Modify: `apps/admin/src/components/dashboard/data-table.tsx`

**Interfaces:**

- Consumes: audit findings — drag-reorder (DndContext/DragHandle ~L89-103, L292), inline-edit cells (~L163-202 `editCell`), row checkboxes + "N selected" footer (~L136-149, L326-328), row-detail Drawer (~L365-404). Booking rows carry a `code` (verify the row type in the file).

- [ ] **Step 1:** Strip the fake affordances: remove the `DndContext`/`SortableContext`/`DragHandle` wrapper + the drag column · replace editable Tour/Amount cells with plain text renders · remove the checkbox column, selection state and the "N of M selected" footer line · remove the Drawer and its trigger — the row's code cell becomes a `<Link href={/bookings/${code}}>` (mono, hover underline, matching the bookings-table code cell). Remove now-unused imports (`@dnd-kit/*`, Drawer parts, Checkbox, Input where only edit cells used it). KEEP: status tabs + counts, ColumnsMenu, pagination, column defs otherwise.
- [ ] **Step 2:** `pnpm nx build @tourism/admin` green · `pnpm nx test @tourism/admin` unchanged. Grep the file for `dnd-kit|Drawer|Checkbox` → no hits.
- [ ] **Step 3: Commit.** `git add apps/admin/src/components/dashboard/data-table.tsx && git commit -m "refactor(admin): dashboard recent-bookings table — drop demo-only affordances, link real detail"`

### Task 13: TopTours currency + tablist keyboard nav

**Files:**

- Modify: `apps/admin/src/components/dashboard/top-tours-card.tsx` (+ its parent that owns `stats` — pass `currency`)

- [ ] **Step 1:** Currency: give `TopToursCard` a `currency: string` prop, pass `stats.overview.currency` from the dashboard page/section that renders it (find the call site; SectionCards already consumes `overview.currency` — same source), replace the hardcoded `'USD'` at ~L88 with the prop.
- [ ] **Step 2:** Tablist a11y at ~L56-78: give each panel/section an `id` (`top-tours-panel`), tabs get `aria-controls`, `tabIndex={active ? 0 : -1}`, and an `onKeyDown` on the tablist handling ArrowLeft/ArrowRight (move focus + select, wrapping) per the ARIA tabs pattern. Keep the existing click behavior.
- [ ] **Step 3:** Build green; commit `fix(admin): top-tours card — real currency + tablist keyboard navigation`.

### Task 14 (controller, inline): slice-2 gate + ecc + merge + docs/memory

- [ ] **Step 1: Gate.** `pnpm nx affected -t lint test build --exclude=@tourism/mobile` — green.
- [ ] **Step 2: `ecc:code-reviewer`** on the slice diff (outbox surface: payload never exposed; retry semantics; UI-only tasks sanity).
- [ ] **Step 3: Merge.** ff-merge `feat/admin-hardening` → `main`, push, delete branch.
- [ ] **Step 4: Docs + memory (standing workflow).** STATUS prepend on this plan · spec unchanged · memory `tourism-platform-state` new DONE entry (**ADMIN DECLARED DONE** — Users + hardening shipped; next = P6 web blog reader) + MEMORY.md index line · commit docs alone: `docs: mark admin completeness wave done — admin DONE`.
- [ ] **Step 5: Tell the user**: deployed (Render lag note); live checks — log into admin, open Users, verify own row shows "You"+env-admin chip; promote a test customer → sign into admin with that account (DB-grant path proof); Email queue page shows the outbox.

## Self-review notes (plan ↔ spec)

- Spec coverage: syncAdmin OR-grant → T1 · list/detail+flags → T2 · role/delete guards (incl. USER_HAS_POSTS, verified Restrict) → T3 · deleteMe avatar-leak fix (targeted improvement) → T3 · endpoints/DTOs/me-route → T4 · regen → T5/T11 · FE lib/errors → T6 · list+sidebar → T7 · detail/danger-zone/users-me/NavUser → T8 · auth-angle ecc → T9 · outbox list/retry (payload hidden, attempts preserved) → T10 · outbox FE → T11 · DataTable de-fake → T12 · currency+tablist → T13 · docs/memory + admin-DONE → T14. No gaps.
- Type consistency: `AdminUserListItem/Detail` (T2) ↔ DTOs (T4) ↔ FE reads (T6-8); `AdminOutboxRow` (T10) ↔ `AdminOutboxRowDto` (T10) ↔ FE (T11); `deleteSupabaseUser` public (T3) consumed by `AdminUsersService` (T3).
- Per-commit typecheck: T2 explicitly defers `ConflictException`/post/users-mock spec pieces to T3 (the NOTE) — no parked imports.
