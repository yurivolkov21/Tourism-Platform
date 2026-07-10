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
import { Tour, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { MediaItemDto } from '../media/dto/media.dto';
import { SetMediaDto } from '../media/dto/set-media.dto';
import { AdminTourDetailDto } from './dto/admin-tour-detail.dto';
import { CreateTourDto } from './dto/create-tour.dto';
import { ListToursQueryDto } from './dto/list-tours-query.dto';
import { PaginatedToursDto } from './dto/paginated-tours.dto';
import { TourDetailDto } from './dto/tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { AdminTourDetail, PaginatedTours, ToursService } from './tours.service';

/**
 * Admin CRUD at `/admin/tours` — every route gated by `@Roles(ADMIN)` (the
 * global `RolesGuard` enforces it). Separate from the public controller so
 * admin paths group under their own Swagger tag and can't leak via a missing
 * decorator.
 */
@ApiTags('Tours (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/tours')
export class AdminToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all tours (incl. drafts)' })
  @ApiOkResponse({ type: PaginatedToursDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(@Query() query: ListToursQueryDto): Promise<PaginatedTours> {
    return this.toursService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Admin: get one tour by slug (enriched + ops)' })
  @ApiOkResponse({ type: AdminTourDetailDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  detail(@Param('slug') slug: string): Promise<AdminTourDetail> {
    return this.toursService.findDetailForAdmin(slug);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create a tour' })
  @ApiCreatedResponse({ type: TourDetailDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid category / destination ref',
  })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(@Body() body: CreateTourDto): Promise<Tour> {
    return this.toursService.create(body);
  }

  @Patch(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: partial update a tour' })
  @ApiOkResponse({ type: TourDetailDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid category / destination ref',
  })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'New slug already exists' })
  update(
    @Param('slug') slug: string,
    @Body() body: UpdateTourDto,
  ): Promise<Tour> {
    return this.toursService.update(slug, body);
  }

  @Put(':slug/media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: replace a tour’s media set' })
  @ApiOkResponse({
    type: [MediaItemDto],
    description: 'New media set with URLs',
  })
  @ApiResponse({ status: 404, description: 'Tour not found' })
  setMedia(
    @Param('slug') slug: string,
    @Body() body: SetMediaDto,
  ): Promise<MediaItemDto[]> {
    return this.toursService.setMedia(slug, body.media);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete an (unpublished) tour' })
  @ApiOkResponse({ type: TourDetailDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Still published, or has bookings' })
  remove(@Param('slug') slug: string): Promise<Tour> {
    return this.toursService.remove(slug);
  }
}
