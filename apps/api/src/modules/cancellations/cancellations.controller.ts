import { Body, Controller, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CancellationsService } from './cancellations.service';
import { CreateCancellationRequestDto, } from './dto/create-cancellation-request.dto';
import { CancellationRequestSummaryDto } from './dto/cancellation-request.dto';

@ApiTags('Cancellations')
@ApiBearerAuth('supabase-jwt')
@Controller('bookings')
export class CancellationsController {
  constructor(private readonly service: CancellationsService) {}

  @Post(':code/cancellation-request')
  @ApiOperation({ summary: 'Request cancellation/refund of your own PAID booking' })
  @ApiCreatedResponse({ type: CancellationRequestSummaryDto })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 404, description: 'Booking not found or not owned' })
  @ApiResponse({ status: 409, description: 'Not PAID / departure started / already requested' })
  request(
    @CurrentUser() user: User | null,
    @Param('code') code: string,
    @Body() body: CreateCancellationRequestDto,
  ): Promise<CancellationRequestSummaryDto> {
    if (!user) {
      throw new UnauthorizedException({ code: 'USER_NOT_SYNCED', message: 'Run POST /auth/sync first' });
    }
    return this.service.createRequest(code, { id: user.id, role: user.role }, body);
  }
}
