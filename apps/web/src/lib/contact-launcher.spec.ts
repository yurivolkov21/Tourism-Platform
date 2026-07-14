import { messages } from '@tourism/i18n';

import {
  buildPrefill,
  buildWhatsAppLink,
  getContactChannels,
  isLauncherHidden,
  normalizeWhatsAppPhone,
} from './contact-launcher';

describe('normalizeWhatsAppPhone', () => {
  it('strips plus, spaces, dashes and brackets down to digits', () => {
    expect(normalizeWhatsAppPhone('+84 (91) 234-5678')).toBe('84912345678');
  });

  it('returns null for undefined or blank input', () => {
    expect(normalizeWhatsAppPhone(undefined)).toBeNull();
    expect(normalizeWhatsAppPhone('   ')).toBeNull();
  });

  it('returns null when non-digit characters remain', () => {
    expect(normalizeWhatsAppPhone('call-me-maybe')).toBeNull();
  });

  it('returns null for numbers shorter than 7 digits', () => {
    expect(normalizeWhatsAppPhone('12345')).toBeNull();
  });
});

describe('buildWhatsAppLink', () => {
  it('builds a bare wa.me URL without text', () => {
    expect(buildWhatsAppLink('84912345678')).toBe('https://wa.me/84912345678');
  });

  it('appends URL-encoded prefill text', () => {
    expect(buildWhatsAppLink('84912345678', 'Hi “Nexora” — hello')).toBe(
      'https://wa.me/84912345678?text=Hi%20%E2%80%9CNexora%E2%80%9D%20%E2%80%94%20hello',
    );
  });
});

describe('getContactChannels', () => {
  it('returns enquiry only when the WhatsApp env is unset', () => {
    expect(getContactChannels({})).toEqual([
      { kind: 'enquiry', href: '/contact' },
    ]);
  });

  it('returns enquiry only when the WhatsApp env is blank or invalid', () => {
    expect(getContactChannels({ whatsappPhone: '  ' })).toEqual([
      { kind: 'enquiry', href: '/contact' },
    ]);
    expect(getContactChannels({ whatsappPhone: 'not-a-phone' })).toEqual([
      { kind: 'enquiry', href: '/contact' },
    ]);
  });

  it('puts WhatsApp (normalized) first and enquiry last when configured', () => {
    expect(getContactChannels({ whatsappPhone: '+84 912 345 678' })).toEqual([
      { kind: 'whatsapp', phone: '84912345678' },
      { kind: 'enquiry', href: '/contact' },
    ]);
  });
});

describe('buildPrefill', () => {
  const url = 'https://nexora.example/tours/ha-long-cruise';

  it('uses the tour prefill with the brand suffix stripped on tour detail pages', () => {
    expect(
      buildPrefill({
        pathname: '/tours/ha-long-cruise',
        documentTitle: 'Ha Long Cruise — Nexora',
        url,
      }),
    ).toBe(messages.contactLauncher.prefillTour('Ha Long Cruise', url));
  });

  it('strips only the final brand suffix when the title itself contains an em-dash', () => {
    expect(
      buildPrefill({
        pathname: '/tours/sapa',
        documentTitle: 'Sapa — Trek & Homestay — Nexora',
        url,
      }),
    ).toBe(messages.contactLauncher.prefillTour('Sapa — Trek & Homestay', url));
  });

  it('falls back to the generic prefill off tour pages', () => {
    expect(
      buildPrefill({
        pathname: '/destinations',
        documentTitle: 'Destinations — Nexora',
        url,
      }),
    ).toBe(messages.contactLauncher.prefillGeneric);
  });

  it('falls back to the generic prefill when the document title is missing', () => {
    expect(buildPrefill({ pathname: '/tours/ha-long-cruise', url })).toBe(
      messages.contactLauncher.prefillGeneric,
    );
  });

  it('does not treat the booking sub-route as a tour detail page', () => {
    expect(
      buildPrefill({
        pathname: '/tours/ha-long-cruise/book',
        documentTitle: 'Book — Nexora',
        url,
      }),
    ).toBe(messages.contactLauncher.prefillGeneric);
  });
});

describe('isLauncherHidden', () => {
  it.each([
    '/checkout',
    '/checkout/success',
    '/checkout/cancel',
    '/tours/ha-long/book',
  ])('hides the launcher on money-path route %s', (pathname) => {
    expect(isLauncherHidden(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/tours',
    '/tours/ha-long',
    '/contact',
    '/account/bookings',
    '/checkout-faq',
  ])('shows the launcher on %s', (pathname) => {
    expect(isLauncherHidden(pathname)).toBe(false);
  });
});
