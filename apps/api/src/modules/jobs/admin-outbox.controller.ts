import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminOutboxService, AdminOutboxRow, PaginatedAdminOutbox } from './admin-outbox.service';
import { AdminOutboxRowDto, ListAdminOutboxQueryDto, PaginatedAdminOutboxDto } from './dto/admin-outbox.dto';

/**
 * Admin visibility over the transactional-email outbox at `/admin/outbox`
 * (ADR-0007) — paginated/filterable list (`payload` never exposed) and a
 * retry action for FAILED rows. Gated by `@Roles(ADMIN)`.
 */
@ApiTags('Outbox (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/outbox')
export class AdminOutboxController {
  constructor(private readonly adminOutbox: AdminOutboxService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list outbox rows (paginated, filter by status, newest first)' })
  @ApiOkResponse({ type: PaginatedAdminOutboxDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(@Query() query: ListAdminOutboxQueryDto): Promise<PaginatedAdminOutbox> {
    return this.adminOutbox.list(query);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: retry a FAILED outbox row (resets to PENDING for the next drain tick)' })
  @ApiOkResponse({ type: AdminOutboxRowDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'Outbox row not found' })
  @ApiResponse({ status: 409, description: 'Row is not FAILED' })
  retry(@Param('id', ParseUUIDPipe) id: string): Promise<AdminOutboxRow> {
    return this.adminOutbox.retry(id);
  }
}
