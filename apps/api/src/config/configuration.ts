import { registerAs } from '@nestjs/config';

/**
 * Namespaced, typed config read from the (already Joi-validated) env.
 * Inject via `ConfigService` using the dotted path, e.g. `config.get('app.logLevel')`.
 */

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL,
}));

export const supabaseConfig = registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  jwksUrl: process.env.SUPABASE_JWKS_URL,
  jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
}));

export const cloudinaryConfig = registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'tourism',
}));

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  defaultCurrency: process.env.STRIPE_DEFAULT_CURRENCY ?? 'usd',
}));

export const momoConfig = registerAs('momo', () => ({
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint:
    process.env.MOMO_ENDPOINT ??
    'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: process.env.MOMO_REDIRECT_URL,
  ipnUrl: process.env.MOMO_IPN_URL,
}));

export const emailConfig = registerAs('email', () => ({
  resendApiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL,
}));

export const sentryConfig = registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN ?? '',
}));

export const throttlerConfig = registerAs('throttler', () => ({
  ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
}));

/** All namespaced configs, for `ConfigModule.forRoot({ load })`. */
export const configurations = [
  appConfig,
  supabaseConfig,
  cloudinaryConfig,
  stripeConfig,
  momoConfig,
  emailConfig,
  sentryConfig,
  throttlerConfig,
];
