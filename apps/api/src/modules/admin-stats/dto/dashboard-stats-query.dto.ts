import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Query string for `GET /admin/stats/dashboard`. Both bounds are optional and
 * independent `YYYY-MM-DD` strings interpreted as UTC day bounds by the
 * service (which also rejects calendar-invalid dates, e.g. `2026-02-30`, and
 * `from > to`). No params = today's full-history output (backwards
 * compatible).
 */
export class DashboardStatsQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'UTC day, inclusive',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'UTC day, inclusive',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
