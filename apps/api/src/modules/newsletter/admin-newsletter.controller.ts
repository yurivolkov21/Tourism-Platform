import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListSubscribersQueryDto } from './dto/list-subscribers-query.dto';
import { PaginatedSubscribersDto } from './dto/subscriber.dto';
import { NewsletterService, PaginatedSubscribers } from './newsletter.service';

/**
 * Admin surface for newsletter subscribers mounted at `/admin/newsletter/subscribers`
 * — paginated list (email search), newest first. CSV assembly is the admin FE's job.
 *
 * Auth: verified Supabase JWT + `role === ADMIN` (`RolesGuard` enforces `@Roles`).
 */
@ApiTags('Admin / Newsletter')
@ApiBearerAuth('supabase-jwt')
@Controller('admin/newsletter')
export class AdminNewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get('subscribers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List newsletter subscribers (paginated, email search)',
  })
  @ApiOkResponse({
    type: PaginatedSubscribersDto,
    description: 'Paginated subscribers',
  })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  list(@Query() query: ListSubscribersQueryDto): Promise<PaginatedSubscribers> {
    return this.newsletterService.findAllForAdmin(query);
  }
  @Delete('subscribers/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a subscriber (hard delete; re-subscribing re-creates)',
  })
  @ApiResponse({ status: 204, description: 'Removed' })
  @ApiResponse({ status: 404, description: 'Subscriber not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.newsletterService.deleteById(id);
  }
}
