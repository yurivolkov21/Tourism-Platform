import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSignedUploadUrlDto } from './dto/create-signed-upload-url.dto';
import { type SignedUploadParams, UploadsService } from './uploads.service';

/**
 * Admin-only Cloudinary upload signing at `/admin/uploads`. Returns a signature
 * envelope; the FE uploads the file straight to Cloudinary. No bytes are proxied
 * and `api_secret` never leaves the backend.
 */
@ApiTags('Uploads (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('signed-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: sign a Cloudinary direct upload' })
  @ApiOkResponse({ description: 'Signed upload params envelope' })
  @ApiResponse({ status: 400, description: 'Format rejected for the purpose' })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  sign(@Body() body: CreateSignedUploadUrlDto): SignedUploadParams {
    return this.uploadsService.createSignedUploadParams(body);
  }
}
