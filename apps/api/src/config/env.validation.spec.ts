import { envValidationSchema } from './env.validation';

/** Minimal env with every *required* key present (valid values). */
const validEnv = {
  DATABASE_URL: 'postgresql://u:p@localhost:6543/db',
  DIRECT_URL: 'postgresql://u:p@localhost:5432/db',
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  SUPABASE_JWKS_URL: 'https://x.supabase.co/auth/v1/.well-known/jwks.json',
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_WEBHOOK_SECRET: 'whsec_x',
  FRONTEND_URL: 'https://app.example.com',
  MOMO_PARTNER_CODE: 'MOMOXXXX',
  MOMO_ACCESS_KEY: 'access',
  MOMO_SECRET_KEY: 'secret',
  MOMO_REDIRECT_URL: 'https://app.example.com/checkout/return',
  MOMO_IPN_URL: 'https://api.example.com/api/v1/payments/momo/ipn',
  RESEND_API_KEY: 're_x',
  RESEND_FROM_EMAIL: 'Tourism <noreply@example.com>',
};

describe('envValidationSchema', () => {
  it('accepts a complete env and applies operational defaults', () => {
    const { value, error } = envValidationSchema.validate(validEnv);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.API_PREFIX).toBe('api/v1');
    expect(value.STRIPE_DEFAULT_CURRENCY).toBe('usd');
    expect(value.THROTTLE_LIMIT).toBe(100);
    expect(value.MOMO_ENDPOINT).toContain('momo.vn');
  });

  it('fails fast when a required secret is missing', () => {
    const { DATABASE_URL, ...withoutDb } = validEnv;
    void DATABASE_URL;

    const { error } = envValidationSchema.validate(withoutDb, {
      abortEarly: false,
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      DATABASE_URL: 'mysql://u:p@localhost:3306/db',
    });

    expect(error).toBeDefined();
  });
});
