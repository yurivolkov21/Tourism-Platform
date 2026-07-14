import { messages } from '@tourism/i18n';

// Pure helpers for the floating Contact Launcher
// (spec: docs/06-specs/2026-07-14-contact-launcher-design.md).

export type ContactChannel =
  | { kind: 'bot' }
  | { kind: 'whatsapp'; phone: string }
  | { kind: 'enquiry'; href: '/contact' };

const MIN_PHONE_DIGITS = 7;
const TOUR_DETAIL_RE = /^\/tours\/[^/]+$/;
const BOOKING_RE = /^\/tours\/[^/]+\/book$/;
// Page titles are single-branded `%s — Nexora` (see pageMeta); strip only the final suffix.
const BRAND_TITLE_SUFFIX = ` — ${messages.brand.name}`;

/** wa.me requires the international number as bare digits (no +, spaces, dashes, brackets). */
export function normalizeWhatsAppPhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[+\s\-()]/g, '');
  if (!/^\d+$/.test(digits) || digits.length < MIN_PHONE_DIGITS) return null;
  return digits;
}

export function buildWhatsAppLink(phone: string, text?: string): string {
  const base = `https://wa.me/${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Channels in display order: the AI concierge first (always on — the panel
 * itself degrades when the API has no key), then env-gated externals, then
 * the enquiry form last.
 */
export function getContactChannels(env: {
  whatsappPhone?: string;
}): ContactChannel[] {
  const channels: ContactChannel[] = [{ kind: 'bot' }];
  const phone = normalizeWhatsAppPhone(env.whatsappPhone);
  if (phone) channels.push({ kind: 'whatsapp', phone });
  channels.push({ kind: 'enquiry', href: '/contact' });
  return channels;
}

export function buildPrefill(input: {
  pathname: string;
  documentTitle?: string;
  url: string;
}): string {
  const { pathname, documentTitle, url } = input;
  if (
    TOUR_DETAIL_RE.test(pathname) &&
    documentTitle?.endsWith(BRAND_TITLE_SUFFIX)
  ) {
    const title = documentTitle.slice(0, -BRAND_TITLE_SUFFIX.length);
    if (title) return messages.contactLauncher.prefillTour(title, url);
  }
  return messages.contactLauncher.prefillGeneric;
}

/** Hidden on the booking money-path (checkout distraction rule); auth routes are AppShell's concern. */
export function isLauncherHidden(pathname: string): boolean {
  return (
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    BOOKING_RE.test(pathname)
  );
}
