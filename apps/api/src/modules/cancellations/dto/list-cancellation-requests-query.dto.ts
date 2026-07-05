import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListCancellationRequestsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: CancellationRequestStatus, description: 'Defaults to REQUESTED' })
  @IsOptional() @IsEnum(CancellationRequestStatus)
  status?: CancellationRequestStatus;
}
