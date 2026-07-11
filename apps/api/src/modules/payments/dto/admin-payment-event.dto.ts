import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Query string for `GET /admin/payment-events` (webhook log viewer). */
export class ListPaymentEventsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  /** Event type filter (contains, case-insensitive). */
  @ApiPropertyOptional({ example: 'checkout.session', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  /** Provider event-id search (contains, case-insensitive). */
  @ApiPropertyOptional({ example: 'evt_1', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}

/**
 * One webhook row for the admin viewer. Unlike the booking-detail embed, this
 * INCLUDES the raw `payload` — the viewer exists for webhook debugging and is
 * admin-only. `bookingId`/`bookingCode` are derived from the provider payload
 * path (there is no FK) and may be null.
 */
export class AdminPaymentEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ example: 'evt_1PXYZ' })
  eventId!: string;

  @ApiProperty({ example: 'checkout.session.completed' })
  type!: string;

  @ApiProperty({ description: 'Raw provider webhook payload (JSON)' })
  payload!: unknown;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  processedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  receivedAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  bookingId!: string | null;

  @ApiProperty({ example: 'BK-ABCDEFGH', nullable: true, type: String })
  bookingCode!: string | null;
}

/** Enveloped (`{ data, meta }`) payment-events list — for Swagger. */
export class PaginatedPaymentEventsDto {
  @ApiProperty({ type: [AdminPaymentEventDto] })
  data!: AdminPaymentEventDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
