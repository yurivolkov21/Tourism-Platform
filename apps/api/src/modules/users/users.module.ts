import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Users controller + service. Imports `MediaModule` (P1.6) for avatar
 * sync/attach. `UsersService` is exported for feature modules (bookings,
 * reviews) that need user lookups without going through HTTP.
 */
@Module({
  imports: [MediaModule, UploadsModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, AdminUsersService],
  exports: [UsersService],
})
export class UsersModule {}
