import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

/** Partial update — every create field optional. */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
