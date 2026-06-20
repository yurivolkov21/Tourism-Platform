/**
 * Inline transactional email templates — EN-only (ADR-0005). Plain template
 * literals (no Handlebars / MJML / react-email) on purpose: the platform ships a
 * handful of transactional emails and a template engine would be premature.
 *
 * Ported from the donor (`modules/email/email.templates.ts`), with the bilingual
 * `Locale` branch dropped (English-only) and two net-new renderers added for the
 * P1.x outbox (review-approved, enquiry-received).
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface BookingEmailVars {
  code: string;
  tourTitle: string;
  contactName: string;
  totalAmount: string;
  currency: string;
  numAdults: number;
  numChildren: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface ReviewApprovedVars {
  reviewerName: string;
  tourTitle: string;
  rating: number;
}

export interface EnquiryReceivedVars {
  name: string;
  message: string;
  tourTitle?: string | null;
}

const formatDate = (d: Date | null | undefined): string => {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

export const renderBookingConfirmation = (
  vars: BookingEmailVars,
): RenderedEmail => {
  const subject = `Booking confirmed — ${vars.code}`;
  const text = [
    `Hi ${vars.contactName},`,
    ``,
    `Thank you for booking "${vars.tourTitle}". Your payment is confirmed.`,
    ``,
    `Booking code: ${vars.code}`,
    `Travelers: ${vars.numAdults} adult(s) + ${vars.numChildren} child(ren)`,
    `Departure: ${formatDate(vars.startDate)} → ${formatDate(vars.endDate)}`,
    `Total paid: ${vars.totalAmount} ${vars.currency}`,
    ``,
    `Your detailed voucher will arrive 24 hours before departure.`,
    `Reply to this email for any questions.`,
  ].join('\n');
  return { subject, text, html: textToHtml(text) };
};

export const renderBookingRefunded = (
  vars: BookingEmailVars,
): RenderedEmail => {
  const subject = `Refund processed — ${vars.code}`;
  const text = [
    `Hi ${vars.contactName},`,
    ``,
    `Your booking "${vars.tourTitle}" (${vars.code}) has been refunded.`,
    `Refund amount: ${vars.totalAmount} ${vars.currency}`,
    ``,
    `The amount will return to the original card within 5–10 business days.`,
    `Reply to this email if you need further help.`,
  ].join('\n');
  return { subject, text, html: textToHtml(text) };
};

export const renderReviewApproved = (
  vars: ReviewApprovedVars,
): RenderedEmail => {
  const subject = `Your review is now live — ${vars.tourTitle}`;
  const stars = '★'.repeat(vars.rating) + '☆'.repeat(Math.max(0, 5 - vars.rating));
  const text = [
    `Hi ${vars.reviewerName},`,
    ``,
    `Thanks for sharing your experience — your ${vars.rating}-star review of`,
    `"${vars.tourTitle}" (${stars}) has been approved and is now published.`,
    ``,
    `We appreciate you helping other travelers choose with confidence.`,
    `Reply to this email if you'd like to make any changes.`,
  ].join('\n');
  return { subject, text, html: textToHtml(text) };
};

export const renderEnquiryReceived = (
  vars: EnquiryReceivedVars,
): RenderedEmail => {
  const about = vars.tourTitle ? ` about "${vars.tourTitle}"` : '';
  const subject = vars.tourTitle
    ? `We received your enquiry — ${vars.tourTitle}`
    : `We received your enquiry`;
  const text = [
    `Hi ${vars.name},`,
    ``,
    `Thanks for reaching out${about}. We've received your message and a member`,
    `of our team will get back to you within one business day.`,
    ``,
    `For reference, here's what you sent us:`,
    `"${vars.message}"`,
    ``,
    `Reply to this email if you have anything to add.`,
  ].join('\n');
  return { subject, text, html: textToHtml(text) };
};

/**
 * Minimal text-to-HTML — wraps each line in `<p>`, preserves blank lines as
 * spacers. Resend deliverability prefers a real HTML body even for plain prose,
 * so every send carries both parts.
 */
const textToHtml = (text: string): string => {
  const escape = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = text
    .split('\n')
    .map((line) =>
      line.trim() === '' ? '<p>&nbsp;</p>' : `<p>${escape(line)}</p>`,
    )
    .join('');
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">${body}</body></html>`;
};
