import { ApiProperty } from '@nestjs/swagger';
import { EnquiryStatus } from '@prisma/client';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

/** Acknowledgement returned by the public `POST /enquiries` (no PII echoed). */
export class EnquiryAckDto {
  @ApiProperty({ example: true })
  received!: boolean;
}

/** Full enquiry row — admin CRM surface. */
export class EnquiryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Traveller' })
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  tourId!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'ha-long-bay-cruise' })
  tourSlug!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Hạ Long Bay Cruise 2D1N',
  })
  tourTitle!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'United Kingdom' })
  nationality!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  travelDate!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 4 })
  groupSize!: number | null;

  @ApiProperty({ nullable: true, type: String, example: '$1000–$2000' })
  budgetTier!: string | null;

  @ApiProperty({ type: [String], example: ['culture', 'food'] })
  interests!: string[];

  @ApiProperty({ enum: EnquiryStatus })
  status!: EnquiryStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

/** Enveloped (`{ data, meta }`) admin enquiries list — for Swagger. */
export class PaginatedEnquiriesDto {
  @ApiProperty({ type: [EnquiryDto] })
  data!: EnquiryDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
