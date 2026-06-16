import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * One FAQ entry, supplied nested in the tour create/update body. Replace-all
 * semantics. `order` drives display sequence (asc).
 */
export class TourFaqInput {
  @ApiProperty({ example: 'Is hotel pickup included?', maxLength: 300 })
  @IsString()
  @Length(1, 300)
  question!: string;

  @ApiProperty({ example: 'Yes, within the old town.', maxLength: 2000 })
  @IsString()
  @Length(1, 2000)
  answer!: string;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
