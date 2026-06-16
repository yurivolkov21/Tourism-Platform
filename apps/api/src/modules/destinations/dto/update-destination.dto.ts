import { PartialType } from '@nestjs/swagger';
import { CreateDestinationDto } from './create-destination.dto';

/** Partial update — every create field optional. */
export class UpdateDestinationDto extends PartialType(CreateDestinationDto) {}
