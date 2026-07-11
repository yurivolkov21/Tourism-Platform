import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Body for `POST /admin/enquiries/:id/notes` — one internal CRM note. */
export class CreateEnquiryNoteDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 2000,
    example: 'Called them back — wants a private departure in October.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Matches(/\S/, { message: 'body must not be whitespace-only' })
  body!: string;
}

/** Internal note on an enquiry (admin-only, append-only thread). */
export class EnquiryNoteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  enquiryId!: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'Null if the authoring admin account was deleted',
  })
  authorId!: string | null;

  @ApiProperty({
    example: 'Yuri Volkov',
    description: 'Snapshot of the admin display name at write time',
  })
  authorName!: string;

  @ApiProperty({ maxLength: 2000 })
  body!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
