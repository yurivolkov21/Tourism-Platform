import { ApiProperty } from '@nestjs/swagger';
import { EnquiryStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** Body for `PATCH /admin/enquiries/:id/status` — CRM pipeline transition. */
export class UpdateEnquiryStatusDto {
  @ApiProperty({ enum: EnquiryStatus, example: EnquiryStatus.CONTACTED })
  @IsEnum(EnquiryStatus)
  status!: EnquiryStatus;
}
