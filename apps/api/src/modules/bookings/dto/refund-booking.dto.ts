import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

/** Request body for `POST /admin/bookings/:code/refund`. `amount` omitted = full refund. */
export class RefundBookingDto {
  @ApiPropertyOptional({
    example: 'Customer cancelled within the free window',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    example: 30,
    description:
      'Partial refund amount in the booking currency; omit for a full refund',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;
}
