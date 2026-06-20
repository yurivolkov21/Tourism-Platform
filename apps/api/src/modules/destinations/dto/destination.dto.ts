import { ApiProperty } from '@nestjs/swagger';
import { MediaItemDto } from '../../media/dto/media.dto';

/** Response shape for a destination (mirrors the Prisma `Destination` + media). */
export class DestinationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'hoi-an' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An' })
  name!: string;

  @ApiProperty({ example: 'Vietnam' })
  country!: string;

  @ApiProperty({ nullable: true, type: String })
  region!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: [MediaItemDto] })
  media!: MediaItemDto[];
}
