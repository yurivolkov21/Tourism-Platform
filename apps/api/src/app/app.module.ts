import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { RolesGuard } from '../common/guards/roles.guard';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { configurations, envValidationSchema } from '../config';
import { AdminMediaModule } from '../modules/media/admin-media.module';
import { AdminStatsModule } from '../modules/admin-stats/admin-stats.module';
import { AuthModule } from '../modules/auth/auth.module';
import { BookingsModule } from '../modules/bookings/bookings.module';
import { DeparturesModule } from '../modules/departures/departures.module';
import { DestinationsModule } from '../modules/destinations/destinations.module';
import { EmailModule } from '../modules/email/email.module';
import { EnquiryModule } from '../modules/enquiry/enquiry.module';
import { JobsModule } from '../modules/jobs/jobs.module';
import { NewsletterModule } from '../modules/newsletter/newsletter.module';
import { PostsModule } from '../modules/posts/posts.module';
import { ReviewsModule } from '../modules/reviews/reviews.module';
import { TourCategoriesModule } from '../modules/tour-categories/tour-categories.module';
import { ToursModule } from '../modules/tours/tours.module';
import { UploadsModule } from '../modules/uploads/uploads.module';
import { UsersModule } from '../modules/users/users.module';
import { WishlistModule } from '../modules/wishlist/wishlist.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
      load: configurations,
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    DestinationsModule,
    TourCategoriesModule,
    ToursModule,
    DeparturesModule,
    BookingsModule,
    UploadsModule,
    ReviewsModule,
    WishlistModule,
    EnquiryModule,
    NewsletterModule,
    AdminStatsModule,
    PostsModule,
    JobsModule,
    AdminMediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global envelope: success → TransformInterceptor, failure → HttpExceptionFilter.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Global auth: every route needs a valid Supabase JWT (unless @Public).
    // Order matters — SupabaseJwtGuard (attaches req.currentUser) before RolesGuard.
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
