import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  /** Liveness — public (no auth) so probes and the root URL work. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  getData() {
    return this.appService.getData();
  }

  /**
   * Readiness — public; verifies DB connectivity with a trivial `SELECT 1`.
   * Used as the Render `healthCheckPath` and as the keep-alive ping target: the
   * round-trip keeps the free web service awake AND the Supabase project active
   * (free Supabase pauses after ~7 days idle). Returns 503 if the DB is down.
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Readiness check (verifies DB connectivity)' })
  @ApiResponse({ status: 503, description: 'Database unavailable' })
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        code: 'DB_UNAVAILABLE',
        message: 'Database unavailable',
      });
    }
    return { status: 'ok', db: 'up', time: new Date().toISOString() };
  }
}
