import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User, Wishlist } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WishlistItemDto } from './dto/wishlist-item.dto';
import { WishlistService, WishlistWithTour } from './wishlist.service';

/**
 * Customer wishlist surface mounted at `/wishlist`. Every endpoint is scoped to
 * the caller's `userId` — no cross-user access. Add/remove are idempotent so the
 * FE can fire them from a toggle without first checking membership.
 */
@ApiTags('Wishlist')
@ApiBearerAuth('supabase-jwt')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /** `POST /wishlist/:tourId` — idempotent add (re-add is a 200 no-op). */
  @Post(':tourId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Add a tour to caller's wishlist (idempotent)" })
  @ApiOkResponse({
    type: WishlistItemDto,
    description: 'Wishlist row (created or existing)',
  })
  @ApiResponse({ status: 401, description: 'User not synced' })
  @ApiResponse({ status: 404, description: 'Tour not found or unpublished' })
  add(
    @CurrentUser() user: User | null,
    @Param('tourId', new ParseUUIDPipe()) tourId: string,
  ): Promise<Wishlist> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before using the wishlist',
      });
    }
    return this.wishlistService.add(user.id, tourId);
  }

  /** `DELETE /wishlist/:tourId` — idempotent remove (absent → 204, no error). */
  @Delete(':tourId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove a tour from caller's wishlist (idempotent)",
  })
  @ApiNoContentResponse({ description: 'Removed (or already absent)' })
  @ApiResponse({ status: 401, description: 'User not synced' })
  async remove(
    @CurrentUser() user: User | null,
    @Param('tourId', new ParseUUIDPipe()) tourId: string,
  ): Promise<void> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before using the wishlist',
      });
    }
    await this.wishlistService.remove(user.id, tourId);
  }

  /** `GET /wishlist/me` — caller's wishlist, newest-first, tour preview joined. */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Caller's wishlist with joined tour previews" })
  @ApiOkResponse({
    type: [WishlistItemDto],
    description: 'Wishlist rows + tour',
  })
  @ApiResponse({ status: 401, description: 'User not synced' })
  list(@CurrentUser() user: User | null): Promise<WishlistWithTour[]> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Run POST /auth/sync before fetching the wishlist',
      });
    }
    return this.wishlistService.findMineWithTour(user.id);
  }
}
