import { fireEvent, render, screen } from '@testing-library/react';

// The @tourism/ui barrel pulls in gsap/maplibre, which can't load under jsdom —
// mock just the primitives the component uses (house pattern, see admin-table-shell.spec).
jest.mock('@tourism/ui', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  Badge: ({
    children,
    ...rest
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...rest}>{children}</span>,
}));

import { TabPills } from './tab-pills';

type Value = 'all' | 'open' | 'closed';

const tabs = [
  { value: 'all' as Value, label: 'All' },
  { value: 'open' as Value, label: 'Open' },
  { value: 'closed' as Value, label: 'Closed' },
];

describe('TabPills (button variant)', () => {
  it('renders role=tab with aria-selected on the active tab', () => {
    render(<TabPills tabs={tabs} value="open" />);
    const all = screen.getByRole('tab', { name: 'All' });
    const open = screen.getByRole('tab', { name: 'Open' });
    const closed = screen.getByRole('tab', { name: 'Closed' });
    expect(all).toHaveAttribute('aria-selected', 'false');
    expect(open).toHaveAttribute('aria-selected', 'true');
    expect(closed).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onValueChange with the clicked tab value', () => {
    const onValueChange = jest.fn();
    render(<TabPills tabs={tabs} value="all" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Closed' }));
    expect(onValueChange).toHaveBeenCalledWith('closed');
  });

  it('renders as <button type="button">, and role=tablist container', () => {
    render(<TabPills tabs={tabs} value="all" />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const button = screen.getByRole('tab', { name: 'All' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('renders a count badge only when count is defined, including 0', () => {
    render(
      <TabPills
        tabs={[
          { value: 'all' as Value, label: 'All', count: 5 },
          { value: 'open' as Value, label: 'Open', count: 0 },
          { value: 'closed' as Value, label: 'Closed' },
        ]}
        value="all"
      />,
    );
    const all = screen.getByRole('tab', { name: /All/ });
    const open = screen.getByRole('tab', { name: /Open/ });
    const closed = screen.getByRole('tab', { name: 'Closed' });
    expect(all).toHaveTextContent('5');
    expect(open).toHaveTextContent('0');
    // No badge rendered for `closed` — its accessible name is exactly its label.
    expect(closed.textContent).toBe('Closed');
  });

  it('passes ariaLabel through to the tablist container', () => {
    render(<TabPills tabs={tabs} value="all" ariaLabel="Filter by time" />);
    expect(
      screen.getByRole('tablist', { name: 'Filter by time' }),
    ).toBeInTheDocument();
  });

  it('omits aria-label on the tablist when ariaLabel is not passed', () => {
    render(<TabPills tabs={tabs} value="all" />);
    expect(screen.getByRole('tablist')).not.toHaveAttribute('aria-label');
  });
});

describe('TabPills (Link variant)', () => {
  it('renders anchors with the hrefFor-computed href and no cursor-pointer class', () => {
    render(
      <TabPills tabs={tabs} value="open" hrefFor={(v) => `/things?tab=${v}`} />,
    );
    const open = screen.getByRole('tab', { name: 'Open' });
    expect(open.tagName).toBe('A');
    expect(open).toHaveAttribute('href', '/things?tab=open');
    expect(open.className).not.toMatch(/cursor-pointer/);

    const closed = screen.getByRole('tab', { name: 'Closed' });
    expect(closed).toHaveAttribute('href', '/things?tab=closed');
  });

  it('still marks aria-selected on the active link tab', () => {
    render(
      <TabPills
        tabs={tabs}
        value="closed"
        hrefFor={(v) => `/things?tab=${v}`}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Open' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Closed' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
