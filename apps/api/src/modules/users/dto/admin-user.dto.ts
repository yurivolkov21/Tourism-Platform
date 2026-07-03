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
