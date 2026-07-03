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
   * Upserts the JWT-bearing user as ADMIN. Two grant paths:
   * (1) BOOTSTRAP — email on the `ADMIN_EMAILS` env allowlist (always wins,
   *     survives any DB state) — forces `role = ADMIN` on write;
   * (2) DB ROLE — the MIRRORED user row is already `role=ADMIN` (promoted via
   *     the admin Users module). Never derived from client input. This path
   *     never WRITES role — it refreshes the profile only, so a concurrent
   *     demotion cannot be raced back to ADMIN (the check-read passing and
   *     then re-forcing `role: ADMIN` would silently undo a revocation that
   *     committed in between; instead the row keeps whatever role it has at
   *     write time, and a demoted user's later admin API calls 403 via
   *     RolesGuard).
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
    // CUSTOMER here means "refresh profile, never touch role" (see `updateRole` in upsert) —
    // deliberate: the row is already ADMIN unless a concurrent demotion landed, and we must not
    // write ADMIN back over that demotion.
    return this.upsert(identity, body, UserRole.CUSTOMER);
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
    // Profile fields refreshed on every sync. Only overwrite when provided — an empty re-sync must
    // not wipe data — and a customer sync never sets `role` (preserves any prior ADMIN promotion).
    const profile = {
      email: emailLower,
      ...(fullName !== null ? { fullName } : {}),
      ...(phone !== null ? { phone } : {}),
      ...updateRole,
    };

    // Resolve the row by its two unique keys in parallel (the single-connection pooler can't batch a
    // $transaction, but parallel reads are fine — BLUEPRINT gotcha).
    const [bySub, byEmail] = await Promise.all([
      this.prisma.user.findUnique({ where: { supabaseId: identity.sub } }),
      this.prisma.user.findUnique({ where: { email: emailLower } }),
    ]);

    let user: User;
    if (bySub) {
      // Known identity → refresh the profile.
      user = await this.prisma.user.update({ where: { id: bySub.id }, data: profile });
    } else if (byEmail) {
      // No row for this Supabase id yet, but one already owns this (Supabase-verified) email — e.g. a
      // seeded user, or a Supabase account re-created with a new id. Relink that row to this identity
      // instead of colliding on the unique `email`. Safe: Supabase only issues a JWT after the email
      // is confirmed, so the caller provably controls this address.
      user = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { ...profile, supabaseId: identity.sub },
      });
    } else {
      // Brand-new user.
      user = await this.prisma.user.create({
        data: { supabaseId: identity.sub, email: emailLower, fullName, phone, role },
      });
    }

    this.logger.log(
      `Synced ${user.role.toLowerCase()} ${user.email} (supabaseId=${user.supabaseId})`,
    );
    return user;
  }
}
