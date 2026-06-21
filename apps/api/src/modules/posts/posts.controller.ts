import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Post } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { PaginatedPostsDto } from './dto/paginated-posts.dto';
import { PostDto } from './dto/post.dto';
import { PaginatedPosts, PostsService } from './posts.service';

/**
 * Public blog reads (no auth). Only PUBLISHED posts whose `publishedAt <= now`
 * are returned.
 */
@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published posts' })
  @ApiOkResponse({ type: PaginatedPostsDto })
  list(@Query() query: ListPostsQueryDto): Promise<PaginatedPosts> {
    return this.postsService.findPublicList(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get one published post by slug' })
  @ApiOkResponse({ type: PostDto })
  @ApiResponse({ status: 404, description: 'Not found or not published' })
  detail(@Param('slug') slug: string): Promise<Post> {
    return this.postsService.findPublicBySlug(slug);
  }
}
