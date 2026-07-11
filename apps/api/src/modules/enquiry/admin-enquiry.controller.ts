import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Enquiry, EnquiryNote, User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateEnquiryNoteDto, EnquiryNoteDto } from './dto/enquiry-note.dto';
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
  @ApiOkResponse({
    type: PaginatedEnquiriesDto,
    description: 'Paginated enquiries',
  })
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

  @Get(':id/notes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List the internal notes on an enquiry (admin)' })
  @ApiOkResponse({ type: [EnquiryNoteDto], description: 'Notes, oldest first' })
  @ApiResponse({ status: 404, description: 'Enquiry not found' })
  listNotes(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<EnquiryNote[]> {
    return this.enquiryService.listNotes(id);
  }

  @Post(':id/notes')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an internal note to an enquiry (admin)' })
  @ApiCreatedResponse({ type: EnquiryNoteDto, description: 'Created note' })
  @ApiResponse({ status: 404, description: 'Enquiry not found' })
  addNote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateEnquiryNoteDto,
    @CurrentUser() user: User | null,
  ): Promise<EnquiryNote> {
    // RolesGuard guarantees an ADMIN, but narrow for type-safety / not-yet-synced.
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Your account is not synced yet.',
      });
    }
    return this.enquiryService.addNote(id, user, body);
  }
}
