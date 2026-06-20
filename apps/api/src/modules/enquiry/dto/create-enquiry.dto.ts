import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for the public `POST /enquiries` lead form.
 *
 * `website` is a **honeypot**: a real user never fills it (it's hidden in the
 * FE). It is intentionally NOT rejected by validation — a 400 would tell a bot
 * the field matters. Instead the controller silently accepts (201) and drops the
 * submission when it's non-empty. See `EnquiryController.create`.
 */
export class CreateEnquiryDto {
  @ApiProperty({ maxLength: 120, example: 'Jane Traveller' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ maxLength: 200, example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiPropertyOptional({ maxLength: 30, example: '+44 7700 900123' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ minLength: 10, maxLength: 2000, example: 'Is the Hoi An tour available in July for 2 adults?' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Tour this enquiry is about (must be published).' })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  /** Honeypot — leave empty. Filled = bot → silently dropped (see class doc). */
  @ApiPropertyOptional({ description: 'Anti-spam honeypot — must stay empty.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
