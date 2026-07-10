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
  @ApiOperation({
    summary: 'Admin: list users (paginated, filter by role, search name/email)',
  })
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
  @ApiOperation({
    summary: 'Admin: one user with footprint counts + action flags',
  })
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
  @ApiOperation({
    summary:
      "Admin: change a user's role (guards: self / env-admin / last admin)",
  })
  @ApiOkResponse({ type: AdminUserListItemDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description: 'Self-change, env-admin demote, or last-admin demote',
  })
  changeRole(
    @CurrentUser() user: User | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeUserRoleDto,
  ): Promise<AdminUserListItem> {
    return this.adminUsers.changeRole(id, requireCaller(user).id, body.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: delete a customer account (bookings/posts-free only)',
  })
  @ApiOkResponse({ type: DeletedUserDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description: 'Self, admin target, has bookings, or authored posts',
  })
  remove(
    @CurrentUser() user: User | null,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string; email: string }> {
    return this.adminUsers.deleteUser(id, requireCaller(user).id);
  }
}
