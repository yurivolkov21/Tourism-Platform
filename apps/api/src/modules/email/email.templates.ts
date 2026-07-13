/**
 * Inline transactional email templates — EN-only (ADR-0005). Plain template
 * literals (no Handlebars / MJML / react-email) on purpose: the platform ships
 * a handful of transactional emails and a template engine would be premature.
 *
 * Visual system (API-W1, user-approved 2026-07-13): a port of react.email's
 * "Barebone" template (MIT) — 640px white frame → centered gray content card
 * → optional white data card → one brand button — re-tinted with the Nexora
 * emerald. Hex is hardcoded by rule: the app's oklch tokens don't exist in an
 * inbox. Every send still carries a plain-text part (deliverability).
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

export interface BookingConfirmationVars extends BookingEmailVars {
  /** Absolute hero image URL (tour hero media); null = monogram fallback. */
  tourImageUrl?: string | null;
  tourImageAlt?: string | null;
  /** CTA target — the customer's bookings page. */
  manageUrl: string;
}

export interface BookingRefundedVars extends BookingEmailVars {
  /** The amount actually refunded (display string, no currency). */
  refundedAmount: string;
  isPartial: boolean;
}

export interface ReviewApprovedVars {
  reviewerName: string;
  tourTitle: string;
  rating: number;
  /** CTA target — the tour detail page carrying the review. */
  tourUrl: string;
}

export interface EnquiryReceivedVars {
  name: string;
  message: string;
  tourTitle?: string | null;
  /** Link target for the browse-while-you-wait line. */
  browseUrl: string;
}

export interface CancellationRequestedVars {
  code: string;
  tourTitle: string;
  contactName: string;
}

export interface CancellationDeniedVars {
  code: string;
  contactName: string;
  decisionNote?: string | null;
  manageUrl: string;
}

export interface NewsletterWelcomeVars {
  journalUrl: string;
}

// ── Design tokens (Barebone port + Nexora deltas) ───────────────────────────

const C = {
  ground: '#f3f4f6',
  frame: '#ffffff',
  fg: '#14171e',
  fg2: '#43454b',
  fg3: '#7b7d81',
  stroke: '#f0f0f0',
  brand: '#2f6b4f',
  star: '#b9832e',
  pillBg: '#fdf3e0',
  pillFg: '#9a6b1f',
} as const;

const FONT = "Inter,'Segoe UI',Arial,sans-serif";
/** Brand footer link — identity, not a per-env CTA (those are injected). */
const SITE_URL = 'https://www.nexora-travel.agency';
const SITE_LABEL = 'nexora-travel.agency';
const TAGLINE = 'Nexora — boutique heritage journeys across Vietnam.';
const CONTACT_LINE = 'Hồ Chí Minh City, Vietnam · 1900 292 958';

/** Inter static weights with Arial fallback — react.email's own approach. */
const FONT_FACES = `
@font-face{font-family:Inter;font-style:normal;font-weight:400;src:url(https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuOKfMZg.ttf) format('truetype')}
@font-face{font-family:Inter;font-style:normal;font-weight:500;src:url(https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf) format('truetype')}
@font-face{font-family:Inter;font-style:normal;font-weight:600;src:url(https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf) format('truetype')}
`.trim();

export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (d: Date | null | undefined): string => {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

// ── Shell building blocks (all content args must arrive pre-escaped) ────────

const monogram = (size: number, radius: number, fontSize: number): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px"><tr><td width="${size}" height="${size}" align="center" style="background:${C.brand};border-radius:${radius}px;color:#ffffff;font-family:${FONT};font-size:${fontSize}px;font-weight:700;line-height:${size}px">N</td></tr></table>`;

const heroImage = (url: string, alt: string): string =>
  `<img src="${url}" width="512" alt="${alt}" style="display:block;width:100%;height:auto;border-radius:8px;margin:0 0 28px">`;

const starsRow = (rating: number): string => {
  const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  return `<div style="font-size:24px;letter-spacing:6px;color:${C.star};margin:0 0 20px" aria-label="${rating} out of 5 stars">${stars}</div>`;
};

interface DataRow {
  label: string;
  valueHtml: string;
}

const plainValue = (v: string): string =>
  `<span style="font-size:14px;font-weight:500;color:${C.fg}">${v}</span>`;

const moneyValue = (v: string): string =>
  `<span style="font-size:16px;font-weight:600;color:${C.brand}">${v}</span>`;

const pillValue = (v: string): string =>
  `<span style="display:inline-block;background:${C.pillBg};color:${C.pillFg};font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px">${v}</span>`;

/** White data card: label-left / value-right rows split by hairlines. */
const dataCard = (rows: DataRow[]): string => {
  const body = rows
    .map(
      (r) =>
        `<tr><td align="left" style="padding:13px 0;font-size:13px;color:${C.fg3}">${r.label}</td><td align="right" style="padding:13px 0">${r.valueHtml}</td></tr>`,
    )
    .join(
      `<tr><td colspan="2" style="border-top:1px solid ${C.stroke};font-size:0;line-height:0">&nbsp;</td></tr>`,
    );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.frame};border-radius:8px;margin:0 0 28px"><tr><td style="padding:8px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT}">${body}</table></td></tr></table>`;
};

/** White quote card: small caps label + italic quoted content. */
const quoteCard = (label: string, contentHtml: string): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.frame};border-radius:8px;margin:0 0 28px"><tr><td align="left" style="padding:20px 24px"><p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1px;color:${C.fg3}">${label}</p><p style="margin:0;font-family:${FONT};font-style:italic;font-size:14px;line-height:1.6;color:${C.fg2}">${contentHtml}</p></td></tr></table>`;

const button = (label: string, url: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="border-radius:8px;background:${C.brand}"><a href="${url}" style="display:inline-block;padding:16px 28px;font-family:${FONT};font-size:16px;font-weight:500;line-height:24px;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a></td></tr></table>`;

const bodyParagraph = (contentHtml: string, maxWidth = 400): string =>
  `<p style="margin:0 auto 28px;max-width:${maxWidth}px;font-family:${FONT};font-size:16px;line-height:1.5;color:${C.fg2}">${contentHtml}</p>`;

const noteParagraph = (contentHtml: string): string =>
  `<p style="margin:32px auto 0;max-width:400px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.fg3}">${contentHtml}</p>`;

interface ShellVars {
  /** Inbox preview snippet (hidden in the body). Pre-escaped. */
  preheader: string;
  /** Top of the content card: hero image / stars. Default: 48px monogram. */
  topHtml?: string;
  /** Pre-escaped heading. */
  heading: string;
  /** One or more bodyParagraph()/dataCard()/quoteCard()/button() blocks. */
  contentHtml: string;
  /** Small gray closing note inside the card (noteParagraph()). */
  noteHtml?: string;
  /** Footer "why you got this" line. Pre-escaped. */
  footerReason?: string;
  /** Newsletter only: the unsubscribe footer line (pre-built HTML). */
  unsubscribeHtml?: string;
  /** Tighter top padding when a hero image leads the card. */
  hasHero?: boolean;
}

const renderShell = (v: ShellVars): string => {
  const top = v.topHtml ?? monogram(48, 12, 22);
  const cardPadding = v.hasHero ? '40px 40px 48px' : '56px 40px 60px';
  const footerReason = v.footerReason
    ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:${C.fg3}">${v.footerReason}</p>`
    : '';
  const unsubscribe = v.unsubscribeHtml
    ? `<p style="margin:16px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:${C.fg3}">${v.unsubscribeHtml}</p>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${FONT_FACES}</style></head><body style="margin:0;padding:0;background:${C.ground}"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${v.preheader}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ground}"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${C.frame};border-radius:12px"><tr><td style="padding:16px 24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" style="vertical-align:middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="26" height="26" align="center" style="background:${C.brand};border-radius:7px;color:#ffffff;font-family:${FONT};font-size:13px;font-weight:700;line-height:26px">N</td></tr></table></td><td align="right" style="vertical-align:middle;font-family:${FONT};font-size:13px;color:${C.fg3}">Nexora</td></tr></table></td></tr><tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ground};border-radius:8px"><tr><td align="center" style="padding:${cardPadding}">${top}<h1 style="margin:0 0 12px;font-family:${FONT};font-size:28px;line-height:1.3;font-weight:600;letter-spacing:-0.1px;color:${C.fg}">${v.heading}</h1>${v.contentHtml}${v.noteHtml ?? ''}</td></tr></table></td></tr><tr><td align="center" style="padding:36px 24px 40px"><p style="margin:0 auto;max-width:280px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.fg3}">${TAGLINE}</p><p style="margin:16px 0 0;font-family:${FONT};font-size:11px;line-height:1.5;color:${C.fg3}">${CONTACT_LINE} · <a href="${SITE_URL}" style="color:${C.fg3}">${SITE_LABEL}</a></p>${footerReason}${unsubscribe}</td></tr></table></td></tr></table></body></html>`;
};

// ── Renderers ────────────────────────────────────────────────────────────────

export const renderBookingConfirmation = (
  vars: BookingConfirmationVars,
): RenderedEmail => {
  const code = escapeHtml(vars.code);
  const tour = escapeHtml(vars.tourTitle);
  const name = escapeHtml(vars.contactName);
  const dates = `${formatDate(vars.startDate)} → ${formatDate(vars.endDate)}`;
  const travellers = `${vars.numAdults} adult(s) + ${vars.numChildren} child(ren)`;
  const total = `${escapeHtml(vars.totalAmount)} ${escapeHtml(vars.currency)}`;
  const subject = `Booking confirmed — ${vars.code} · ${vars.tourTitle}`;

  const text = [
    `Hi ${vars.contactName},`,
    ``,
    `Your payment is confirmed and your seats are reserved.`,
    ``,
    `Booking code: ${vars.code}`,
    `Tour: ${vars.tourTitle}`,
    `Departure: ${formatDate(vars.startDate)} → ${formatDate(vars.endDate)}`,
    `Travelers: ${travellers}`,
    `Total paid: ${vars.totalAmount} ${vars.currency}`,
    ``,
    `View my booking: ${vars.manageUrl}`,
    ``,
    `Your detailed voucher arrives 24 hours before departure.`,
    `Questions? Reply to this email — a real person reads it.`,
  ].join('\n');

  const html = renderShell({
    preheader: `Your seats for ${tour} are reserved — booking ${code}.`,
    topHtml: vars.tourImageUrl
      ? heroImage(
          escapeHtml(vars.tourImageUrl),
          escapeHtml(vars.tourImageAlt ?? vars.tourTitle),
        )
      : undefined,
    hasHero: Boolean(vars.tourImageUrl),
    heading: `You're going, ${name}!`,
    contentHtml:
      bodyParagraph(
        `Your payment is confirmed and your seats are reserved. Keep this email handy on the day.`,
      ) +
      dataCard([
        {
          label: 'Booking code',
          valueHtml: plainValue(`<span style="font-weight:600">${code}</span>`),
        },
        { label: 'Tour', valueHtml: plainValue(tour) },
        { label: 'Departure', valueHtml: plainValue(escapeHtml(dates)) },
        { label: 'Travellers', valueHtml: plainValue(escapeHtml(travellers)) },
        { label: 'Total paid', valueHtml: moneyValue(total) },
      ]) +
      button('View my booking', escapeHtml(vars.manageUrl)),
    noteHtml: noteParagraph(
      `Your detailed voucher arrives 24 hours before departure.<br>Questions? Reply to this email — a real person reads it.`,
    ),
    footerReason: `You're receiving this because of a booking made at Nexora.`,
  });

  return { subject, html, text };
};

export const renderBookingRefunded = (
  vars: BookingRefundedVars,
): RenderedEmail => {
  const code = escapeHtml(vars.code);
  const tour = escapeHtml(vars.tourTitle);
  const refunded = `${escapeHtml(vars.refundedAmount)} ${escapeHtml(vars.currency)}`;
  const total = `${escapeHtml(vars.totalAmount)} ${escapeHtml(vars.currency)}`;
  const subject = `Refund on its way — ${vars.code}`;

  const text = [
    `Hi ${vars.contactName},`,
    ``,
    vars.isPartial
      ? `We've issued a partial refund for booking ${vars.code} ("${vars.tourTitle}").`
      : `We've refunded your booking ${vars.code} ("${vars.tourTitle}").`,
    ``,
    `Refund issued: ${vars.refundedAmount} ${vars.currency}` +
      (vars.isPartial ? ` (of ${vars.totalAmount} ${vars.currency} paid)` : ''),
    `Returns to: original payment method`,
    ``,
    `The amount typically appears within 5-10 business days, depending on your bank.`,
    ...(vars.isPartial
      ? [`Your booking stays active for the remaining travellers.`]
      : []),
    `Anything unclear? Reply to this email.`,
  ].join('\n');

  const rows: DataRow[] = [
    { label: 'Refund issued', valueHtml: moneyValue(refunded) },
    ...(vars.isPartial
      ? [{ label: 'Of total paid', valueHtml: plainValue(total) }]
      : []),
    { label: 'Returns to', valueHtml: plainValue('Original payment method') },
  ];

  const html = renderShell({
    preheader: `Your refund for booking ${code} has been issued.`,
    heading: 'Your refund is on its way',
    contentHtml:
      bodyParagraph(
        vars.isPartial
          ? `Hi ${escapeHtml(vars.contactName)}, we've issued a partial refund for booking <span style="font-weight:600">${code}</span> — ${tour}.`
          : `Hi ${escapeHtml(vars.contactName)}, we've refunded your booking <span style="font-weight:600">${code}</span> — ${tour}.`,
      ) + dataCard(rows),
    noteHtml: noteParagraph(
      `The amount typically appears within 5–10 business days, depending on your bank.` +
        (vars.isPartial
          ? ` Your booking stays active for the remaining travellers.`
          : '') +
        `<br>Anything unclear? Reply to this email.`,
    ),
    footerReason: `You're receiving this because of a booking made at Nexora.`,
  });

  return { subject, html, text };
};

export const renderReviewApproved = (
  vars: ReviewApprovedVars,
): RenderedEmail => {
  const tour = escapeHtml(vars.tourTitle);
  const stars =
    '★'.repeat(vars.rating) + '☆'.repeat(Math.max(0, 5 - vars.rating));
  const subject = `Your review is live — ${vars.tourTitle}`;

  const text = [
    `Hi ${vars.reviewerName},`,
    ``,
    `Your ${vars.rating}-star review of "${vars.tourTitle}" (${stars}) is now published.`,
    `Stories like yours help other travellers choose with confidence — thank you.`,
    ``,
    `See your review: ${vars.tourUrl}`,
    ``,
    `Want to tweak anything? Reply to this email and we'll help.`,
  ].join('\n');

  const html = renderShell({
    preheader: `Your review of ${tour} is now published.`,
    topHtml: starsRow(vars.rating),
    heading: 'Your review is live',
    contentHtml:
      bodyParagraph(
        `Thanks for sharing, ${escapeHtml(vars.reviewerName)}. Your ${vars.rating}-star review of <span style="font-weight:600">${tour}</span> is now published — stories like yours help other travellers choose with confidence.`,
      ) + button('See your review', escapeHtml(vars.tourUrl)),
    noteHtml: noteParagraph(
      `Want to tweak anything?<br>Reply to this email and we'll help.`,
    ),
    footerReason: `You're receiving this because you reviewed a Nexora tour.`,
  });

  return { subject, html, text };
};

export const renderEnquiryReceived = (
  vars: EnquiryReceivedVars,
): RenderedEmail => {
  const name = escapeHtml(vars.name);
  const subject = vars.tourTitle
    ? `We received your enquiry — ${vars.tourTitle}`
    : `We received your enquiry`;

  const text = [
    `Hi ${vars.name},`,
    ``,
    `Thanks for reaching out.` +
      (vars.tourTitle ? ` (About: "${vars.tourTitle}")` : ''),
    `A local expert is reading your message and will get back to you within one business day.`,
    ``,
    `For reference, here's what you sent us:`,
    `"${vars.message}"`,
    ``,
    `While you wait, browse our tours: ${vars.browseUrl}`,
    `Reply to this email if you have anything to add.`,
  ].join('\n');

  const html = renderShell({
    preheader: `We've got your message — a local expert replies within one business day.`,
    heading: `We've got your message`,
    contentHtml:
      bodyParagraph(
        `Hi ${name}, a local expert is reading it now and will get back to you within one business day.`,
      ) + quoteCard('YOUR MESSAGE', `"${escapeHtml(vars.message)}"`),
    noteHtml: noteParagraph(
      `While you wait, <a href="${escapeHtml(vars.browseUrl)}" style="color:${C.brand};font-weight:500">browse our tours</a> —<br>or reply to this email to add anything.`,
    ),
    footerReason: `You're receiving this because you contacted Nexora.`,
  });

  return { subject, html, text };
};

export const renderCancellationRequested = (
  vars: CancellationRequestedVars,
): RenderedEmail => {
  const code = escapeHtml(vars.code);
  const tour = escapeHtml(vars.tourTitle);
  const subject = `We're reviewing your cancellation request — ${vars.code}`;

  const text = [
    `Hi ${vars.contactName},`,
    ``,
    `We've received your request to cancel booking ${vars.code} ("${vars.tourTitle}").`,
    `Our team reviews every request within 48 hours.`,
    ``,
    `Status: under review`,
    `If approved: a refund email follows`,
    ``,
    `Until a decision is made, your booking and seats stay unchanged.`,
    `Changed your mind? Reply to this email.`,
  ].join('\n');

  const html = renderShell({
    preheader: `Your cancellation request for booking ${code} is under review.`,
    heading: `We're reviewing your request`,
    contentHtml:
      bodyParagraph(
        `Hi ${escapeHtml(vars.contactName)}, we've received your request to cancel booking <span style="font-weight:600">${code}</span> (${tour}). Our team reviews every request within 48 hours.`,
      ) +
      dataCard([
        { label: 'Status', valueHtml: pillValue('Under review') },
        {
          label: 'If approved',
          valueHtml: plainValue('A refund email follows'),
        },
      ]),
    noteHtml: noteParagraph(
      `Until a decision is made, your booking and seats stay unchanged.<br>Changed your mind? Reply to this email.`,
    ),
    footerReason: `You're receiving this because of a booking made at Nexora.`,
  });

  return { subject, html, text };
};

export const renderCancellationDenied = (
  vars: CancellationDeniedVars,
): RenderedEmail => {
  const code = escapeHtml(vars.code);
  const subject = `About your cancellation request — ${vars.code}`;
  const fallbackNote =
    'After review, this booking does not qualify for cancellation under our policy.';
  const note = vars.decisionNote?.trim() || fallbackNote;

  const text = [
    `Hi ${vars.contactName},`,
    ``,
    `We've reviewed your cancellation request for booking ${vars.code} and unfortunately we're unable to approve it this time:`,
    `"${note}"`,
    ``,
    `Your booking remains active and we'd love to welcome you on the day.`,
    `Special circumstances? Reply to this email — we read every case individually.`,
    ``,
    `View my booking: ${vars.manageUrl}`,
  ].join('\n');

  const html = renderShell({
    preheader: `An update on your cancellation request for booking ${code}.`,
    heading: 'About your cancellation request',
    contentHtml:
      bodyParagraph(
        `Hi ${escapeHtml(vars.contactName)}, we've reviewed your request for booking <span style="font-weight:600">${code}</span> and unfortunately we're unable to approve it this time:`,
      ) +
      quoteCard('REASON', `"${escapeHtml(note)}"`) +
      bodyParagraph(
        `Your booking remains active and we'd love to welcome you on the day. Special circumstances? Reply to this email — we read every case individually.`,
      ) +
      button('View my booking', escapeHtml(vars.manageUrl)),
    footerReason: `You're receiving this because of a booking made at Nexora.`,
  });

  return { subject, html, text };
};

export const renderNewsletterWelcome = (
  vars: NewsletterWelcomeVars,
): RenderedEmail => {
  const subject = 'Welcome to the Nexora Journal';

  const text = [
    `Welcome aboard.`,
    ``,
    `Once a month — never more — you'll get:`,
    `- New journeys first (small groups sell out fast)`,
    `- Field notes (long-form, from our local guides)`,
    `- Seasonal tips (lanterns, terraces, the north's golden weeks)`,
    ``,
    `Read the Journal: ${vars.journalUrl}`,
    ``,
    `To unsubscribe, reply to this email with "unsubscribe".`,
  ].join('\n');

  const html = renderShell({
    preheader: `Stories from the road, monthly — welcome to the Nexora Journal.`,
    heading: 'Stories from the road, monthly',
    contentHtml:
      bodyParagraph(
        `Welcome aboard. Once a month — never more — you'll get new journeys before they're public, field notes from our local guides, and seasonal tips for timing Vietnam right.`,
      ) +
      dataCard([
        {
          label: 'New journeys first',
          valueHtml: plainValue('Small groups sell out fast'),
        },
        {
          label: 'Field notes',
          valueHtml: plainValue('Long-form, from our guides'),
        },
        {
          label: 'Seasonal tips',
          valueHtml: plainValue('Lanterns, terraces, golden weeks'),
        },
      ]) +
      button('Read the Journal', escapeHtml(vars.journalUrl)),
    footerReason: `You subscribed on ${SITE_LABEL}.`,
    unsubscribeHtml: `Unsubscribe any time by replying to this email with &quot;unsubscribe&quot;.`,
  });

  return { subject, html, text };
};
