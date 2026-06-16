import { SetMetadata } from '@nestjs/common';

/**
 * Reflector key for `@SkipTransform()`. Read by `TransformInterceptor` to bypass
 * envelope-wrapping for a specific route.
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Marks a route as opting out of the global envelope. Use sparingly — almost
 * every endpoint should keep `{ data, error, meta }`.
 *
 * Legitimate uses: payment webhooks (Stripe/PayPal expect a plain ack body),
 * file downloads, or binary streams where the framework owns the body.
 */
export const SkipTransform = (): MethodDecorator =>
  SetMetadata(SKIP_TRANSFORM_KEY, true);
