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
  PAYPAL_CLIENT_ID: 'client',
  PAYPAL_CLIENT_SECRET: 'secret',
  PAYPAL_WEBHOOK_ID: 'wh_x',
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
    expect(value.PAYPAL_MODE).toBe('sandbox');
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

  describe('PayPal fail-fast (API-W2)', () => {
    it.each(['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] as const)(
      'fails when %s is missing',
      (key) => {
        const env = { ...validEnv } as Record<string, string>;
        delete env[key];
        const { error } = envValidationSchema.validate(env, {
          abortEarly: false,
        });
        expect(error).toBeDefined();
        expect(error?.message).toContain(key);
      },
    );

    it('rejects an empty PAYPAL_CLIENT_SECRET (no silently broken gateway)', () => {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        PAYPAL_CLIENT_SECRET: '',
      });
      expect(error).toBeDefined();
    });

    it('allows an empty PAYPAL_WEBHOOK_ID (local dev never receives webhooks)', () => {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        PAYPAL_WEBHOOK_ID: '',
      });
      expect(error).toBeUndefined();
    });
  });

  describe('Resend sender/reply-to formats (API-W1)', () => {
    it.each(['noreply@example.com', 'Nexora <noreply@nexora-travel.agency>'])(
      'accepts RESEND_FROM_EMAIL %p',
      (from) => {
        const { error } = envValidationSchema.validate({
          ...validEnv,
          RESEND_FROM_EMAIL: from,
        });
        expect(error).toBeUndefined();
      },
    );

    it.each(['just-a-name', 'Nexora <not-an-email>', 'a@b'])(
      'rejects malformed RESEND_FROM_EMAIL %p',
      (from) => {
        const { error } = envValidationSchema.validate({
          ...validEnv,
          RESEND_FROM_EMAIL: from,
        });
        expect(error).toBeDefined();
        expect(error?.message).toContain('RESEND_FROM_EMAIL');
      },
    );

    it('treats RESEND_REPLY_TO_EMAIL as optional (absent or empty)', () => {
      expect(envValidationSchema.validate(validEnv).error).toBeUndefined();
      expect(
        envValidationSchema.validate({
          ...validEnv,
          RESEND_REPLY_TO_EMAIL: '',
        }).error,
      ).toBeUndefined();
    });

    it.each([
      'support@example.com',
      'Nexora Support <support@nexora-travel.agency>',
    ])('accepts RESEND_REPLY_TO_EMAIL %p', (replyTo) => {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        RESEND_REPLY_TO_EMAIL: replyTo,
      });
      expect(error).toBeUndefined();
    });

    it('rejects a malformed RESEND_REPLY_TO_EMAIL', () => {
      const { error } = envValidationSchema.validate({
        ...validEnv,
        RESEND_REPLY_TO_EMAIL: 'not-an-email',
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('RESEND_REPLY_TO_EMAIL');
    });
  });
});
