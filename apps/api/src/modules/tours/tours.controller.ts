import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Tour } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { ListToursQueryDto } from './dto/list-tours-query.dto';
import { PaginatedToursDto } from './dto/paginated-tours.dto';
import { TourDetailDto } from './dto/tour.dto';
import { PaginatedTours, ToursService } from './tours.service';

/**
 * Public catalog for tours (no auth — customers browse before sign-in). Only
 * published rows are returned; drafts are conflated with 404 so draft slugs
 * aren't probeable.
 */
@ApiTags('Tours')
@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published tours (paginated, filterable)' })
  @ApiOkResponse({ type: PaginatedToursDto })
  list(@Query() query: ListToursQueryDto): Promise<PaginatedTours> {
    return this.toursService.findPublicList(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get one published tour by slug (enriched)' })
  @ApiOkResponse({ type: TourDetailDto })
  @ApiResponse({ status: 404, description: 'Not found or unpublished' })
  detail(@Param('slug') slug: string): Promise<Tour> {
    return this.toursService.findPublicBySlug(slug);
  }
}
