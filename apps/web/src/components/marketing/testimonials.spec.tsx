import { render, screen } from '@testing-library/react';

import { Testimonials } from './testimonials';

// The @tourism/ui barrel re-exports browser-only modules that crash under jsdom.
jest.mock('@tourism/ui', () => ({
  Avatar: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarFallback: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Badge: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Carousel: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselNext: () => <button type="button">next</button>,
  CarouselPrevious: () => <button type="button">prev</button>,
}));

describe('Testimonials', () => {
  it('renders the supplied real reviews', () => {
    render(
      <Testimonials
        items={[
          {
            name: 'Real Guest',
            trip: 'Hoi An Walking Tour',
            location: null,
            content: 'A genuine review body.',
          },
        ]}
      />,
    );
    expect(screen.getByText('A genuine review body.')).toBeInTheDocument();
    expect(screen.getByText('Real Guest')).toBeInTheDocument();
  });

  it('renders nothing when there are no featured reviews (no fixture fallback)', () => {
    const { container: empty } = render(<Testimonials items={[]} />);
    expect(empty).toBeEmptyDOMElement();
    const { container: missing } = render(<Testimonials />);
    expect(missing).toBeEmptyDOMElement();
    // Regression: the old fake fixture must never resurface.
    expect(screen.queryByText('Emily Carter')).not.toBeInTheDocument();
  });
});
