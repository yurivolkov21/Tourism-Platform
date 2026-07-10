import { ApiProperty } from '@nestjs/swagger';

import { MediaItemDto } from '../../media/dto/media.dto';

/** One public brand-chrome slot with its managed media (only non-empty slots are returned). */
export class SiteMediaSlotDto {
  @ApiProperty({ example: 'home-hero' })
  key!: string;

  @ApiProperty({ type: [MediaItemDto] })
  media!: MediaItemDto[];
}

/** Admin view of a slot — the full catalog entry with its current media (possibly empty). */
export class AdminSiteMediaSlotDto extends SiteMediaSlotDto {
  @ApiProperty({ enum: ['single', 'gallery'], example: 'single' })
  kind!: 'single' | 'gallery';

  @ApiProperty({ example: 'Hero backdrop' })
  label!: string;

  @ApiProperty({ example: 'Home' })
  group!: string;

  @ApiProperty({
    example: 'Full-bleed photo behind the home-page hero heading and search.',
  })
  hint!: string;
}
