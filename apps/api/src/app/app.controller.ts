import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Liveness — public (no auth) so probes and the root URL work. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  getData() {
    return this.appService.getData();
  }
}
