import { Module } from '@nestjs/common';
import { CancellationsService } from './cancellations.service';
import { CancellationsController } from './cancellations.controller';
import { AdminCancellationsController } from './admin-cancellations.controller';

@Module({
  controllers: [CancellationsController, AdminCancellationsController],
  providers: [CancellationsService],
})
export class CancellationsModule {}
