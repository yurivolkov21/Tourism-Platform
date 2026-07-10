import { ApiProperty } from '@nestjs/swagger';
import { MediaItemDto } from '../../media/dto/media.dto';

/**
 * Marketing-relevant tour preview joined onto each wishlist row — just enough
 * for the FE to render a wishlist card without a second fetch per item. EN-only
 * (`title`/`summary`, single column) + Cloudinary `media[]`.
 */
export class WishlistTourPreviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Old Town Walking Tour' })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({
    example: '149.00',
    description: 'Decimal serialized as string',
  })
  basePrice!: string;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 3 })
  durationDays!: number;

  @ApiProperty({ example: true })
  isPublished!: boolean;

  @ApiProperty({ type: [MediaItemDto] })
  media!: MediaItemDto[];
}

/** A wishlist row (composite PK) + its joined tour preview. */
export class WishlistItemDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: WishlistTourPreviewDto })
  tour!: WishlistTourPreviewDto;
}
