import { Card, CardContent, Separator } from '@tourism/ui';
import { messages } from '@tourism/i18n';

import type { PriceLine } from '../../lib/booking/price';

export function formatPrice(currency: string, amount: number): string {
  const value = amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return currency === 'USD' ? `$${value}` : `${currency} ${value}`;
}

/**
 * Live order summary for the booking page (rendered inside the client form so the total updates as
 * the party size / departure changes). The API re-computes the authoritative charge — the note makes
 * that explicit so the estimate never reads as a binding price.
 */
export function OrderSummary({
  tourTitle,
  departureLabel,
  lines,
  total,
  currency,
}: {
  tourTitle: string;
  departureLabel: string | null;
  lines: PriceLine[];
  total: number;
  currency: string;
}) {
  const t = messages.booking.page;

  return (
    <Card className="lg:sticky lg:top-24">
      <CardContent className="space-y-4 p-6">
        <h2 className="font-heading text-lg font-semibold">
          {t.summaryHeading}
        </h2>

        <div className="space-y-1">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {t.departureLabel}
          </p>
          <p className="font-medium">{tourTitle}</p>
          {departureLabel ? <p className="text-sm">{departureLabel}</p> : null}
        </div>

        <Separator />

        <ul className="space-y-2 text-sm">
          {lines.map((line) => (
            <li
              key={line.kind}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-muted-foreground">
                {line.quantity} ×{' '}
                {line.kind === 'adult' ? t.perAdult : t.perChild}{' '}
                <span className="text-foreground/70">
                  ({formatPrice(currency, line.unitPrice)})
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {formatPrice(currency, line.subtotal)}
              </span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{t.totalLabel}</span>
          <span className="font-heading text-primary text-2xl font-bold tabular-nums">
            {formatPrice(currency, total)}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">{t.totalNote}</p>
      </CardContent>
    </Card>
  );
}

export default OrderSummary;
