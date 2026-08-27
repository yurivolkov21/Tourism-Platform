import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO mirroring the Prisma `User` exposed to the FE. Supabase owns
 * passwords, so there are no sensitive columns to omit.
 */
export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'Supabase auth.users.id' })
  supabaseId!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  fullName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ example: 'en', description: 'EN-only for now (ADR-0005)' })
  locale!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'ADMIN'], example: 'CUSTOMER' })
  role!: 'CUSTOMER' | 'ADMIN';

  @ApiProperty({
    nullable: true,
    type: String,
    format: 'uri',
    description: 'Cloudinary avatar delivery URL (null if none set)',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description:
      'Whether the account can sign in with an email + password. Supabase does NOT ' +
      'create an `email` identity when a password is set on an OAuth-only account — ' +
      'it only fills `auth.users.encrypted_password` — so `app_metadata.providers` ' +
      'never reveals this and only the server can answer it.',
    example: true,
  })
  hasPassword!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
