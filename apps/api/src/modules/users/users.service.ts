import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaOwnerType, MediaRole, MediaType, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaInputDto } from '../media/dto/media.dto';
import { MediaService } from '../media/media.service';
import { SetAvatarDto } from './dto/set-avatar.dto';
import { UpdateMeDto } from './dto/update-me.dto';

/** A `User` enriched with the Cloudinary delivery URL of its avatar (if any). */
export type UserWithAvatar = User & { avatarUrl: string | null };

/**
 * Read + self-update on the local `users` table. Scope: what a user may do to
 * themselves. Admin-on-other-users belongs in a future AdminUsersService.
 *
 * The avatar lives as a polymorphic `MediaAsset(ownerType=USER, role=avatar)`
 * (not a column) — set via `MediaService.syncAssets` (single-asset replace-all)
 * and read back as a delivery URL on every profile response.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Delete the caller's account. Refuses (409) while the user still has bookings — `Booking.user` is
   * `onDelete: Restrict` and we keep financial records, so those users are routed to support. Otherwise
   * deletes the local row (cascades reviews + wishlist) then removes the Supabase auth user via the
   * Admin REST API (service-role key — no extra dependency).
   */
  async deleteMe(user: Pick<User, 'id' | 'supabaseId'>): Promise<void> {
    const bookings = await this.prisma.booking.count({
      where: { userId: user.id },
    });
    if (bookings > 0) {
      throw new ConflictException({
        code: 'ACCOUNT_HAS_BOOKINGS',
        message:
          'Your account has bookings on record. Please contact support to close it.',
      });
    }

    // Avatar media has no FK to users (polymorphic) — clean + garbage-queue it
    // in the same tx as the row delete, exactly like every other owner delete.
    await this.prisma.$transaction(async (tx) => {
      await this.media.deleteForOwner(tx, MediaOwnerType.USER, user.id);
      await tx.user.delete({ where: { id: user.id } });
    });
    await this.deleteSupabaseUser(user.supabaseId);
  }

  /**
   * Best-effort removal of the Supabase auth identity (so the email can no
   * longer sign in). Shared with `AdminUsersService` (admin-initiated deletion).
   */
  async deleteSupabaseUser(supabaseId: string): Promise<void> {
    const url = this.config.getOrThrow<string>('supabase.url');
    const key = this.config.getOrThrow<string>('supabase.serviceRoleKey');
    try {
      const res = await fetch(`${url}/auth/v1/admin/users/${supabaseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}`, apikey: key },
      });
      if (!res.ok) {
        this.logger.warn(
          `Supabase auth user delete returned ${res.status} for ${supabaseId}`,
        );
      }
    } catch (e) {
      this.logger.warn(`Supabase auth user delete failed for ${supabaseId}: ${String(e)}`);
    }
  }

  /**
   * Fetch a `User` by primary key (+ avatar URL). The 404 is a defensive
   * fallback for the rare case the row is deleted between the guard and here.
   */
  async getMe(userId: string): Promise<UserWithAvatar> {
    return this.attachAvatar(await this.findOrThrow(userId));
  }

  /**
   * Partial profile update. Each field is included only when sent:
   * `undefined` → keep, `''` → null (clear), non-empty → trim + store.
   */
  async updateMe(userId: string, body: UpdateMeDto): Promise<UserWithAvatar> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.fullName !== undefined
          ? { fullName: body.fullName.trim() || null }
          : {}),
        ...(body.phone !== undefined
          ? { phone: body.phone.trim() || null }
          : {}),
      },
    });
    return this.attachAvatar(updated);
  }

  /**
   * Replace the caller's avatar. The client supplies only Cloudinary fields; we
   * force `type=IMAGE`/`role=avatar` and replace-all (one asset) in a tx so the
   * media row commits with the (no-op) owner read.
   */
  async setAvatar(userId: string, dto: SetAvatarDto): Promise<UserWithAvatar> {
    const user = await this.findOrThrow(userId);
    const item: MediaInputDto = {
      publicId: dto.publicId,
      type: MediaType.IMAGE,
      role: MediaRole.avatar,
      format: dto.format,
      width: dto.width,
      height: dto.height,
    };
    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.USER, userId, [item]),
    );
    this.logger.log(`User ${userId} set avatar ${dto.publicId}`);
    return this.attachAvatar(user);
  }

  /** Clear the caller's avatar (replace-all with the empty set). */
  async clearAvatar(userId: string): Promise<UserWithAvatar> {
    const user = await this.findOrThrow(userId);
    await this.prisma.$transaction((tx) =>
      this.media.syncAssets(tx, MediaOwnerType.USER, userId, []),
    );
    this.logger.log(`User ${userId} cleared avatar`);
    return this.attachAvatar(user);
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async findOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found — call POST /auth/sync first',
      });
    }
    return user;
  }

  /** A USER owner has at most one media asset (the avatar) → first url, or null. */
  private async attachAvatar(user: User): Promise<UserWithAvatar> {
    const withMedia = await this.media.attachToOwner(MediaOwnerType.USER, user);
    return { ...user, avatarUrl: withMedia.media[0]?.url ?? null };
  }
}
