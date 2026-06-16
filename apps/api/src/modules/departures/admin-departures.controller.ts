import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TourDeparture, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { DepartureDto } from './dto/departure.dto';
import { ListDeparturesQueryDto } from './dto/list-departures-query.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';
import { DeparturesService } from './departures.service';

/**
 * Admin nested CRUD at `/admin/tours/:slug/departures` — gated by `@Roles(ADMIN)`
 * (global `RolesGuard`). Lists full history (all statuses); `:id` validated as a
 * UUID. Separate from the public controller so admin paths group under their own
 * Swagger tag and can't leak via a missing decorator.
 */
@ApiTags('Tours (Admin) — Departures')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/tours/:slug/departures')
export class AdminDeparturesController {
  constructor(private readonly departuresService: DeparturesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list departures (full history)' })
  @ApiOkResponse({ type: [DepartureDto], description: 'Ordered by startDate asc' })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'Tour not found' })
  list(
    @Param('slug') slug: string,
    @Query() query: ListDeparturesQueryDto,
  ): Promise<TourDeparture[]> {
    return this.departuresService.findAdminListForTour(slug, query);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create a departure' })
  @ApiCreatedResponse({ type: DepartureDto })
  @ApiResponse({ status: 400, description: 'Invalid date range / past start' })
  @ApiResponse({ status: 404, description: 'Tour not found' })
  create(
    @Param('slug') slug: string,
    @Body() body: CreateDepartureDto,
  ): Promise<TourDeparture> {
    return this.departuresService.create(slug, body);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: partial update a departure' })
  @ApiOkResponse({ type: DepartureDto })
  @ApiResponse({ status: 400, description: 'Invalid date range / seatsTotal below booked' })
  @ApiResponse({ status: 404, description: 'Tour or departure not found' })
  update(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDepartureDto,
  ): Promise<TourDeparture> {
    return this.departuresService.update(slug, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete a departure (no booked seats)' })
  @ApiOkResponse({ type: DepartureDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Tour or departure not found' })
  @ApiResponse({ status: 409, description: 'Departure has bookings' })
  remove(
    @Param('slug') slug: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TourDeparture> {
    return this.departuresService.remove(slug, id);
  }
}
