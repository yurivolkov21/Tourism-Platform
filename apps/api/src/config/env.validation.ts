import * as Joi from 'joi';

/**
 * Resend sender shape: `addr@domain.tld` or `Display Name <addr@domain.tld>`.
 * Loose on purpose (no full RFC 5322) — it catches the real misconfigs
 * (a bare name, a missing domain) without rejecting exotic-but-valid senders.
 */
const SENDER_PATTERN =
  /^(?:[^<>\s]+@[^<>\s]+\.[^<>\s]{2,}|[^<>]+<[^<>\s]+@[^<>\s]+\.[^<>\s]{2,}>)$/;

/**
 * Joi schema validating `process.env` at boot (fail-fast — ADR-0008).
 * `@nestjs/config` runs this BEFORE any module initializes; any failure aborts
 * startup with the full list of violations.
 *
 * Ported from the donor, extended with PayPal (ADR-0006) + Sentry (ADR-0008).
 */
export const envValidationSchema = Joi.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // ── Database (Supabase Postgres via Supavisor) ──────────────────────────────
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  DIRECT_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // ── Supabase Auth ──────────────────────────────────────────────────────────
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_JWKS_URL: Joi.string().uri().required(),
  SUPABASE_JWT_SECRET: Joi.string().allow('').optional(),
  ADMIN_EMAILS: Joi.string().allow('').default(''),

  // ── Cloudinary ───────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  CLOUDINARY_UPLOAD_FOLDER: Joi.string().default('tourism'),

  // ── Stripe (international) ───────────────────────────────────────────────
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_DEFAULT_CURRENCY: Joi.string().length(3).lowercase().default('usd'),
  FRONTEND_URL: Joi.string().uri().required(),

  // ── PayPal (international — ADR-0006 amended; replaced MoMo) ──────────────
  // Optional until the PayPal integration lands (P1.5c) — tighten to
  // `.required()` then so a misconfigured gateway fails fast.
  PAYPAL_CLIENT_ID: Joi.string().allow('').optional(),
  PAYPAL_CLIENT_SECRET: Joi.string().allow('').optional(),
  PAYPAL_MODE: Joi.string().valid('sandbox', 'live').default('sandbox'),
  PAYPAL_WEBHOOK_ID: Joi.string().allow('').optional(),

  // ── Email (Resend) ─────────────────────────────────────────────────────────
  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().pattern(SENDER_PATTERN).required(),
  // Optional support inbox replies land in (API-W1). Empty = header omitted
  // (replies to noreply@ bounce — the root domain has no MX by design).
  RESEND_REPLY_TO_EMAIL: Joi.string()
    .pattern(SENDER_PATTERN)
    .allow('')
    .optional(),

  // ── Observability (Sentry — ADR-0008) ────────────────────────────────────
  SENTRY_DSN: Joi.string().uri().allow('').optional(),

  // ── Throttler ──────────────────────────────────────────────────────────────
  THROTTLE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(100),
});
