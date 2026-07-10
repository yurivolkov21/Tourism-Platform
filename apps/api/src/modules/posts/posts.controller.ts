import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { PaginatedPostsDto } from './dto/paginated-posts.dto';
import { PostDetailDto } from './dto/post-detail.dto';
import { PostTagWithCountDto } from './dto/post-tag.dto';
import {
  PaginatedPosts,
  PostsService,
  PublicPostDetail,
} from './posts.service';

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
  @Get('tags')
  @ApiOperation({ summary: 'List tags in use by published posts' })
  @ApiOkResponse({ type: [PostTagWithCountDto] })
  tags(): Promise<{ slug: string; name: string; count: number }[]> {
    return this.postsService.findPublicTags();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get one published post by slug (with related tours)',
  })
  @ApiOkResponse({ type: PostDetailDto })
  @ApiResponse({ status: 404, description: 'Not found or not published' })
  detail(@Param('slug') slug: string): Promise<PublicPostDetail> {
    return this.postsService.findPublicBySlug(slug);
  }
}
