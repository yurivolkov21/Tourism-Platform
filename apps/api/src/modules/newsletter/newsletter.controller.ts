import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SubscribeAckDto, SubscribeDto } from './dto/subscribe.dto';
import { NewsletterService } from './newsletter.service';

/** Public-form anti-abuse: at most 5 submissions / minute / IP. */
const SUBSCRIBE_RATE_LIMIT = 5;
const SUBSCRIBE_RATE_TTL_MS = 60_000;

/**
 * Public newsletter signup mounted at `/newsletter/subscribe`.
 *
 * Hardened for an unauthenticated DB write (ADR-0008, same posture as the
 * enquiry form): `ThrottlerGuard` is applied **only here**, a honeypot
 * (`website`) silently ack's bots, and dedupe is silent (the upsert makes a
 * repeat signup indistinguishable — no email-exists oracle).
 */
@ApiTags('Newsletter')
@Controller('newsletter')
@UseGuards(ThrottlerGuard)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @Public()
  @Throttle({
    default: { limit: SUBSCRIBE_RATE_LIMIT, ttl: SUBSCRIBE_RATE_TTL_MS },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Subscribe to the newsletter (public, rate-limited)',
  })
  @ApiCreatedResponse({ type: SubscribeAckDto, description: 'Received' })
  @ApiResponse({ status: 429, description: 'Too many submissions' })
  async subscribe(@Body() dto: SubscribeDto): Promise<SubscribeAckDto> {
    // Honeypot: a real user never fills `website`. Silently drop bot fills —
    // return the same ack a legit submission gets, so bots learn nothing.
    if (dto.website && dto.website.trim().length > 0) {
      return { received: true };
    }
    await this.newsletterService.subscribe(dto);
    return { received: true };
  }
}
