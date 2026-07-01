import { ApiProperty } from '@nestjs/swagger';
import { TourCategoryDto } from './tour-category.dto';

/** A tour that belongs to a category — for the admin detail "tours in this category" list. */
export class CategoryTourDto {
  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Ancient Town Walking Tour' })
  title!: string;

  @ApiProperty({ example: true })
  isPublished!: boolean;
}

/**
 * Admin-only tour-category detail (`GET /admin/tour-categories/:slug`). Extends the shared
 * `TourCategoryDto` with the tours in this category — surfaced only on the admin read (public reads
 * use `findPublicBySlug`, untouched).
 */
export class AdminTourCategoryDetailDto extends TourCategoryDto {
  @ApiProperty({ type: [CategoryTourDto] })
  tours!: CategoryTourDto[];
}
