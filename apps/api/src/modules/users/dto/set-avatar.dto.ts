import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Body for `PUT /users/me/avatar`. The client sends only the Cloudinary fields
 * from its upload response — the server forces `type=IMAGE` and `role=avatar`,
 * so the avatar slot can never be set to a video or some other media role.
 */
export class SetAvatarDto {
  @ApiProperty({
    example: 'tourism/users/avatar/1717000000000-jane',
    description: 'Cloudinary public_id (no extension).',
    maxLength: 300,
  })
  @IsString()
  @MaxLength(300)
  publicId!: string;

  @ApiPropertyOptional({ example: 'jpg', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  format?: string;

  @ApiPropertyOptional({ example: 512, minimum: 1, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  width?: number;

  @ApiPropertyOptional({ example: 512, minimum: 1, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  height?: number;
}
