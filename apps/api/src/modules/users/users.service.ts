import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

/**
 * Read + self-update on the local `users` table. Scope: what a user may do to
 * themselves. Admin-on-other-users belongs in a future AdminUsersService.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a `User` by primary key. The 404 is a defensive fallback for the rare
   * case the row is deleted between the guard and this query.
   */
  async getMe(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found — call POST /auth/sync first',
      });
    }
    return user;
  }

  /**
   * Partial profile update. Each field is included only when sent:
   * `undefined` → keep, `''` → null (clear), non-empty → trim + store.
   */
  async updateMe(userId: string, body: UpdateMeDto): Promise<User> {
    return this.prisma.user.update({
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
  }
}
