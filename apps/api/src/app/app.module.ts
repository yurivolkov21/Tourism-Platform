import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { RolesGuard } from '../common/guards/roles.guard';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { configurations, envValidationSchema } from '../config';
import { AuthModule } from '../modules/auth/auth.module';
import { DestinationsModule } from '../modules/destinations/destinations.module';
import { UsersModule } from '../modules/users/users.module';
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
    AuthModule,
    UsersModule,
    DestinationsModule,
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
