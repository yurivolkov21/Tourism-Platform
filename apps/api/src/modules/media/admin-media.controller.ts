import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReconcileResult } from '../jobs/maintenance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminMediaService,
  DeletedMediaAsset,
  PaginatedAdminMedia,
  PaginatedMediaGarbage,
} from './admin-media.service';
import {
  DeletedMediaAssetDto,
  MediaReconcileResultDto,
  PaginatedAdminMediaDto,
  PaginatedMediaGarbageDto,
} from './dto/admin-media.dto';
import { ListAdminMediaQueryDto } from './dto/list-admin-media-query.dto';
import { ListMediaGarbageQueryDto } from './dto/list-media-garbage-query.dto';

/**
 * Admin media library at `/admin/media` — cross-owner browse/search, per-asset
 * detach (into the deferred Cloudinary-destroy queue), and garbage-queue
 * visibility with an on-demand reconcile. Gated by `@Roles(ADMIN)`.
 */
@ApiTags('Media (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly adminMedia: AdminMediaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Admin: list media assets (paginated, filter/search, owner resolved)',
  })
  @ApiOkResponse({ type: PaginatedAdminMediaDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(@Query() query: ListAdminMediaQueryDto): Promise<PaginatedAdminMedia> {
    return this.adminMedia.list(query);
  }

  @Get('garbage')
  @ApiOperation({
    summary: 'Admin: list the deferred Cloudinary-destroy queue (oldest first)',
  })
  @ApiOkResponse({ type: PaginatedMediaGarbageDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  listGarbage(
    @Query() query: ListMediaGarbageQueryDto,
  ): Promise<PaginatedMediaGarbage> {
    return this.adminMedia.listGarbage(query);
  }

  @Post('garbage/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin: run one Cloudinary cleanup batch now (same as the daily cron)',
  })
  @ApiOkResponse({ type: MediaReconcileResultDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  reconcile(): Promise<ReconcileResult> {
    return this.adminMedia.runReconcile();
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Admin: detach one asset from its owner + queue Cloudinary destroy',
  })
  @ApiOkResponse({ type: DeletedMediaAssetDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({
    status: 409,
    description: 'USER-owned asset (customer avatar)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<DeletedMediaAsset> {
    return this.adminMedia.deleteAsset(id);
  }
}
