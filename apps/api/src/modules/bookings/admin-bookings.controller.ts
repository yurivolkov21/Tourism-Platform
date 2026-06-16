import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Booking, User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { BookingDto } from './dto/booking.dto';
import { RefundBookingDto } from './dto/refund-booking.dto';

/**
 * Admin booking operations at `/admin/bookings` — gated by `@Roles(ADMIN)`. The
 * admin's local user id is recorded as `refundedById` on the booking (audit).
 */
@ApiTags('Bookings (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post(':code/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: refund a PAID booking (Stripe) + release seats' })
  @ApiOkResponse({ type: BookingDto, description: 'Refunded booking' })
  @ApiResponse({ status: 400, description: 'Not refundable, or Stripe refund failed' })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  refund(
    @CurrentUser() user: User | null,
    @Param('code') code: string,
    @Body() body: RefundBookingDto,
  ): Promise<Booking> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before issuing refunds',
      });
    }
    return this.bookingsService.refundByAdmin({
      code,
      reason: body.reason,
      adminUserId: user.id,
    });
  }
}
