import { PartialType } from '@nestjs/swagger';
import { CreateDepartureDto } from './create-departure.dto';

/**
 * Request body for `PATCH /admin/tours/:slug/departures/:id`. Every create field
 * optional. `priceOverride` / `compareAtPrice` accept explicit `null` to clear
 * the override back to the tour's base price (the service distinguishes absent
 * vs null). `seatsBooked` remains non-settable.
 */
export class UpdateDepartureDto extends PartialType(CreateDepartureDto) {}
