import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for `POST /bookings/:code/cancellation-request`. Reason is optional. */
export class CreateCancellationRequestDto {
  @ApiPropertyOptional({ example: 'Change of travel plans', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
