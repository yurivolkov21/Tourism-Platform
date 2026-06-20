import { render, screen } from '@testing-library/react';

import { Button } from './button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Book now</Button>);

    expect(screen.getByRole('button', { name: 'Book now' })).toBeTruthy();
  });

  it('applies the variant class', () => {
    render(<Button variant="outline">Outline</Button>);

    expect(screen.getByRole('button', { name: 'Outline' }).className).toContain(
      'border',
    );
  });
});
