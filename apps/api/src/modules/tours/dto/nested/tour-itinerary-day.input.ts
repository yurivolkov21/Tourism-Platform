import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

/**
 * One itinerary day, supplied nested in the tour create/update body. The
 * service writes these with replace-all semantics (`deleteMany` + `create`).
 * `(tourId, dayNumber)` is unique in the DB — duplicate day numbers in one
 * payload surface as a `P2002` → 409.
 */
export class TourItineraryDayInput {
  @ApiProperty({ example: 1, minimum: 1, maximum: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  dayNumber!: number;

  @ApiProperty({ example: 'Arrival & old town walk', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
