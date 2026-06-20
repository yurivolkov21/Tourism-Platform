import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  BookingEmailVars,
  EnquiryReceivedVars,
  RenderedEmail,
  ReviewApprovedVars,
  renderBookingConfirmation,
  renderBookingRefunded,
  renderEnquiryReceived,
  renderReviewApproved,
} from './email.templates';

/**
 * Transactional email surface backed by Resend (EN-only — ADR-0005).
 *
 * Unlike the donor (which swallowed failures because it was called inline on the
 * Stripe webhook path), this version **throws** on a Resend rejection. That is
 * deliberate and safe: in P1.x nothing on the request/webhook path calls this
 * service — the state change only writes an outbox row. The pg-boss worker is the
 * sole caller, and it relies on a thrown error to mark the row FAILED and retry
 * (ADR-0007). A PAID booking can therefore never be undone by an email hiccup.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend!: Resend;
  private fromEmail!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.getOrThrow<string>('email.resendApiKey');
    this.fromEmail = this.config.getOrThrow<string>('email.fromEmail');
    this.resend = new Resend(apiKey);
  }

  sendBookingConfirmation(args: {
    to: string;
    vars: BookingEmailVars;
  }): Promise<void> {
    return this.dispatch(
      args.to,
      renderBookingConfirmation(args.vars),
      `booking-confirmation:${args.vars.code}`,
    );
  }

  sendBookingRefunded(args: {
    to: string;
    vars: BookingEmailVars;
  }): Promise<void> {
    return this.dispatch(
      args.to,
      renderBookingRefunded(args.vars),
      `booking-refunded:${args.vars.code}`,
    );
  }

  sendReviewApproved(args: {
    to: string;
    vars: ReviewApprovedVars;
  }): Promise<void> {
    return this.dispatch(
      args.to,
      renderReviewApproved(args.vars),
      `review-approved:${args.to}`,
    );
  }

  sendEnquiryReceived(args: {
    to: string;
    vars: EnquiryReceivedVars;
  }): Promise<void> {
    return this.dispatch(
      args.to,
      renderEnquiryReceived(args.vars),
      `enquiry-received:${args.to}`,
    );
  }

  /**
   * Send via Resend. Throws on a rejected send (the worker maps that to a
   * FAILED outbox row + retry); logs the resend id on success.
   */
  private async dispatch(
    to: string,
    rendered: RenderedEmail,
    tag: string,
  ): Promise<void> {
    const result = await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (result.error) {
      throw new Error(`Resend rejected ${tag} → ${to}: ${result.error.message}`);
    }
    this.logger.log(
      `Sent ${tag} → ${to} (resend_id=${result.data?.id ?? 'n/a'})`,
    );
  }
}
