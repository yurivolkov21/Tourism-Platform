import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ToursModule } from '../tours/tours.module';
import { AdminPostsController } from './admin-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

/** Editorial blog posts (P-Content). Public reads + admin CRUD; media via MediaModule (cover);
 * ToursModule supplies related-tour summaries (Tours does not import Posts — acyclic). */
@Module({
  imports: [MediaModule, ToursModule],
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
