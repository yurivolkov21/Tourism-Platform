import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EnquiryStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min, IsString, MaxLength } from 'class-validator';

/**
 * Query string for `GET /admin/enquiries`. Pagination + optional CRM `status`
 * filter so the admin can isolate a pipeline stage (e.g. `?status=NEW`).
 */
export class ListEnquiriesQueryDto {
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

  @ApiPropertyOptional({ enum: EnquiryStatus })
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  /** Free-text search across name, email, phone, and message (case-insensitive). */
  @ApiPropertyOptional({ example: 'sapa', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
