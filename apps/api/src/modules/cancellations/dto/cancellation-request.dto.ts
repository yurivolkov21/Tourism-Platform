import { ApiProperty } from '@nestjs/swagger';
import { CancellationRequestStatus } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Cancellation-request state embedded on a booking read (customer badge). */
export class CancellationRequestSummaryDto {
  @ApiProperty({ enum: CancellationRequestStatus, example: CancellationRequestStatus.REQUESTED })
  status!: CancellationRequestStatus;

  @ApiProperty({ example: 'Change of travel plans' })
  reason!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ nullable: true, type: String })
  decisionNote!: string | null;

  @ApiProperty({ nullable: true, format: 'date-time', type: String })
  decidedAt!: string | null;
}

/** Booking context shown on a queue row. */
export class AdminCancellationBookingRefDto {
  @ApiProperty({ example: 'BK-7Q2KX9AB' }) code!: string;
  @ApiProperty({ example: 'Hoi An Walking Tour' }) tourTitle!: string;
  @ApiProperty({ format: 'date', example: '2026-08-15' }) departureStartDate!: string;
  @ApiProperty({ example: 'Nguyen Van A' }) customerName!: string;
  @ApiProperty({ example: 'guest@example.com' }) customerEmail!: string;
}

/** One row in the admin cancellation-request queue. */
export class AdminCancellationRequestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: CancellationRequestStatus }) status!: CancellationRequestStatus;
  @ApiProperty({ example: 'Change of travel plans' }) reason!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ nullable: true, format: 'date-time', type: String }) decidedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) decisionNote!: string | null;
  @ApiProperty({ type: AdminCancellationBookingRefDto }) booking!: AdminCancellationBookingRefDto;
}

export class PaginatedCancellationRequestsDto {
  @ApiProperty({ type: [AdminCancellationRequestDto] }) data!: AdminCancellationRequestDto[];
  @ApiProperty({ type: PageMetaDto }) meta!: PageMetaDto;
}
