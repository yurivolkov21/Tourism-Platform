import {
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

/**
 * The current user's own profile. Both endpoints need a valid JWT AND a synced
 * local row; a null `@CurrentUser()` (authenticated but never synced) becomes a
 * 401 `USER_NOT_SYNCED` so the FE knows to retry `/auth/sync`.
 */
@ApiTags('Users')
@ApiBearerAuth('supabase-jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** `GET /users/me` — the caller's profile. */
  @Get('me')
  @ApiOperation({ summary: 'Return the current user profile' })
  @ApiOkResponse({ type: UserDto, description: 'Profile' })
  @ApiResponse({ status: 401, description: 'Missing/invalid JWT or not synced' })
  getMe(@CurrentUser() user: User | null): Promise<User> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message:
          'Authenticated but local user record missing — call POST /auth/sync',
      });
    }
    return this.usersService.getMe(user.id);
  }

  /** `PATCH /users/me` — partial profile update (validated by `UpdateMeDto`). */
  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ type: UserDto, description: 'Updated profile' })
  @ApiResponse({ status: 401, description: 'Missing/invalid JWT or not synced' })
  updateMe(
    @CurrentUser() user: User | null,
    @Body() body: UpdateMeDto,
  ): Promise<User> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message:
          'Authenticated but local user record missing — call POST /auth/sync',
      });
    }
    return this.usersService.updateMe(user.id, body);
  }
}
