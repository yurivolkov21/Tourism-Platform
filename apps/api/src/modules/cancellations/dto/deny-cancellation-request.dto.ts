import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for `POST /admin/cancellation-requests/:id/deny`. */
export class DenyCancellationRequestDto {
  @ApiPropertyOptional({ example: 'Outside the free-cancellation window', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
