import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post as HttpPost,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Post, User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminPostDetailDto } from './dto/admin-post-detail.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { PaginatedPostsDto } from './dto/paginated-posts.dto';
import { PostDto } from './dto/post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AdminPostDetail, PaginatedPosts, PostsService } from './posts.service';

/**
 * Admin CRUD at `/admin/posts` — every route gated by `@Roles(ADMIN)` (the global
 * `RolesGuard` enforces it). The author is taken from the authenticated admin,
 * never the request body.
 */
@ApiTags('Posts (Admin)')
@ApiBearerAuth('supabase-jwt')
@Roles(UserRole.ADMIN)
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all posts (incl. drafts)' })
  @ApiOkResponse({ type: PaginatedPostsDto })
  @ApiResponse({ status: 403, description: 'Not an ADMIN' })
  list(@Query() query: ListPostsQueryDto): Promise<PaginatedPosts> {
    return this.postsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Admin: get one post by slug (with its author)' })
  @ApiOkResponse({ type: AdminPostDetailDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  detail(@Param('slug') slug: string): Promise<AdminPostDetail> {
    return this.postsService.findDetailForAdmin(slug);
  }

  @HttpPost()
  @ApiOperation({ summary: 'Admin: create a post' })
  @ApiCreatedResponse({ type: PostDto })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  create(@Body() body: CreatePostDto, @CurrentUser() user: User | null): Promise<Post> {
    // RolesGuard guarantees an ADMIN, but narrow for type-safety / not-yet-synced.
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_SYNCED',
        message: 'Your account is not synced yet.',
      });
    }
    return this.postsService.create(body, user.id);
  }

  @Patch(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: partial update a post' })
  @ApiOkResponse({ type: PostDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 409, description: 'New slug already exists' })
  update(@Param('slug') slug: string, @Body() body: UpdatePostDto): Promise<Post> {
    return this.postsService.update(slug, body);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete a post' })
  @ApiOkResponse({ type: PostDto, description: 'Deleted (echo)' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(@Param('slug') slug: string): Promise<Post> {
    return this.postsService.remove(slug);
  }
}
