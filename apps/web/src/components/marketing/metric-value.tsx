'use client';

import { NumberTicker } from '@tourism/ui';

import { parseMetric } from '../../lib/parse-metric';

/**
 * Renders a display metric string as a scroll-triggered count-up when it's a clean number
 * (e.g. "12,000+", "$2M", "4.9"), and as plain text otherwise (e.g. "24/7"). Keeps the i18n
 * catalogue string-typed; the numeric split happens here via `parseMetric`.
 */
export function MetricValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const m = parseMetric(value);

  if (!m.animate) return <span className={className}>{m.raw}</span>;

  return (
    <NumberTicker
      className={className}
      value={m.value}
      prefix={m.prefix}
      suffix={m.suffix}
      decimals={m.decimals}
    />
  );
}

export default MetricValue;
