import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
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
import { UploadPurpose } from '../uploads/dto/create-signed-upload-url.dto';
import {
  type SignedUploadParams,
  UploadsService,
} from '../uploads/uploads.service';
import { SetAvatarDto } from './dto/set-avatar.dto';
import { SignAvatarDto } from './dto/sign-avatar.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserDto } from './dto/user.dto';
import { UsersService, UserWithAvatar } from './users.service';

/**
 * The current user's own profile. Every endpoint needs a valid JWT AND a synced
 * local row; a null `@CurrentUser()` (authenticated but never synced) becomes a
 * 401 `USER_NOT_SYNCED` so the FE knows to retry `/auth/sync`. Responses carry
 * `avatarUrl` (Cloudinary delivery URL or null).
 */
@ApiTags('Users')
@ApiBearerAuth('supabase-jwt')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * `POST /users/me/avatar/sign` — sign a Cloudinary direct upload for the caller's avatar. Unlike the
   * admin signing endpoint, `purpose` is pinned to `USER_AVATAR` server-side so a customer can only
   * ever upload into their own avatar folder. The FE uploads the bytes to Cloudinary, then calls
   * `PUT /users/me/avatar` with the returned `publicId`.
   */
  @Post('me/avatar/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign a Cloudinary avatar upload for the caller' })
  @ApiOkResponse({
    description: 'Signed upload params (purpose pinned to USER_AVATAR)',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid JWT or not synced',
  })
  signAvatar(
    @CurrentUser() user: User | null,
    @Body() body: SignAvatarDto,
  ): SignedUploadParams {
    this.requireUser(user);
    return this.uploadsService.createSignedUploadParams({
      purpose: UploadPurpose.USER_AVATAR,
      filename: body.filename,
      contentType: body.contentType,
    });
  }

  /** `GET /users/me` — the caller's profile. */
  @Get('me')
  @ApiOperation({ summary: 'Return the current user profile' })
  @ApiOkResponse({ type: UserDto, description: 'Profile' })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid JWT or not synced',
  })
  getMe(@CurrentUser() user: User | null): Promise<UserWithAvatar> {
    return this.usersService.getMe(this.requireUser(user).id);
  }

  /** `PATCH /users/me` — partial profile update (validated by `UpdateMeDto`). */
  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ type: UserDto, description: 'Updated profile' })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid JWT or not synced',
  })
  updateMe(
    @CurrentUser() user: User | null,
    @Body() body: UpdateMeDto,
  ): Promise<UserWithAvatar> {
    return this.usersService.updateMe(this.requireUser(user).id, body);
  }

  /** `PUT /users/me/avatar` — set/replace the caller's avatar (single image). */
  @Put('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set the caller's avatar from a Cloudinary upload" })
  @ApiOkResponse({ type: UserDto, description: 'Profile with new avatarUrl' })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid JWT or not synced',
  })
  setAvatar(
    @CurrentUser() user: User | null,
    @Body() body: SetAvatarDto,
  ): Promise<UserWithAvatar> {
    return this.usersService.setAvatar(this.requireUser(user).id, body);
  }

  /** `DELETE /users/me/avatar` — clear the caller's avatar. */
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Clear the caller's avatar" })
  @ApiOkResponse({ type: UserDto, description: 'Profile with avatarUrl null' })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid JWT or not synced',
  })
  clearAvatar(@CurrentUser() user: User | null): Promise<UserWithAvatar> {
    return this.usersService.clearAvatar(this.requireUser(user).id);
  }

  /** `DELETE /users/me` — delete the caller's account (409 if they still have bookings). */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the current account' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid JWT or not synced',
  })
  @ApiResponse({ status: 409, description: 'Account still has bookings' })
  async deleteMe(@CurrentUser() user: User | null): Promise<void> {
    const caller = this.requireUser(user);
    await this.usersService.deleteMe({
      id: caller.id,
      supabaseId: caller.supabaseId,
    });
  }

  /** Narrow `User | null` → `User`, raising the synced-row 401 otherwise. */
  private requireUser(user: User | null): User {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message:
          'Authenticated but local user record missing — call POST /auth/sync',
      });
    }
    return user;
  }
}
