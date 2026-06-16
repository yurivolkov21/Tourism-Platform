import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { SupabaseIdentity } from '../../common/decorators/current-user.decorator';
import type { SupabaseAuthIdentity } from '../../common/types/authenticated-request';
import { UserDto } from '../users/dto/user.dto';
import { AuthService } from './auth.service';
import { SyncUserDto } from './dto/sync-user.dto';

/**
 * HTTP surface for user-mirroring. Both endpoints require a valid JWT (the
 * global `SupabaseJwtGuard` runs first); identity comes from `@SupabaseIdentity()`,
 * never the body. `@HttpCode(200)` since these are idempotent create-or-refresh.
 */
@ApiTags('Auth')
@ApiBearerAuth('supabase-jwt')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** `POST /auth/sync` — mirror the JWT-bearing user as CUSTOMER (idempotent). */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync the JWT-bearing user into local DB as CUSTOMER',
    description:
      'Idempotent. First call creates a `User` keyed by the Supabase `sub`; later calls refresh profile fields. Call once after sign-in/up.',
  })
  @ApiOkResponse({ type: UserDto, description: 'User upserted' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  syncCustomer(
    @SupabaseIdentity() identity: SupabaseAuthIdentity,
    @Body() body: SyncUserDto,
  ): Promise<User> {
    return this.authService.syncCustomer(identity, body);
  }

  /** `POST /auth/admin/sync` — same upsert, ADMIN, allowlist-gated. */
  @Post('admin/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync the JWT-bearing user as ADMIN (allowlist gated)',
    description:
      'Elevates to ADMIN; caller email must be in `ADMIN_EMAILS`, else 403. Idempotent.',
  })
  @ApiOkResponse({ type: UserDto, description: 'User upserted as ADMIN' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Email not on admin allowlist' })
  syncAdmin(
    @SupabaseIdentity() identity: SupabaseAuthIdentity,
    @Body() body: SyncUserDto,
  ): Promise<User> {
    return this.authService.syncAdmin(identity, body);
  }
}
