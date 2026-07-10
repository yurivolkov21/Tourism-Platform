import { ApiProperty } from '@nestjs/swagger';
import { DestinationDto } from './destination.dto';

/** A tour linked to a destination (via the M:N join) — for the admin detail "used by" list. */
export class DestinationTourDto {
  @ApiProperty({ example: 'hoi-an-walking-tour' })
  slug!: string;

  @ApiProperty({ example: 'Hoi An Ancient Town Walking Tour' })
  title!: string;

  @ApiProperty({ example: true })
  isPublished!: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether this destination is the tour’s primary one.',
  })
  isPrimary!: boolean;
}

/**
 * Admin-only destination detail (`GET /admin/destinations/:slug`). Extends the shared
 * `DestinationDto` with the tours that use this destination — surfaced only on the admin read
 * (public reads use `findPublicBySlug`, untouched).
 */
export class AdminDestinationDetailDto extends DestinationDto {
  @ApiProperty({ type: [DestinationTourDto] })
  tours!: DestinationTourDto[];
}
