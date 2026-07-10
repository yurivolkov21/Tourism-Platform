import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /users/me/avatar/sign`. The customer supplies only the filename (+ optional content
 * type); the controller pins `purpose=USER_AVATAR`, so a customer can never sign an upload into a tour
 * or destination folder.
 */
export class SignAvatarDto {
  @ApiProperty({
    example: 'me.jpg',
    maxLength: 200,
    description: 'Original filename (single extension).',
  })
  @IsString()
  @MaxLength(200)
  filename!: string;

  @ApiPropertyOptional({ example: 'image/jpeg', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;
}
