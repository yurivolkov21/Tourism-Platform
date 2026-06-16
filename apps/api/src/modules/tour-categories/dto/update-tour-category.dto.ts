import { PartialType } from '@nestjs/swagger';
import { CreateTourCategoryDto } from './create-tour-category.dto';

/** Partial update — every create field optional. */
export class UpdateTourCategoryDto extends PartialType(CreateTourCategoryDto) {}
