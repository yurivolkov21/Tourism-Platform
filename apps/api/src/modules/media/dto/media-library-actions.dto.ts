import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Body for `PATCH /admin/media/:id` — set or clear (null) the alt text. */
export class UpdateMediaAltDto {
  @ApiProperty({
    maxLength: 300,
    nullable: true,
    type: String,
    description: 'Alt text; null clears it',
    example: 'Lantern-lit old town at dusk',
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  alt!: string | null;
}

/** Body for `POST /admin/media/bulk-delete`. */
export class BulkDeleteMediaDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}

/** Result of a bulk delete — USER-owned rows are skipped, not failed. */
export class BulkDeleteMediaResultDto {
  @ApiProperty({ example: 4 })
  deleted!: number;

  @ApiProperty({ example: 1, description: 'USER-owned (avatar) rows skipped' })
  skipped!: number;
}
