import { ApiProperty } from '@nestjs/swagger';

/** Response shape for a tour category (mirrors the Prisma `TourCategory`). */
export class TourCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'adventure-tours' })
  slug!: string;

  @ApiProperty({ example: 'Adventure Tours' })
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ example: 7, description: 'Number of tours in this category' })
  toursCount!: number;
}
