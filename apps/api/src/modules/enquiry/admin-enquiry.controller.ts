import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Enquiry, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { EnquiryDto, PaginatedEnquiriesDto } from './dto/enquiry.dto';
import { ListEnquiriesQueryDto } from './dto/list-enquiries-query.dto';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto';
import { EnquiryService, PaginatedEnquiries } from './enquiry.service';

/**
 * Admin CRM surface for enquiries mounted at `/admin/enquiries` — paginated list
 * (optional `status` filter) + pipeline status transition.
 *
 * Auth: verified Supabase JWT + `role === ADMIN` (`RolesGuard` enforces `@Roles`).
 */
@ApiTags('Admin / Enquiries')
@ApiBearerAuth('supabase-jwt')
@Controller('admin/enquiries')
export class AdminEnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List enquiries (paginated, filter by status)' })
  @ApiOkResponse({ type: PaginatedEnquiriesDto, description: 'Paginated enquiries' })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  list(@Query() query: ListEnquiriesQueryDto): Promise<PaginatedEnquiries> {
    return this.enquiryService.findAllForAdmin(query);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an enquiry CRM status (admin)' })
  @ApiOkResponse({ type: EnquiryDto, description: 'Updated enquiry' })
  @ApiResponse({ status: 401, description: 'Missing/invalid token' })
  @ApiResponse({ status: 403, description: 'Caller is not an admin' })
  @ApiResponse({ status: 404, description: 'Enquiry not found' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateEnquiryStatusDto,
  ): Promise<Enquiry> {
    return this.enquiryService.updateStatus(id, body.status);
  }
}
