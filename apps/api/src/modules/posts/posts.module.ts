import { Module } from '@nestjs/common';
import { AdminPostsController } from './admin-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/** Editorial blog posts (P-Content). Public reads + admin CRUD. */
@Module({
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
