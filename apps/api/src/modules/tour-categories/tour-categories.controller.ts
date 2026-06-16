import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TourCategory } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { ListTourCategoriesQueryDto } from './dto/list-tour-categories-query.dto';
import { PaginatedTourCategoriesDto } from './dto/paginated-tour-categories.dto';
import { TourCategoryDto } from './dto/tour-category.dto';
import {
  PaginatedTourCategories,
  TourCategoriesService,
} from './tour-categories.service';

/**
 * Public lookup for tour categories (no auth — used to populate filter UI).
 * Only active rows are returned.
 */
@ApiTags('Tour Categories')
@Controller('tour-categories')
export class TourCategoriesController {
  constructor(
    private readonly tourCategoriesService: TourCategoriesService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active tour categories' })
  @ApiOkResponse({ type: PaginatedTourCategoriesDto })
  list(
    @Query() query: ListTourCategoriesQueryDto,
  ): Promise<PaginatedTourCategories> {
    return this.tourCategoriesService.findPublicList(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get one active tour category by slug' })
  @ApiOkResponse({ type: TourCategoryDto })
  @ApiResponse({ status: 404, description: 'Not found or inactive' })
  detail(@Param('slug') slug: string): Promise<TourCategory> {
    return this.tourCategoriesService.findPublicBySlug(slug);
  }
}
