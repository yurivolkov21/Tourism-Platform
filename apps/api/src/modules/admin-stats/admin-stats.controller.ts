import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminStatsResponseDto } from './dto/admin-stats-response.dto';
import { AdminStatsResponse, AdminStatsService } from './admin-stats.service';

/**
 * Admin dashboard aggregator mounted at `/admin/stats`. A single wide endpoint —
 * the FE renders revenue cards, the status breakdown, top-N tables, and a
 * 6-month trend chart from one request.
 *
 * Auth: verified Supabase JWT + `role === ADMIN` (`RolesGuard` enforces `@Roles`).
 */
@ApiTags('Admin / Stats')
@ApiBearerAuth('supabase-jwt')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dashboard aggregates (revenue, top tours, trend)' })
  @ApiOkResponse({
    type: AdminStatsResponseDto,
    description: 'Aggregated stats',
  })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  get(): Promise<AdminStatsResponse> {
    return this.statsService.getDashboard();
  }
}
