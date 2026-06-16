import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@prisma/client';
import type { SupabaseAuthIdentity } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncUserDto } from './dto/sync-user.dto';

/**
 * Mirrors Supabase Auth users into the local `users` table.
 *
 * Why mirror: (1) FKs — bookings/reviews reference `users.id`; (2) profile —
 * our domain has fields Supabase doesn't (phone, role). The sync is
 * **idempotent**; only `/auth/admin/sync` does an allowlist check before
 * promoting to ADMIN. (Ported from the donor; EN-only — no locale handling,
 * `User.locale` keeps its DB default of `"en"`.)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Upserts the JWT-bearing user as a CUSTOMER. First call creates the row;
   * subsequent calls refresh profile fields but never touch `role` — so a
   * prior ADMIN promotion is not silently undone by a customer-FE re-sync.
   */
  async syncCustomer(
    identity: SupabaseAuthIdentity,
    body: SyncUserDto,
  ): Promise<User> {
    return this.upsert(identity, body, UserRole.CUSTOMER);
  }

  /**
   * Upserts the JWT-bearing user as ADMIN — gated by the `ADMIN_EMAILS`
   * allowlist. Not on the list → `ForbiddenException('NOT_ADMIN')` (we do NOT
   * silently fall back to CUSTOMER). On the list → forces `role = ADMIN`.
   */
  async syncAdmin(
    identity: SupabaseAuthIdentity,
    body: SyncUserDto,
  ): Promise<User> {
    const allowlist = this.config.get<string[]>('supabase.adminEmails') ?? [];
    if (!allowlist.includes(identity.email.toLowerCase())) {
      throw new ForbiddenException({
        code: 'NOT_ADMIN',
        message: 'This email is not on the admin allowlist',
      });
    }
    return this.upsert(identity, body, UserRole.ADMIN);
  }

  /**
   * Shared upsert. `email` is lowercased (DB column is citext-unique).
   * `fullName`/`phone` are trimmed; blank → null. On update, ADMIN sync
   * promotes; CUSTOMER sync omits `role` (preserves any prior promotion).
   */
  private async upsert(
    identity: SupabaseAuthIdentity,
    body: SyncUserDto,
    role: UserRole,
  ): Promise<User> {
    const fullName = body.fullName?.trim() || null;
    const phone = body.phone?.trim() || null;
    const emailLower = identity.email.toLowerCase();
    const updateRole = role === UserRole.ADMIN ? { role } : {};

    const user = await this.prisma.user.upsert({
      where: { supabaseId: identity.sub },
      create: {
        supabaseId: identity.sub,
        email: emailLower,
        fullName,
        phone,
        role,
      },
      update: {
        email: emailLower,
        // Only overwrite when provided — an empty re-sync must not wipe data.
        ...(fullName !== null ? { fullName } : {}),
        ...(phone !== null ? { phone } : {}),
        ...updateRole,
      },
    });

    this.logger.log(
      `Synced ${user.role.toLowerCase()} ${user.email} (supabaseId=${user.supabaseId})`,
    );
    return user;
  }
}
