import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for the public `POST /newsletter/subscribe`.
 *
 * `website` is a **honeypot** (same contract as the enquiry form): a real user
 * never fills it. It is NOT rejected by validation — the controller silently
 * accepts (201) and drops the submission when it's non-empty, so bots learn
 * nothing.
 */
export class SubscribeDto {
  @ApiProperty({ maxLength: 200, example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiPropertyOptional({ maxLength: 40, example: 'footer', description: 'Where the signup came from.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  /** Honeypot — leave empty. Filled = bot → silently dropped (see class doc). */
  @ApiPropertyOptional({ description: 'Anti-spam honeypot — must stay empty.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

/** Acknowledgement returned by the public subscribe (no dedupe/PII signal). */
export class SubscribeAckDto {
  @ApiProperty({ example: true })
  received!: boolean;
}
