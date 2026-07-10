import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { MediaItemDto } from '../media/dto/media.dto';
import { SetMediaDto } from '../media/dto/set-media.dto';
import {
  AdminSiteMediaSlotEntry,
  SiteMediaService,
} from './site-media.service';
import { AdminSiteMediaSlotDto } from './dto/site-media.dto';

/**
 * Admin Appearance surface at `/admin/site-media` — the full slot catalog plus
 * replace-all writes per slot. Gated by `@Roles(ADMIN)` like every admin path.
 */
@ApiTags('Site media (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/site-media')
export class AdminSiteMediaController {
  constructor(private readonly siteMediaService: SiteMediaService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: full brand-chrome slot catalog' })
  @ApiOkResponse({ type: [AdminSiteMediaSlotDto] })
  list(): Promise<AdminSiteMediaSlotEntry[]> {
    return this.siteMediaService.findAllForAdmin();
  }

  @Put(':key/media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: replace a slot’s media (empty array = reset to default)',
  })
  @ApiOkResponse({ type: [MediaItemDto], description: 'New media set' })
  @ApiResponse({ status: 404, description: 'Unknown slot key' })
  @ApiResponse({ status: 400, description: 'Kind/role/type violation' })
  setMedia(
    @Param('key') key: string,
    @Body() body: SetMediaDto,
  ): Promise<MediaItemDto[]> {
    return this.siteMediaService.setSlotMedia(key, body.media);
  }
}
