import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { PaymentsService } from './payments.service';

/**
 * Stripe webhook receiver — the only public, unauthenticated mutation in the API.
 * Stripe authenticates by signing the request body, not by JWT, so two framework
 * opt-outs are mandatory:
 *  - `@Public()` — skip `SupabaseJwtGuard`.
 *  - `@SkipTransform()` — skip the `{ data, error }` envelope (Stripe wants a
 *    plain ack; log readers see `{ received, eventId, type }` unchanged).
 *
 * Raw body: `express.raw({ type: 'application/json' })` is mounted on this exact
 * path in `main.ts` BEFORE the global JSON parser, so `req.body` is the untouched
 * `Buffer` Stripe signed — what `constructEvent` needs. We return 200 on every
 * verified event (even unhandled types) so Stripe doesn't retry-storm 4xx/5xx.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/webhook')
  @Public()
  @SkipTransform()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver (signature-verified)' })
  @ApiResponse({ status: 200, description: 'Event processed or ignored' })
  @ApiResponse({ status: 400, description: 'Signature verification failed' })
  async handleStripe(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: true; eventId: string; type: string }> {
    if (!signature) {
      throw new BadRequestException({
        code: 'STRIPE_WEBHOOK_INVALID',
        message: 'Missing Stripe-Signature header',
      });
    }
    const rawBody = req.body as unknown;
    if (!Buffer.isBuffer(rawBody)) {
      throw new BadRequestException({
        code: 'STRIPE_WEBHOOK_INVALID',
        message:
          'Raw body missing — express.raw middleware likely not mounted on this path',
      });
    }
    return this.paymentsService.handleStripeEvent(rawBody, signature);
  }

  @Post('paypal/webhook')
  @Public()
  @SkipTransform()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayPal webhook receiver (signature-verified)' })
  @ApiResponse({ status: 200, description: 'Event processed or ignored' })
  @ApiResponse({ status: 400, description: 'Signature verification failed' })
  async handlePayPal(
    @Req() req: Request,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{ received: true; eventId: string; type: string }> {
    // PayPal verification uses the parsed event + transmission headers, so the
    // normal JSON body is fine (no express.raw needed, unlike Stripe).
    return this.paymentsService.handlePayPalEvent(headers, req.body);
  }
}
