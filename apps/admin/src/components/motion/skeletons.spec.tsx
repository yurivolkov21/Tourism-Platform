import { render } from '@testing-library/react';

// The `@tourism/ui` barrel re-exports browser-only components (maplibre-gl, gsap) that
// crash on import under jsdom — stub it with the real Skeleton contract (data-slot).
jest.mock('@tourism/ui', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-slot="skeleton" className={className} />
  ),
}));

import { DashboardSkeleton } from './dashboard-skeleton';
import { TableSkeleton } from './table-skeleton';

describe('TableSkeleton', () => {
  it('renders the default 8 body rows of 5 cells', () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll('[data-testid="skeleton-row"]');
    expect(rows).toHaveLength(8);
    expect(rows[0].querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5);
  });

  it('honours rows/cols overrides', () => {
    const { container } = render(<TableSkeleton rows={3} cols={2} />);
    const rows = container.querySelectorAll('[data-testid="skeleton-row"]');
    expect(rows).toHaveLength(3);
    expect(rows[0].querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
  });
});

describe('DashboardSkeleton', () => {
  it('renders 4 KPI card placeholders, a chart block, and 3 widget placeholders', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(
      container.querySelectorAll('[data-testid="skeleton-kpi"]'),
    ).toHaveLength(4);
    expect(
      container.querySelectorAll('[data-testid="skeleton-chart"]'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('[data-testid="skeleton-widget"]'),
    ).toHaveLength(3);
  });
});
