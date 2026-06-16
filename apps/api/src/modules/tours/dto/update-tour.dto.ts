import { PartialType } from '@nestjs/swagger';
import { CreateTourDto } from './create-tour.dto';

/**
 * Request body for `PATCH /admin/tours/:slug`. Every create field optional,
 * validators preserved. Sending any sub-entity array (`itinerary`/`faqs`/
 * `policies`) or `destinationSlugs` **replaces** that whole set; omit to leave
 * it untouched. If `destinationSlugs` is sent, `primaryDestinationSlug` must be
 * sent too (and be one of them).
 */
export class UpdateTourDto extends PartialType(CreateTourDto) {}
