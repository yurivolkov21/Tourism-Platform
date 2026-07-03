import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
}
