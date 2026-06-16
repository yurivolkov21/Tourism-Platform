import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import { config as loadEnv } from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app/app.module';

// Load .env early — before we read SENTRY_DSN and before ConfigModule. `nx serve`
// runs from the workspace root; the built dist runs from apps/api. dotenv ignores
// missing files and never overrides already-set vars, so trying both is safe.
// No-op in production (env comes from the platform).
loadEnv({ path: join(process.cwd(), 'apps/api/.env') });
loadEnv({ path: join(process.cwd(), '.env') });

/**
 * Application entry point.
 *
 * Order: Sentry (earliest) → create app → security middleware (helmet + CORS)
 * → global prefix → global ValidationPipe (whitelist) → Swagger (non-prod) →
 * listen. The global envelope interceptor + exception filter are registered in
 * `AppModule` (APP_INTERCEPTOR / APP_FILTER).
 */
async function bootstrap(): Promise<void> {
  // Sentry as early as possible — no-op when SENTRY_DSN is unset (ADR-0008).
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'development',
    });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api/v1';
  const port = config.get<number>('app.port') ?? 3000;
  const corsOrigins = config.get<string[]>('app.corsOrigins') ?? [];
  const isProduction = config.get<boolean>('app.isProduction') ?? false;

  // Stripe webhook needs the RAW body for signature verification — mount
  // express.raw() on its exact path BEFORE Nest's global JSON parser (registered
  // at app.init/listen, after this). `req.body` is then the untouched Buffer
  // Stripe signed. The route also uses @Public() + @SkipTransform(). PayPal's
  // webhook path joins here in P1.5c.
  app.use(
    `/${apiPrefix}/payments/stripe/webhook`,
    express.raw({ type: 'application/json' }),
  );

  app.use(helmet());
  // `origin: true` reflects the request origin (local dev). In prod the
  // allowlist must be populated via CORS_ORIGINS.
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not in the DTO
      forbidNonWhitelisted: true, // ...and reject when extras appear
      transform: true, // hydrate plain objects into DTO classes
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Tourism API')
      .setDescription('Tourism booking platform — REST API')
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT (access_token)',
        },
        // Must match @ApiBearerAuth('supabase-jwt') on controllers.
        'supabase-jwt',
      )
      .addServer(`http://localhost:${port}`)
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Tourism API on http://localhost:${port}/${apiPrefix}`);
  if (!isProduction) {
    logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
