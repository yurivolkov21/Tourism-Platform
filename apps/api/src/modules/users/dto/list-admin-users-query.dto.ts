import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Query string for `GET /admin/users`. Pagination plus an optional `role`
 * filter and a free-text `search` (case-insensitive contains on full name and
 * email — email is citext). Newest first.
 */
export class ListAdminUsersQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** Filter by role; omit for all. */
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Case-insensitive match on full name / email; trimmed, empty = no filter. */
  @ApiPropertyOptional({ example: 'jane', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
