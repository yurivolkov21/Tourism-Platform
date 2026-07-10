import { render, screen } from '@testing-library/react';
import { TrustBand } from './trust-band';

// StatCluster → MetricValue imports `NumberTicker` from `@tourism/ui`, but that package's
// barrel (`libs/web/ui/src/index.ts`) also re-exports browser-only components (maplibre-gl's
// <Map>, gsap's <AnimatedContent>) that crash on import under jsdom — jsdom has no
// WebGL/canvas. Stub the barrel with a static NumberTicker (its real no-JS fallback is the
// same final value) so this render test exercises TrustBand/StatCluster/PaymentRow for real.
jest.mock('@tourism/ui', () => ({
  NumberTicker: ({
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    className,
  }: {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
  }) => (
    <span className={className}>{`${prefix}${value.toFixed(
      decimals,
    )}${suffix}`}</span>
  ),
}));

describe('TrustBand', () => {
  it('renders the eyebrow, heading, each stat value + label, and the security caption', () => {
    render(
      <TrustBand
        stats={[
          { value: '23', label: 'Curated tours' },
          { value: '4.4★', label: 'Average rating' },
        ]}
      />,
    );
    expect(screen.getByText('Why travelers choose Nexora')).toBeInTheDocument();
    expect(
      screen.getByText(/Boutique journeys, trusted by travelers/),
    ).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Curated tours')).toBeInTheDocument();
    expect(screen.getByText('4.4★')).toBeInTheDocument();
    expect(
      screen.getByText(/Every booking secured by Stripe & PayPal/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /We accept Visa, Mastercard, American Express, PayPal and Stripe/,
      ),
    ).toBeInTheDocument();
  });

  it('renders nothing when there are no stats (cold API)', () => {
    const { container } = render(<TrustBand stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
