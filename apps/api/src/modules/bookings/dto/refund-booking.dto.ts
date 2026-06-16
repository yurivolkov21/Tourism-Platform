import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Request body for `POST /admin/bookings/:code/refund`. Reason is optional audit. */
export class RefundBookingDto {
  @ApiPropertyOptional({
    example: 'Customer cancelled within the free window',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
