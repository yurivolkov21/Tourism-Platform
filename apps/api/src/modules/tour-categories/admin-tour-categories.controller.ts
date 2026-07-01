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
import { TourCategory, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminTourCategoryDetailDto } from './dto/admin-tour-category-detail.dto';
import { CreateTourCategoryDto } from './dto/create-tour-category.dto';
import { ListTourCategoriesQueryDto } from './dto/list-tour-categories-query.dto';
import { PaginatedTourCategoriesDto } from './dto/paginated-tour-categories.dto';
import { TourCategoryDto } from './dto/tour-category.dto';
import { UpdateTourCategoryDto } from './dto/update-tour-category.dto';
import {
  AdminTourCategoryDetail,
  PaginatedTourCategories,
  TourCategoriesService,
} from './tour-categories.service';

/**
 * Admin CRUD at `/admin/tour-categories` — every route gated by `@Roles(ADMIN)`
 * (the global `RolesGuard` enforces it). Separate from the public controller so
 * admin paths group under their own Swagger tag and can't leak via a missing
 * decorator.
 */
@ApiTags('Tour Categories (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/tour-categories')
export class AdminTourCategoriesController {
  constructor(
    private readonly tourCategoriesService: TourCategoriesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all tour categories (incl. inactive)' })
  @ApiOkResponse({ type: PaginatedTourCategoriesDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(
    @Query() query: ListTourCategoriesQueryDto,
  ): Promise<PaginatedTourCategories> {
    return this.tourCategoriesService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Admin: get one tour category by slug (with its tours)' })
  @ApiOkResponse({ type: AdminTourCategoryDetailDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  detail(@Param('slug') slug: string): Promise<AdminTourCategoryDetail> {
    return this.tourCategoriesService.findDetailForAdmin(slug);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create a tour category' })
  @ApiCreatedResponse({ type: TourCategoryDto })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(@Body() body: CreateTourCategoryDto): Promise<TourCategory> {
    return this.tourCategoriesService.create(body);
  }

  @Patch(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: partial update a tour category' })
  @ApiOkResponse({ type: TourCategoryDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'New slug already exists' })
  update(
    @Param('slug') slug: string,
    @Body() body: UpdateTourCategoryDto,
  ): Promise<TourCategory> {
    return this.tourCategoriesService.update(slug, body);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete a (deactivated) tour category' })
  @ApiOkResponse({ type: TourCategoryDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'Still active, or has tours' })
  remove(@Param('slug') slug: string): Promise<TourCategory> {
    return this.tourCategoriesService.remove(slug);
  }
}
