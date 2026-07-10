import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { SiteMediaService, SiteMediaSlotEntry } from './site-media.service';
import { SiteMediaSlotDto } from './dto/site-media.dto';

/**
 * Public brand-chrome media (no auth — the web reads it at build/ISR time).
 * Only slots that carry managed media are returned; the web falls back to its
 * built-in defaults for anything absent.
 */
@ApiTags('Site media')
@Controller('site-media')
export class SiteMediaController {
  constructor(private readonly siteMediaService: SiteMediaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Managed brand-chrome slots (non-empty only)' })
  @ApiOkResponse({ type: [SiteMediaSlotDto] })
  list(): Promise<SiteMediaSlotEntry[]> {
    return this.siteMediaService.getPublicList();
  }
}
