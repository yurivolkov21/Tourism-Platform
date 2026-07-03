import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailType, OutboxStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Query string for `GET /admin/outbox` — pagination + optional status filter. */
export class ListAdminOutboxQueryDto {
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

  @ApiPropertyOptional({ enum: OutboxStatus })
  @IsOptional()
  @IsEnum(OutboxStatus)
  status?: OutboxStatus;
}

/** One outbox row — metadata only (`payload` carries entity refs; never exposed). */
export class AdminOutboxRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: EmailType })
  type!: EmailType;

  @ApiProperty({ enum: OutboxStatus })
  status!: OutboxStatus;

  @ApiProperty({ example: 0 })
  attempts!: number;

  @ApiProperty({ nullable: true, type: String })
  lastError!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  processedAt!: string | null;
}

/** Enveloped outbox list (`TransformInterceptor` hoists items→data + meta). */
export class PaginatedAdminOutboxDto {
  @ApiProperty({ type: [AdminOutboxRowDto] })
  data!: AdminOutboxRowDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
