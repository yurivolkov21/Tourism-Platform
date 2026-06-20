import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Body for `PATCH /admin/reviews/:id/moderation`. Approve/reject is modelled as
 * a boolean flag rather than two endpoints — keeps the surface small and lets
 * the admin revert a previously-approved review back to draft if it gets flagged.
 */
export class ModerateReviewDto {
  @ApiProperty({
    description: 'true to approve and publish; false to revert to draft.',
    example: true,
  })
  @IsBoolean()
  isApproved!: boolean;
}
