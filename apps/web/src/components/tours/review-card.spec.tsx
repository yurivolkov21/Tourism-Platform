import { fireEvent, render, screen } from '@testing-library/react';

import { ReviewCard } from './review-card';

// The @tourism/ui barrel re-exports browser-only modules that crash under jsdom.
jest.mock('@tourism/ui', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children?: React.ReactNode;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children?: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

const review = {
  id: 'r-1',
  author: 'Alice',
  date: 'May 2026',
  rating: 4,
  quote: 'A wonderful trip through the old town.',
};

/** jsdom has no layout — drive the truncation measurement via prototype getters. */
function setMetrics(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
}

describe('ReviewCard', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {
        /* noop — jsdom has no layout to observe */
      }
      unobserve() {
        /* noop */
      }
      disconnect() {
        /* noop */
      }
    } as never;
  });

  afterEach(() => {
    // Restore the (0-returning) jsdom defaults so cases don't leak into each other.
    setMetrics(0, 0);
  });

  it('clamps the quote to five lines', () => {
    render(<ReviewCard review={review} />);
    expect(screen.getByText(`“${review.quote}”`)).toHaveClass('line-clamp-5');
  });

  it('hides "Read more" when the quote fits the clamp', () => {
    setMetrics(100, 100);
    render(<ReviewCard review={review} />);
    expect(
      screen.queryByRole('button', { name: 'Read more' }),
    ).not.toBeInTheDocument();
  });

  it('shows "Read more" only when the quote overflows, and opens the full review', () => {
    setMetrics(200, 100);
    render(<ReviewCard review={review} />);

    const button = screen.getByRole('button', { name: 'Read more' });
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();

    fireEvent.click(button);
    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveTextContent('Traveller review');
    expect(dialog).toHaveTextContent(review.quote);
    expect(dialog).toHaveTextContent('Alice');
    expect(dialog).toHaveTextContent('Verified traveller');
  });

  it('keeps the star rating accessible', () => {
    render(<ReviewCard review={review} />);
    expect(
      screen.getAllByRole('img', { name: '4 out of 5' }).length,
    ).toBeGreaterThan(0);
  });
});
