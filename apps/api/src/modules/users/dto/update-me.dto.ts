import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * Request body for `PATCH /users/me`. Only self-mutable profile fields.
 * Absent on purpose: `email` (Supabase-managed), `role` (admin-only),
 * `id`/`supabaseId` (immutable). EN-only — no `locale`.
 */
export class UpdateMeDto {
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
