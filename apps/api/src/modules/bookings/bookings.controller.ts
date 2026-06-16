import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { Booking, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import { BookingDto } from './dto/booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * Customer booking surface at `/bookings`. Every route needs a verified Supabase
 * JWT (global guard). `@CurrentUser()` resolves to the local mirror row; a
 * freshly-signed-up user who skipped `/auth/sync` gets 401 `USER_NOT_SYNCED`.
 * Data is scoped to the caller (owner-or-admin) in the service.
 */
@ApiTags('Bookings')
@ApiBearerAuth('supabase-jwt')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a PENDING booking (payment minted in P1.5b)' })
  @ApiCreatedResponse({ type: BookingDto })
  @ApiResponse({ status: 400, description: 'Departure not OPEN / departed' })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 404, description: 'Tour or departure not found' })
  @ApiResponse({ status: 409, description: 'No seats available' })
  create(
    @CurrentUser() user: User | null,
    @Body() body: CreateBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.create(this.requireUser(user).id, body);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Caller's bookings (newest first, top 50)" })
  @ApiOkResponse({ type: [BookingDto] })
  @ApiResponse({ status: 401, description: 'User not synced' })
  listOwn(@CurrentUser() user: User | null): Promise<Booking[]> {
    return this.bookingsService.findOwnList(this.requireUser(user).id);
  }

  @Post(':code/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel your own PENDING booking' })
  @ApiOkResponse({ type: BookingDto })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 404, description: 'Booking not found or not owned' })
  @ApiResponse({ status: 409, description: 'Not a PENDING booking' })
  cancel(
    @CurrentUser() user: User | null,
    @Param('code') code: string,
  ): Promise<Booking> {
    const caller = this.requireUser(user);
    return this.bookingsService.cancelOwnPending(code, {
      id: caller.id,
      role: caller.role,
    });
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get one booking by code (owner or admin)' })
  @ApiOkResponse({ type: BookingDto })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 404, description: 'Booking not found or not owned' })
  detail(
    @CurrentUser() user: User | null,
    @Param('code') code: string,
  ): Promise<Booking> {
    const caller = this.requireUser(user);
    return this.bookingsService.findByCodeForCaller(code, {
      id: caller.id,
      role: caller.role,
    });
  }

  /** Guard against an authenticated JWT whose user row hasn't been synced yet. */
  private requireUser(user: User | null): User {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before using bookings',
      });
    }
    return user;
  }
}
