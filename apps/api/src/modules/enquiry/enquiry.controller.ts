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
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiryAckDto } from './dto/enquiry.dto';
import { EnquiryService } from './enquiry.service';

/** Public-form anti-abuse: at most 5 submissions / minute / IP. */
const ENQUIRY_RATE_LIMIT = 5;
const ENQUIRY_RATE_TTL_MS = 60_000;

/**
 * Public "Inquire Now" lead form mounted at `/enquiries`.
 *
 * Hardened for an unauthenticated DB write (ADR-0008): `ThrottlerGuard` is
 * applied **only here** (not globally), so the rate limit doesn't touch the rest
 * of the API. A honeypot (`website`) catches bots — a filled value is silently
 * accepted (201) and never persisted, denying the bot any failure signal.
 */
@ApiTags('Enquiries')
@Controller('enquiries')
@UseGuards(ThrottlerGuard)
export class EnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Post()
  @Public()
  @Throttle({
    default: { limit: ENQUIRY_RATE_LIMIT, ttl: ENQUIRY_RATE_TTL_MS },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a tour enquiry (public, rate-limited)' })
  @ApiCreatedResponse({ type: EnquiryAckDto, description: 'Received' })
  @ApiResponse({ status: 404, description: 'Referenced tour not found' })
  @ApiResponse({ status: 429, description: 'Too many submissions' })
  async create(@Body() dto: CreateEnquiryDto): Promise<EnquiryAckDto> {
    // Honeypot: a real user never fills `website`. Silently drop bot fills —
    // return the same ack a legit submission gets, so bots learn nothing.
    if (dto.website && dto.website.trim().length > 0) {
      return { received: true };
    }
    await this.enquiryService.create(dto);
    return { received: true };
  }
}
