import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ListPaymentEventsQueryDto,
  PaginatedPaymentEventsDto,
} from './dto/admin-payment-event.dto';
import {
  AdminPaymentEventsService,
  PaginatedPaymentEvents,
} from './admin-payment-events.service';

/**
 * Read-only webhook log viewer mounted at `/admin/payment-events` — the
 * `payment_events` idempotency table (ADR-0006) with the raw payload for
 * debugging, plus a best-effort derived booking link.
 *
 * Auth: verified Supabase JWT + `role === ADMIN`.
 */
@ApiTags('Admin / Payment events')
@ApiBearerAuth('supabase-jwt')
@Controller('admin/payment-events')
export class AdminPaymentEventsController {
  constructor(private readonly service: AdminPaymentEventsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List provider webhook events (paginated, filterable)',
  })
  @ApiOkResponse({ type: PaginatedPaymentEventsDto })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  list(
    @Query() query: ListPaymentEventsQueryDto,
  ): Promise<PaginatedPaymentEvents> {
    return this.service.findAllForAdmin(query);
  }
}
