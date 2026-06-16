import { ApiPropertyOptional } from '@nestjs/swagger';
import { DepartureStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

/**
 * Query string for `GET /tours/:slug/departures` (public) and the admin variant.
 * Defaults differ per surface (applied in the service):
 *  - Public: `from = today`, `status = OPEN` — end users don't browse past or
 *    cancelled departures.
 *  - Admin: no defaults — full history (CLOSED / CANCELLED included) for audit.
 */
export class ListDeparturesQueryDto {
  /** Inclusive lower bound on `startDate`. ISO 8601 (`YYYY-MM-DD`). */
  @ApiPropertyOptional({ example: '2026-06-01', description: 'ISO 8601 date' })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  /** Inclusive upper bound on `startDate`. ISO 8601 (`YYYY-MM-DD`). */
  @ApiPropertyOptional({ example: '2026-12-31', description: 'ISO 8601 date' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: DepartureStatus })
  @IsOptional()
  @IsEnum(DepartureStatus)
  status?: DepartureStatus;
}
