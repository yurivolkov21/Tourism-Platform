import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Destination } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import {
  DestinationsService,
  PaginatedDestinations,
} from './destinations.service';
import { DestinationDto } from './dto/destination.dto';
import { ListDestinationsQueryDto } from './dto/list-destinations-query.dto';
import { PaginatedDestinationsDto } from './dto/paginated-destinations.dto';

/**
 * Public catalog for destinations (no auth — customers browse before sign-in).
 * Only active rows are returned.
 */
@ApiTags('Destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active destinations' })
  @ApiOkResponse({ type: PaginatedDestinationsDto })
  list(
    @Query() query: ListDestinationsQueryDto,
  ): Promise<PaginatedDestinations> {
    return this.destinationsService.findPublicList(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get one active destination by slug' })
  @ApiOkResponse({ type: DestinationDto })
  @ApiResponse({ status: 404, description: 'Not found or inactive' })
  detail(@Param('slug') slug: string): Promise<Destination> {
    return this.destinationsService.findPublicBySlug(slug);
  }
}
