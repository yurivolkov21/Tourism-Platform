import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * Optional profile fields the frontend may send on `/auth/sync`.
 *
 * Trust model: identity (`sub`, `email`) comes from the verified JWT only —
 * never from this body. That's why there's no `email`/`id` here. All fields
 * optional so re-syncing every login is cheap. (EN-only: no `locale` field.)
 */
export class SyncUserDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: '+84901234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;
}
