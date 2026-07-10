import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CancellationsService } from './cancellations.service';
import { DenyCancellationRequestDto } from './dto/deny-cancellation-request.dto';
import { ListCancellationRequestsQueryDto } from './dto/list-cancellation-requests-query.dto';
import {
  AdminCancellationRequestDto,
  PaginatedCancellationRequestsDto,
} from './dto/cancellation-request.dto';

@ApiTags('Cancellations (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/cancellation-requests')
export class AdminCancellationsController {
  constructor(private readonly service: CancellationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list cancellation requests (default REQUESTED)',
  })
  @ApiOkResponse({ type: PaginatedCancellationRequestsDto })
  list(
    @Query() query: ListCancellationRequestsQueryDto,
  ): Promise<PaginatedCancellationRequestsDto> {
    return this.service.findAllForAdmin(query);
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: deny a cancellation request (booking stays PAID)',
  })
  @ApiOkResponse({ type: AdminCancellationRequestDto })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Request is not open' })
  deny(
    @CurrentUser() user: User | null,
    @Param('id') id: string,
    @Body() body: DenyCancellationRequestDto,
  ): Promise<AdminCancellationRequestDto> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/admin/sync first',
      });
    }
    return this.service.denyRequest(id, user.id, body);
  }
}
