import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/** Registers an already-uploaded Cloudinary image as a post BODY asset (markdown insert). */
export class RegisterBodyImageDto {
  @ApiProperty({
    example: 'tourism/posts/body/1717000000000-boat',
    maxLength: 300,
  })
  @IsString()
  @Length(1, 300)
  publicId!: string;

  @ApiPropertyOptional({ example: 1600 })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ example: 900 })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ example: 'jpg', maxLength: 10 })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  format?: string;
}

/** Delivery URL echo for the inserted image. */
export class BodyImageUrlDto {
  @ApiProperty({ format: 'uri' })
  url!: string;
}
