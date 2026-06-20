import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Users controller + service. Imports `MediaModule` (P1.6) for avatar
 * sync/attach. `UsersService` is exported for feature modules (bookings,
 * reviews) that need user lookups without going through HTTP.
 */
@Module({
  imports: [MediaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
