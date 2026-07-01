import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
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
import { Destination, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaItemDto } from '../media/dto/media.dto';
import { SetMediaDto } from '../media/dto/set-media.dto';
import {
  AdminDestinationDetail,
  DestinationsService,
  PaginatedDestinations,
} from './destinations.service';
import { AdminDestinationDetailDto } from './dto/admin-destination-detail.dto';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { DestinationDto } from './dto/destination.dto';
import { ListDestinationsQueryDto } from './dto/list-destinations-query.dto';
import { PaginatedDestinationsDto } from './dto/paginated-destinations.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

/**
 * Admin CRUD at `/admin/destinations` — every route gated by `@Roles(ADMIN)`
 * (the global `RolesGuard` enforces it). Separate from the public controller so
 * admin paths group under their own Swagger tag and can't leak via a missing
 * decorator.
 */
@ApiTags('Destinations (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/destinations')
export class AdminDestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all destinations (incl. drafts)' })
  @ApiOkResponse({ type: PaginatedDestinationsDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(
    @Query() query: ListDestinationsQueryDto,
  ): Promise<PaginatedDestinations> {
    return this.destinationsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Admin: get one destination by slug (with the tours that use it)' })
  @ApiOkResponse({ type: AdminDestinationDetailDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  detail(@Param('slug') slug: string): Promise<AdminDestinationDetail> {
    return this.destinationsService.findDetailForAdmin(slug);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create a destination' })
  @ApiCreatedResponse({ type: DestinationDto })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(@Body() body: CreateDestinationDto): Promise<Destination> {
    return this.destinationsService.create(body);
  }

  @Patch(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: partial update a destination' })
  @ApiOkResponse({ type: DestinationDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'New slug already exists' })
  update(
    @Param('slug') slug: string,
    @Body() body: UpdateDestinationDto,
  ): Promise<Destination> {
    return this.destinationsService.update(slug, body);
  }

  @Put(':slug/media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: replace a destination’s media set' })
  @ApiOkResponse({ type: [MediaItemDto], description: 'New media set with URLs' })
  @ApiResponse({ status: 404, description: 'Not found' })
  setMedia(
    @Param('slug') slug: string,
    @Body() body: SetMediaDto,
  ): Promise<MediaItemDto[]> {
    return this.destinationsService.setMedia(slug, body.media);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete a (deactivated) destination' })
  @ApiOkResponse({ type: DestinationDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Still active, or has tours' })
  remove(@Param('slug') slug: string): Promise<Destination> {
    return this.destinationsService.remove(slug);
  }
}
