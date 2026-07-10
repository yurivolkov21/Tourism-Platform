import { messages } from '@tourism/i18n';
import { Marquee } from './marquee';

const PAYMENTS = [
  { name: 'Visa', file: 'visa' },
  { name: 'Mastercard', file: 'mastercard' },
  { name: 'American Express', file: 'amex' },
  { name: 'PayPal', file: 'paypal' },
  { name: 'Stripe', file: 'stripe' },
] as const;

/** Monochrome, self-hosted payment marks scrolled by the shared Marquee, + a security caption. */
export function PaymentMarquee() {
  return (
    <div>
      <span className="sr-only">{messages.trustBand.payments}</span>
      <div aria-hidden className="relative overflow-hidden">
        <Marquee pauseOnHover className="[--duration:36s] p-0">
          {PAYMENTS.map((p) => (
            <span
              key={p.name}
              className="bg-muted-foreground hover:bg-foreground mx-8 inline-block h-6 w-16 shrink-0 transition-colors lg:mx-10"
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
        </Marquee>
        <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-linear-to-r to-transparent" />
        <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-linear-to-l to-transparent" />
      </div>
      <p className="text-muted-foreground mt-8 text-center text-xs">
        {messages.trustBand.security}
      </p>
    </div>
  );
}

export default PaymentMarquee;
