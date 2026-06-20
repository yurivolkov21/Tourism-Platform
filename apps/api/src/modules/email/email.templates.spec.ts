import {
  renderBookingConfirmation,
  renderBookingRefunded,
  renderEnquiryReceived,
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

describe('renderBookingConfirmation', () => {
  it('renders subject, html, and text with the booking code + total', () => {
    const out = renderBookingConfirmation(booking);

    expect(out.subject).toBe('Booking confirmed — BK-ABC123');
    expect(out.text).toContain('Jane Traveller');
    expect(out.text).toContain('Hoi An Lantern Walk');
    expect(out.text).toContain('249.00 USD');
    expect(out.text).toContain('2 adult(s) + 1 child(ren)');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('<p>');
  });

  it('falls back to an em dash when departure dates are missing', () => {
    const out = renderBookingConfirmation({
      ...booking,
      startDate: null,
      endDate: null,
    });
    expect(out.text).toContain('Departure: — → —');
  });
});

describe('renderBookingRefunded', () => {
  it('renders a refund subject + the refunded amount', () => {
    const out = renderBookingRefunded(booking);

    expect(out.subject).toBe('Refund processed — BK-ABC123');
    expect(out.text).toContain('has been refunded');
    expect(out.text).toContain('249.00 USD');
    expect(out.html).toContain('color:#111');
  });
});

describe('renderReviewApproved', () => {
  it('renders the reviewer name, tour title, and a star rating', () => {
    const out = renderReviewApproved({
      reviewerName: 'Jane Traveller',
      tourTitle: 'Hoi An Lantern Walk',
      rating: 4,
    });

    expect(out.subject).toBe('Your review is now live — Hoi An Lantern Walk');
    expect(out.text).toContain('Jane Traveller');
    expect(out.text).toContain('4-star review');
    expect(out.text).toContain('★★★★☆');
    expect(out.html).toContain('<p>');
  });
});

describe('renderEnquiryReceived', () => {
  it('acknowledges a tour-specific enquiry and echoes the message', () => {
    const out = renderEnquiryReceived({
      name: 'Jane Traveller',
      message: 'Is the tour available in July?',
      tourTitle: 'Hoi An Lantern Walk',
    });

    expect(out.subject).toContain('Hoi An Lantern Walk');
    expect(out.text).toContain('Jane Traveller');
    expect(out.text).toContain('Is the tour available in July?');
  });

  it('handles a general enquiry with no tour title', () => {
    const out = renderEnquiryReceived({
      name: 'Jane Traveller',
      message: 'Do you offer custom itineraries?',
    });

    expect(out.subject).toBe('We received your enquiry');
    expect(out.text).toContain('Thanks for reaching out.');
  });
});
