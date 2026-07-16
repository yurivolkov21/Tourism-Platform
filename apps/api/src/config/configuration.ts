import { registerAs } from '@nestjs/config';

/**
 * Namespaced, typed config read from the (already Joi-validated) env.
 * Inject via `ConfigService` using the dotted path, e.g. `config.get('app.logLevel')`.
 */

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
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

// PayPal (international rail — ADR-0006 amended; replaced MoMo). Values land in
// P1.5c; the namespace exists now so the booking flow can reference the provider.
export const paypalConfig = registerAs('paypal', () => ({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  mode: process.env.PAYPAL_MODE ?? 'sandbox',
  webhookId: process.env.PAYPAL_WEBHOOK_ID,
}));

export const emailConfig = registerAs('email', () => ({
  resendApiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL,
  // Optional support inbox; empty/undefined = no Reply-To header (API-W1).
  replyTo: process.env.RESEND_REPLY_TO_EMAIL || undefined,
}));

export const sentryConfig = registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN ?? '',
}));

// AI concierge chat. Key is optional by design: empty ⇒ the chat endpoint
// answers 503 CHAT_UNAVAILABLE and the rest of the API runs normally.
export const chatConfig = registerAs('chat', () => ({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
  model: process.env.CHAT_MODEL ?? 'claude-haiku-4-5',
}));

// On-demand web cache revalidation. Optional by design: no secret ⇒ the API
// skips the POST to the web `/api/revalidate` route and the public tour page
// falls back to its 300s ISR timer. Shared with `@tourism/web` (API attaches the
// secret, web validates it). The web origin reuses `app.frontendUrl`.
export const revalidateConfig = registerAs('revalidate', () => ({
  secret: process.env.REVALIDATE_SECRET || undefined,
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
  paypalConfig,
  emailConfig,
  sentryConfig,
  chatConfig,
  revalidateConfig,
  throttlerConfig,
];
