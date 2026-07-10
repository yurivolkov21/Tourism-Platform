import { messages } from '@tourism/i18n';

const PAYMENTS = [
  { name: 'Visa', file: 'visa' },
  { name: 'Mastercard', file: 'mastercard' },
  { name: 'American Express', file: 'amex' },
  { name: 'PayPal', file: 'paypal' },
  { name: 'Stripe', file: 'stripe' },
] as const;

/** Monochrome, self-hosted payment marks in a static centered row (5 logos don't
 * need a marquee), + the security caption. */
export function PaymentRow() {
  return (
    <div>
      <span className="sr-only">{messages.trustBand.payments}</span>
      <div
        aria-hidden
        className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:gap-x-12"
      >
        {PAYMENTS.map((p) => (
          <span
            key={p.name}
            className="bg-muted-foreground/80 hover:bg-foreground inline-block h-6 w-14 transition-colors"
            style={{
              maskImage: `url(/logos/pay/${p.file}.svg)`,
              WebkitMaskImage: `url(/logos/pay/${p.file}.svg)`,
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
            }}
          />
        ))}
      </div>
      <p className="text-muted-foreground mt-4 text-center text-xs">
        {messages.trustBand.security}
      </p>
    </div>
  );
}

export default PaymentRow;
