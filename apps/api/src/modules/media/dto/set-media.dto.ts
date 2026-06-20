import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { MediaInputDto } from './media.dto';

/**
 * Body for `PUT /admin/{tours|destinations}/:slug/media` — the FULL desired media
 * set for the owner (replace-all). Capped at 30 items.
 */
export class SetMediaDto {
  @ApiProperty({ type: [MediaInputDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MediaInputDto)
  media!: MediaInputDto[];
}
