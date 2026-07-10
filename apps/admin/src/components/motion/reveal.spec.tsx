import { render, screen } from '@testing-library/react';

import { Reveal } from './reveal';
import { Stagger } from './stagger';

describe('Reveal', () => {
  it('renders its children and forwards className', () => {
    const { container } = render(
      <Reveal className="kpi-card">
        <p>Total revenue</p>
      </Reveal>,
    );
    expect(screen.getByText('Total revenue')).toBeInTheDocument();
    expect(container.querySelector('.kpi-card')).not.toBeNull();
  });

  it('accepts a delay without breaking the render', () => {
    render(
      <Reveal delay={0.12}>
        <span>Delayed</span>
      </Reveal>,
    );
    expect(screen.getByText('Delayed')).toBeInTheDocument();
  });
});

describe('Stagger', () => {
  it('renders every child and forwards className to the wrapper', () => {
    const { container } = render(
      <Stagger className="grid-cards">
        <span>one</span>
        <span>two</span>
        <span>three</span>
      </Stagger>,
    );
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    expect(container.querySelector('.grid-cards')).not.toBeNull();
  });
});
