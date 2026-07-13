import {
  escapeHtml,
  renderBookingConfirmation,
  renderBookingRefunded,
  renderCancellationDenied,
  renderCancellationRequested,
  renderEnquiryReceived,
  renderNewsletterWelcome,
  renderReviewApproved,
} from './email.templates';

const booking = {
  code: 'BK-ABC123',
  tourTitle: 'Hoi An Lantern Walk',
  contactName: 'Jane Traveller',
  totalAmount: '249.00',
  currency: 'USD',
  numAdults: 2,
  numChildren: 1,
  startDate: new Date('2026-08-01T00:00:00Z'),
  endDate: new Date('2026-08-03T00:00:00Z'),
};

describe('escapeHtml', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeHtml(`<b>&"'x`)).toBe('&lt;b&gt;&amp;&quot;&#39;x');
  });
});

describe('the shared shell (via any renderer)', () => {
  const out = renderNewsletterWelcome({ journalUrl: 'https://x/blog' });

  it('emits a full HTML document on the v2 design system', () => {
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('#f3f4f6'); // page + content-card ground
    expect(out.html).toContain('#2f6b4f'); // brand button
    expect(out.html).toContain('Inter'); // webfont + stack
    expect(out.html).toContain('nexora-travel.agency'); // footer
  });
});

describe('renderBookingConfirmation', () => {
  const vars = {
    ...booking,
    tourImageUrl: 'https://cdn.example.com/hoi-an.jpg',
    tourImageAlt: 'Lanterns at dusk',
    manageUrl: 'https://web.example.com/account/bookings',
  };

  it('renders subject, html, and text with the booking facts', () => {
    const out = renderBookingConfirmation(vars);

    expect(out.subject).toBe(
      'Booking confirmed — BK-ABC123 · Hoi An Lantern Walk',
    );
    expect(out.text).toContain('Jane Traveller');
    expect(out.text).toContain('BK-ABC123');
    expect(out.text).toContain('249.00 USD');
    expect(out.text).toContain('2 adult(s) + 1 child(ren)');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('https://cdn.example.com/hoi-an.jpg');
    expect(out.html).toContain('Lanterns at dusk');
    expect(out.html).toContain('https://web.example.com/account/bookings');
  });

  it('omits the hero image (monogram fallback) when the tour has none', () => {
    const out = renderBookingConfirmation({
      ...vars,
      tourImageUrl: null,
      tourImageAlt: null,
    });
    expect(out.html).not.toContain('<img');
  });

  it('falls back to an em dash when departure dates are missing', () => {
    const out = renderBookingConfirmation({
      ...vars,
      startDate: null,
      endDate: null,
    });
    expect(out.text).toContain('Departure: — → —');
  });

  it('escapes user-controlled content in the html part', () => {
    const out = renderBookingConfirmation({
      ...vars,
      contactName: 'Jane <script>alert(1)</script>',
      tourTitle: 'Fish & Chips <Tour>',
    });
    expect(out.html).not.toContain('<script>');
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('Fish &amp; Chips &lt;Tour&gt;');
  });
});

describe('renderBookingRefunded', () => {
  const vars = {
    ...booking,
    refundedAmount: '100.00',
    isPartial: true,
  };

  it('shows the refunded amount — not the booking total — as the headline figure', () => {
    const out = renderBookingRefunded(vars);

    expect(out.subject).toBe('Refund on its way — BK-ABC123');
    expect(out.text).toContain('100.00 USD');
    expect(out.text).toContain('of 249.00 USD');
    expect(out.text).toContain('stays active');
  });

  it('renders a full refund without the partial framing', () => {
    const out = renderBookingRefunded({
      ...booking,
      refundedAmount: '249.00',
      isPartial: false,
    });
    expect(out.text).toContain('249.00 USD');
    expect(out.text).not.toContain('of 249.00 USD');
    expect(out.text).not.toContain('stays active');
  });

  it('carries the refund reason when present — escaped (API-W2)', () => {
    const out = renderBookingRefunded({
      ...vars,
      reason: 'Departure cancelled <by> the operator',
    });
    expect(out.text).toContain('Reason: Departure cancelled <by> the operator');
    expect(out.html).toContain('Departure cancelled &lt;by&gt; the operator');
  });

  it('omits the reason row when absent', () => {
    const out = renderBookingRefunded(vars);
    expect(out.text).not.toContain('Reason:');
    expect(out.html).not.toContain('>Reason<');
  });
});

describe('renderReviewApproved', () => {
  it('renders stars, the tour, and the review link', () => {
    const out = renderReviewApproved({
      reviewerName: 'Jane Traveller',
      tourTitle: 'Hoi An Lantern Walk',
      rating: 4,
      tourUrl: 'https://web.example.com/tours/hoi-an-lantern-walk',
    });

    expect(out.subject).toBe('Your review is live — Hoi An Lantern Walk');
    expect(out.text).toContain('4-star');
    expect(out.text).toContain('★★★★☆');
    expect(out.html).toContain('★★★★☆');
    expect(out.html).toContain(
      'https://web.example.com/tours/hoi-an-lantern-walk',
    );
  });
});

describe('renderEnquiryReceived', () => {
  const vars = {
    name: 'Jane Traveller',
    message: 'Is the tour available in July?',
    tourTitle: 'Hoi An Lantern Walk',
    browseUrl: 'https://web.example.com/tours',
  };

  it('acknowledges a tour-specific enquiry and echoes the message', () => {
    const out = renderEnquiryReceived(vars);

    expect(out.subject).toBe('We received your enquiry — Hoi An Lantern Walk');
    expect(out.text).toContain('Is the tour available in July?');
    expect(out.html).toContain('https://web.example.com/tours');
  });

  it('handles a general enquiry with no tour title', () => {
    const out = renderEnquiryReceived({ ...vars, tourTitle: null });
    expect(out.subject).toBe('We received your enquiry');
  });

  it('escapes a hostile message in the html quote card', () => {
    const out = renderEnquiryReceived({
      ...vars,
      message: '<img src=x onerror=alert(1)>',
    });
    expect(out.html).not.toContain('<img src=x');
    expect(out.html).toContain('&lt;img src=x');
  });
});

describe('renderCancellationRequested', () => {
  it('confirms receipt with the under-review status', () => {
    const out = renderCancellationRequested({
      code: 'BK-ABC123',
      tourTitle: 'Hoi An Lantern Walk',
      contactName: 'Jane Traveller',
    });

    expect(out.subject).toBe(
      "We're reviewing your cancellation request — BK-ABC123",
    );
    expect(out.text).toContain('48 hours');
    expect(out.html).toContain('Under review');
    expect(out.text).toContain('BK-ABC123');
  });
});

describe('renderCancellationDenied', () => {
  const vars = {
    code: 'BK-ABC123',
    contactName: 'Jane Traveller',
    decisionNote: 'Departure is within 48 hours.',
    manageUrl: 'https://web.example.com/account/bookings',
  };

  it('carries the admin decision note and the booking link', () => {
    const out = renderCancellationDenied(vars);

    expect(out.subject).toBe('About your cancellation request — BK-ABC123');
    expect(out.text).toContain('Departure is within 48 hours.');
    expect(out.text).toContain('remains active');
    expect(out.html).toContain('https://web.example.com/account/bookings');
  });

  it('falls back to neutral copy when the admin left no note', () => {
    const out = renderCancellationDenied({ ...vars, decisionNote: null });
    expect(out.text).not.toContain('null');
    expect(out.text).toContain('remains active');
  });

  it('escapes a hostile decision note', () => {
    const out = renderCancellationDenied({
      ...vars,
      decisionNote: '<script>x</script>',
    });
    expect(out.html).not.toContain('<script>x');
    expect(out.html).toContain('&lt;script&gt;x');
  });
});

describe('renderNewsletterWelcome', () => {
  it('welcomes the subscriber with the journal link + unsubscribe line', () => {
    const out = renderNewsletterWelcome({
      journalUrl: 'https://web.example.com/blog',
    });

    expect(out.subject).toBe('Welcome to the Nexora Journal');
    expect(out.html).toContain('https://web.example.com/blog');
    expect(out.html).toContain('Unsubscribe');
    expect(out.text).toContain('unsubscribe');
  });

  it('keeps the unsubscribe line OUT of transactional emails', () => {
    const transactional = renderBookingConfirmation({
      ...booking,
      tourImageUrl: null,
      tourImageAlt: null,
      manageUrl: 'https://web.example.com/account/bookings',
    });
    expect(transactional.html).not.toContain('Unsubscribe');
  });
});
