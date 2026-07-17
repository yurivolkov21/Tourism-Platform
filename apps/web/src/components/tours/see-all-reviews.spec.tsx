import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SeeAllReviews } from './see-all-reviews';

const mockGet = jest.fn();

jest.mock('@tourism/ui', () => ({
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

jest.mock('../../lib/api/client', () => ({
  getApiClient: () => ({ GET: mockGet }),
}));

function dto(id: string) {
  return {
    id,
    rating: 5,
    title: null,
    body: `quote-${id}`,
    createdAt: '2026-05-01T00:00:00Z',
    reviewer: { fullName: `Author ${id}` },
  };
}

function page(ids: string[], totalPages: number) {
  return { data: { data: ids.map(dto), meta: { totalPages } } };
}

const initial = [
  {
    id: 'a',
    author: 'Author a',
    date: 'May 2026',
    rating: 5,
    quote: 'quote-a',
  },
];

describe('SeeAllReviews', () => {
  beforeEach(() => mockGet.mockReset());

  it('renders the trigger with the total count', () => {
    render(<SeeAllReviews slug="hoi-an" reviewCount={12} initial={initial} />);
    expect(
      screen.getByRole('button', { name: 'See all 12 reviews' }),
    ).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('opens the dialog seeded with the inline reviews and fetches page 1 (deduped)', async () => {
    mockGet.mockResolvedValue(page(['a', 'b'], 1));
    render(<SeeAllReviews slug="hoi-an" reviewCount={12} initial={initial} />);

    fireEvent.click(screen.getByRole('button', { name: 'See all 12 reviews' }));

    await waitFor(() =>
      expect(screen.getByText('“quote-b”')).toBeInTheDocument(),
    );
    // 'a' came from the seed AND page 1 — rendered once.
    expect(screen.getAllByText('“quote-a”')).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/tours/{slug}/reviews',
      expect.objectContaining({
        params: expect.objectContaining({
          path: { slug: 'hoi-an' },
          query: { page: 1, pageSize: 9 },
        }),
      }),
    );
  });

  it('loads further pages and hides "Load more" on the last one', async () => {
    mockGet
      .mockResolvedValueOnce(page(['a', 'b'], 2))
      .mockResolvedValueOnce(page(['c'], 2));
    render(<SeeAllReviews slug="hoi-an" reviewCount={12} initial={initial} />);

    fireEvent.click(screen.getByRole('button', { name: 'See all 12 reviews' }));
    const loadMore = await screen.findByRole('button', {
      name: 'Load more reviews',
    });

    fireEvent.click(loadMore);
    await waitFor(() =>
      expect(screen.getByText('“quote-c”')).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: 'Load more reviews' }),
    ).not.toBeInTheDocument();
  });

  it('does NOT auto-retry after a failed first page (regression: retry is manual)', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    render(<SeeAllReviews slug="hoi-an" reviewCount={12} initial={initial} />);

    fireEvent.click(screen.getByRole('button', { name: 'See all 12 reviews' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    // Give any (buggy) effect-driven retry loop a chance to fire, then assert
    // the API was hit exactly once — "Load more" is the only retry path.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded items and offers a retry when a page fetch fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    render(<SeeAllReviews slug="hoi-an" reviewCount={12} initial={initial} />);

    fireEvent.click(screen.getByRole('button', { name: 'See all 12 reviews' }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('“quote-a”')).toBeInTheDocument(); // seed kept
    // The retry path re-requests page 1.
    mockGet.mockResolvedValueOnce(page(['a', 'b'], 1));
    fireEvent.click(screen.getByRole('button', { name: 'Load more reviews' }));
    await waitFor(() =>
      expect(screen.getByText('“quote-b”')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
