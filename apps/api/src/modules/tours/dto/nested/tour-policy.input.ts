import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolicyKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

/**
 * One structured policy (D-P1.1 — `TourPolicy` is its own model). Supplied
 * nested in the tour create/update body, replace-all semantics. `kind` is a
 * closed enum (CANCELLATION / BOOKING / GENERAL).
 */
export class TourPolicyInput {
  @ApiProperty({ enum: PolicyKind, example: PolicyKind.CANCELLATION })
  @IsEnum(PolicyKind)
  kind!: PolicyKind;

  @ApiProperty({ example: 'Free cancellation up to 24h', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ example: 'Full refund if cancelled 24h before departure.', maxLength: 4000 })
  @IsString()
  @Length(1, 4000)
  body!: string;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
