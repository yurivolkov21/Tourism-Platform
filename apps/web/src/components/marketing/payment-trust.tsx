import {
  CreditCardIcon,
  LockIcon,
  ShieldCheckIcon,
  WalletIcon,
} from 'lucide-react';

import { Card, CardContent } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { SectionHeading } from '../section-heading';

// Icons align by index to messages.paymentTrust.items. These reflect real, truthful claims:
// the platform processes payments through Stripe + PayPal over encrypted checkout.
const trustIcons = [
  ShieldCheckIcon,
  LockIcon,
  CreditCardIcon,
  WalletIcon,
] as const;

// Repurposed from a "logo cloud" — instead of fabricating partner/press logos, this surfaces
// genuine payment & security assurances (Stripe/PayPal integrations).
export function PaymentTrust() {
  const t = messages.paymentTrust;

  return (
    <section className="bg-muted py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title={t.heading}
          subtitle={t.subtitle}
          className="mb-10 space-y-4 sm:mb-14"
        />

        <Card className="shadow-card">
          <CardContent className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 px-8 py-4 sm:px-14">
            {t.items.map((item, i) => {
              const Icon = trustIcons[i];
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 font-medium"
                >
                  <Icon className="text-primary size-5" />
                  {item.label}
                </span>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default PaymentTrust;
